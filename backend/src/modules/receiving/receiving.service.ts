import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { AuditService } from '../audit/audit.service';
import { LocationsService } from '../locations/locations.service';
import { CreateReceivingDto } from './dto/create-receiving.dto';
import { UpdateReceivingDto } from './dto/update-receiving.dto';
import { ReceivingQueryDto } from './dto/receiving-query.dto';

@Injectable()
export class ReceivingService {
  constructor(
    private prisma: PrismaService,
    private inventory: InventoryService,
    private audit: AuditService,
    private locations: LocationsService,
  ) {}

  async getQueue() {
    return this.prisma.shipment.findMany({
      where: {
        status: { in: ['dispatched', 'in_transit', 'arrived'] },
        receivingRecords: { none: { status: 'completed' } },
      },
      include: {
        _count: { select: { items: true } },
        originLocation: { select: { id: true, name: true } },
        destinationLocation: { select: { id: true, name: true } },
      },
      orderBy: { expectedArrivalDate: 'asc' },
    });
  }

  async findAll(query: ReceivingQueryDto) {
    const { page = 1, limit = 20, shipmentId, dateFrom, dateTo } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (shipmentId) where.shipmentId = shipmentId;
    if (dateFrom || dateTo) {
      where.receivedDate = {};
      if (dateFrom) where.receivedDate.gte = new Date(dateFrom);
      if (dateTo) where.receivedDate.lte = new Date(dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.receivingRecord.findMany({
        where,
        include: {
          shipment: {
            select: { id: true, shipmentReference: true, status: true },
          },
          _count: { select: { items: true } },
        },
        orderBy: { receivedDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.receivingRecord.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    const record = await this.prisma.receivingRecord.findUnique({
      where: { id },
      include: {
        shipment: {
          select: {
            id: true,
            shipmentReference: true,
            carrierName: true,
            expectedArrivalDate: true,
            actualArrivalDate: true,
            status: true,
          },
        },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
            shipmentItem: { select: { id: true, quantity: true } },
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException(`Receiving record with id "${id}" not found`);
    }

    return record;
  }

  async create(dto: CreateReceivingDto, userId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: dto.shipmentId },
      include: { items: true },
    });
    if (!shipment) {
      throw new NotFoundException(
        `Shipment with id "${dto.shipmentId}" not found`,
      );
    }

    let receivedLocationId = dto.receivedLocationId;
    if (!receivedLocationId) {
      const ghana = await this.locations.getGhanaWarehouse();
      receivedLocationId = ghana.id;
    }

    const record = await this.prisma.receivingRecord.create({
      data: {
        shipmentId: dto.shipmentId,
        receivedLocationId,
        receivedDate: new Date(dto.receivedDate),
        notes: dto.notes,
        receivedBy: userId,
        status: 'partial',
        items: {
          create: dto.items.map((item) => {
            const shipmentItem = shipment.items.find(
              (si) => si.id === item.shipmentItemId,
            );
            return {
              shipmentItemId: item.shipmentItemId,
              productId: item.productId,
              expectedQuantity: shipmentItem?.quantity ?? 0,
              receivedQuantity: item.receivedQuantity,
              damagedQuantity: item.damagedQuantity ?? 0,
              lostQuantity: item.lostQuantity ?? 0,
              notes: item.notes,
            };
          }),
        },
      },
      include: { items: true },
    });

    await this.audit.log({
      userId,
      actionType: 'receiving_create',
      entityType: 'receiving_record',
      entityId: record.id,
      afterJson: { shipmentId: dto.shipmentId, itemCount: dto.items.length },
    });

    return record;
  }

  async update(id: string, dto: UpdateReceivingDto, _userId: string) {
    const record = await this.prisma.receivingRecord.findUnique({
      where: { id },
    });
    if (!record) {
      throw new NotFoundException(`Receiving record with id "${id}" not found`);
    }
    if (record.status === 'completed') {
      throw new ConflictException('Cannot update a completed receiving record');
    }

    if (dto.receivedDate !== undefined || dto.notes !== undefined) {
      await this.prisma.receivingRecord.update({
        where: { id },
        data: {
          ...(dto.receivedDate !== undefined && {
            receivedDate: new Date(dto.receivedDate),
          }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
        },
      });
    }

    if (dto.items?.length) {
      await Promise.all(
        dto.items.map((item) =>
          this.prisma.receivingItem.update({
            where: { id: item.id },
            data: {
              receivedQuantity: item.receivedQuantity,
              ...(item.damagedQuantity !== undefined && {
                damagedQuantity: item.damagedQuantity,
              }),
              ...(item.lostQuantity !== undefined && {
                lostQuantity: item.lostQuantity,
              }),
            },
          }),
        ),
      );
    }

    return this.findById(id);
  }

  async submit(id: string, userId: string) {
    const record = await this.prisma.receivingRecord.findUnique({
      where: { id },
      include: { items: true, shipment: true },
    });
    if (!record) {
      throw new NotFoundException(`Receiving record with id "${id}" not found`);
    }
    if (record.status === 'completed') {
      throw new ConflictException('Receiving record is already completed');
    }

    const virtualLocation = await this.prisma.location.findFirst({
      where: {
        name: record.shipment.shipmentReference,
        locationType: 'shipment',
      },
    });
    if (!virtualLocation) {
      throw new NotFoundException(
        `Virtual shipment location for "${record.shipment.shipmentReference}" not found`,
      );
    }

    const ghanaWarehouse = await this.locations.getGhanaWarehouse();

    const submitted = await this.prisma.$transaction(async (tx) => {
      for (const item of record.items) {
        if (Number(item.receivedQuantity) > 0) {
          await this.inventory.recordMovement(
            {
              productId: item.productId,
              movementType: 'receive',
              quantity: Number(item.receivedQuantity),
              fromLocationId: virtualLocation.id,
              toLocationId: ghanaWarehouse.id,
              referenceType: 'receiving_record',
              referenceId: id,
              createdBy: userId,
            },
            tx,
          );
        }
        if (Number(item.damagedQuantity) > 0) {
          await this.inventory.recordMovement(
            {
              productId: item.productId,
              movementType: 'damage_out',
              quantity: Number(item.damagedQuantity),
              fromLocationId: virtualLocation.id,
              referenceType: 'receiving_record',
              referenceId: id,
              createdBy: userId,
              allowNegative: true,
            },
            tx,
          );
        }
        if (Number(item.lostQuantity) > 0) {
          await this.inventory.recordMovement(
            {
              productId: item.productId,
              movementType: 'loss_out',
              quantity: Number(item.lostQuantity),
              fromLocationId: virtualLocation.id,
              referenceType: 'receiving_record',
              referenceId: id,
              createdBy: userId,
              allowNegative: true,
            },
            tx,
          );
        }
      }

      const updated = await tx.receivingRecord.update({
        where: { id },
        data: { status: 'completed' },
        include: { items: true },
      });

      await tx.shipment.update({
        where: { id: record.shipmentId },
        data: {
          status: 'received',
          actualArrivalDate: record.receivedDate,
        },
      });

      return updated;
    });

    await this.audit.log({
      userId,
      actionType: 'receiving_submit',
      entityType: 'receiving_record',
      entityId: id,
      afterJson: {
        shipmentId: record.shipmentId,
        itemCount: record.items.length,
      },
    });

    return submitted;
  }
}
