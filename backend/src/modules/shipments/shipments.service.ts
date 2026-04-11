import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { AuditService } from '../audit/audit.service';
import { LocationsService } from '../locations/locations.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { AddShipmentItemDto } from './dto/add-shipment-item.dto';
import { CreateShipmentCostDto } from './dto/create-shipment-cost.dto';
import { ShipmentQueryDto } from './dto/shipment-query.dto';

const MUTABLE_STATUSES = ['draft', 'packed'];

@Injectable()
export class ShipmentsService {
  constructor(
    private prisma: PrismaService,
    private inventory: InventoryService,
    private audit: AuditService,
    private locations: LocationsService,
  ) {}

  async findAll(query: ShipmentQueryDto) {
    const {
      page = 1,
      limit = 20,
      status,
      carrierName,
      dateFrom,
      dateTo,
      search,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (carrierName)
      where.carrierName = { contains: carrierName, mode: 'insensitive' };
    if (dateFrom || dateTo) {
      where.dispatchDate = {};
      if (dateFrom) where.dispatchDate.gte = new Date(dateFrom);
      if (dateTo) where.dispatchDate.lte = new Date(dateTo);
    }
    if (search) {
      where.OR = [
        { shipmentReference: { contains: search, mode: 'insensitive' } },
        { shipmentName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        include: {
          originLocation: { select: { id: true, name: true } },
          destinationLocation: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.shipment.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: { select: { id: true, name: true, sku: true } } },
        },
        costs: true,
        statusHistory: { orderBy: { statusTimestamp: 'desc' } },
        originLocation: true,
        destinationLocation: true,
      },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment with id "${id}" not found`);
    }

    return shipment;
  }

  async create(dto: CreateShipmentDto, userId: string) {
    // Create virtual transit location for this shipment
    const virtualLocation = await this.prisma.location.create({
      data: {
        name: dto.shipmentReference,
        locationType: 'shipment',
        country: 'UK',
        isActive: true,
      },
    });

    const shipment = await this.prisma.shipment.create({
      data: {
        shipmentReference: dto.shipmentReference,
        shipmentName: dto.shipmentName,
        originLocationId: dto.originLocationId,
        destinationLocationId: dto.destinationLocationId,
        carrierName: dto.carrierName,
        trackingNumber: dto.trackingNumber,
        packedDate: dto.packedDate ? new Date(dto.packedDate) : undefined,
        dispatchDate: dto.dispatchDate ? new Date(dto.dispatchDate) : undefined,
        expectedArrivalDate: dto.expectedArrivalDate
          ? new Date(dto.expectedArrivalDate)
          : undefined,
        notes: dto.notes,
        status: 'draft',
        createdBy: userId,
      },
    });

    // Insert initial status history
    await this.prisma.shipmentStatusHistory.create({
      data: {
        shipmentId: shipment.id,
        status: 'draft',
        updatedBy: userId,
      },
    });

    await this.audit.log({
      userId,
      actionType: 'shipment_create',
      entityType: 'shipment',
      entityId: shipment.id,
      afterJson: {
        shipmentReference: shipment.shipmentReference,
        virtualLocationId: virtualLocation.id,
      },
    });

    return shipment;
  }

  async update(id: string, dto: UpdateShipmentDto, userId: string) {
    const existing = await this.prisma.shipment.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Shipment with id "${id}" not found`);
    }
    if (!MUTABLE_STATUSES.includes(existing.status)) {
      throw new ConflictException(
        'Shipment can only be updated in draft or packed status',
      );
    }

    const shipment = await this.prisma.shipment.update({
      where: { id },
      data: {
        ...(dto.shipmentName !== undefined && {
          shipmentName: dto.shipmentName,
        }),
        ...(dto.carrierName !== undefined && { carrierName: dto.carrierName }),
        ...(dto.trackingNumber !== undefined && {
          trackingNumber: dto.trackingNumber,
        }),
        ...(dto.packedDate !== undefined && {
          packedDate: dto.packedDate ? new Date(dto.packedDate) : null,
        }),
        ...(dto.dispatchDate !== undefined && {
          dispatchDate: dto.dispatchDate ? new Date(dto.dispatchDate) : null,
        }),
        ...(dto.expectedArrivalDate !== undefined && {
          expectedArrivalDate: dto.expectedArrivalDate
            ? new Date(dto.expectedArrivalDate)
            : null,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });

    await this.audit.log({
      userId,
      actionType: 'shipment_update',
      entityType: 'shipment',
      entityId: id,
      beforeJson: { ...existing } as Record<string, unknown>,
      afterJson: { ...shipment } as Record<string, unknown>,
    });

    return shipment;
  }

  async addItem(shipmentId: string, dto: AddShipmentItemDto, userId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
    });
    if (!shipment) {
      throw new NotFoundException(`Shipment with id "${shipmentId}" not found`);
    }
    if (!MUTABLE_STATUSES.includes(shipment.status)) {
      throw new ConflictException(
        'Cannot add items to a shipment that has already been dispatched',
      );
    }

    const ukWarehouse = await this.locations.getUkWarehouse();

    const item = await this.prisma.$transaction(async (tx) => {
      await this.inventory.recordMovement(
        {
          productId: dto.productId,
          movementType: 'allocate_shipment',
          quantity: dto.quantity,
          fromLocationId: ukWarehouse.id,
          referenceType: 'shipment',
          referenceId: shipmentId,
          notes: dto.notes,
          createdBy: userId,
          batchId: dto.batchId,
        },
        tx,
      );

      return tx.shipmentItem.create({
        data: {
          shipmentId,
          productId: dto.productId,
          quantity: dto.quantity,
          batchId: dto.batchId,
          sourcePurchaseItemId: dto.sourcePurchaseItemId,
          notes: dto.notes,
        },
      });
    });

    return item;
  }

  async removeItem(shipmentId: string, itemId: string, userId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
    });
    if (!shipment) {
      throw new NotFoundException(`Shipment with id "${shipmentId}" not found`);
    }
    if (!MUTABLE_STATUSES.includes(shipment.status)) {
      throw new ConflictException(
        'Cannot remove items from a shipment that has already been dispatched',
      );
    }

    const item = await this.prisma.shipmentItem.findUnique({
      where: { id: itemId },
    });
    if (!item) {
      throw new NotFoundException(
        `Shipment item with id "${itemId}" not found`,
      );
    }

    const ukWarehouse = await this.locations.getUkWarehouse();

    await this.prisma.$transaction(async (tx) => {
      // Reverse the allocation: restores quantityAvailable on the UK warehouse
      await this.inventory.recordMovement(
        {
          productId: item.productId,
          movementType: 'adjust_in',
          quantity: Number(item.quantity),
          toLocationId: ukWarehouse.id,
          referenceType: 'shipment_item_removal',
          referenceId: itemId,
          notes: `Removed from shipment ${shipmentId}`,
          createdBy: userId,
          batchId: item.batchId ?? undefined,
          allowNegative: true,
        },
        tx,
      );

      await tx.shipmentItem.delete({ where: { id: itemId } });
    });
  }

  async dispatch(id: string, userId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment with id "${id}" not found`);
    }
    if (!MUTABLE_STATUSES.includes(shipment.status)) {
      throw new ConflictException(
        'Can only dispatch a shipment in draft or packed status',
      );
    }

    const ukWarehouse = await this.locations.getUkWarehouse();
    const virtualLocation = await this.prisma.location.findFirst({
      where: { name: shipment.shipmentReference, locationType: 'shipment' },
    });

    if (!virtualLocation) {
      throw new NotFoundException(
        `Virtual location for shipment "${shipment.shipmentReference}" not found`,
      );
    }

    const dispatched = await this.prisma.$transaction(async (tx) => {
      for (const item of shipment.items) {
        await this.inventory.recordMovement(
          {
            productId: item.productId,
            movementType: 'dispatch',
            quantity: Number(item.quantity),
            fromLocationId: ukWarehouse.id,
            toLocationId: virtualLocation.id,
            referenceType: 'shipment',
            referenceId: id,
            notes: item.notes ?? undefined,
            createdBy: userId,
            batchId: item.batchId ?? undefined,
          },
          tx,
        );
      }

      await tx.shipmentStatusHistory.create({
        data: {
          shipmentId: id,
          status: 'dispatched',
          updatedBy: userId,
        },
      });

      return tx.shipment.update({
        where: { id },
        data: {
          status: 'dispatched',
          dispatchDate: shipment.dispatchDate ?? new Date(),
        },
        include: { items: true },
      });
    });

    await this.audit.log({
      userId,
      actionType: 'shipment_dispatch',
      entityType: 'shipment',
      entityId: id,
      afterJson: { status: 'dispatched', itemCount: shipment.items.length },
    });

    return dispatched;
  }

  async addCost(
    shipmentId: string,
    dto: CreateShipmentCostDto,
    userId: string,
  ) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
    });
    if (!shipment) {
      throw new NotFoundException(`Shipment with id "${shipmentId}" not found`);
    }

    const cost = await this.prisma.shipmentCost.create({
      data: {
        shipmentId,
        costType: dto.costType,
        amountGbp: dto.amountGbp,
        description: dto.description,
        vendorName: dto.vendorName,
        costDate: new Date(dto.costDate),
        createdBy: userId,
      },
    });

    await this.audit.log({
      userId,
      actionType: 'shipment_cost_add',
      entityType: 'shipment',
      entityId: shipmentId,
      afterJson: { costType: dto.costType, amountGbp: dto.amountGbp },
    });

    return cost;
  }

  async getCosts(shipmentId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
    });
    if (!shipment) {
      throw new NotFoundException(`Shipment with id "${shipmentId}" not found`);
    }

    const costs = await this.prisma.shipmentCost.findMany({
      where: { shipmentId },
      orderBy: { costDate: 'desc' },
    });

    const aggregate = await this.prisma.shipmentCost.aggregate({
      where: { shipmentId },
      _sum: { amountGbp: true },
    });

    return { costs, totalGbp: aggregate._sum.amountGbp ?? 0 };
  }

  async getStatusHistory(shipmentId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
    });
    if (!shipment) {
      throw new NotFoundException(`Shipment with id "${shipmentId}" not found`);
    }

    return this.prisma.shipmentStatusHistory.findMany({
      where: { shipmentId },
      orderBy: { statusTimestamp: 'desc' },
    });
  }
}
