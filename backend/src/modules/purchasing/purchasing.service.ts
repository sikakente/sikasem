import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { AuditService } from '../audit/audit.service';
import { LocationsService } from '../locations/locations.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { PurchaseQueryDto } from './dto/purchase-query.dto';

@Injectable()
export class PurchasingService {
  constructor(
    private prisma: PrismaService,
    private inventory: InventoryService,
    private audit: AuditService,
    private locations: LocationsService,
  ) {}

  async findAll(query: PurchaseQueryDto) {
    const { page = 1, limit = 20, supplierId, status, dateFrom, dateTo } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (supplierId) where.supplierId = supplierId;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.purchaseDate = {};
      if (dateFrom) where.purchaseDate.gte = new Date(dateFrom);
      if (dateTo) where.purchaseDate.lte = new Date(dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: true,
        supplier: true,
      },
    });
    if (!order) {
      throw new NotFoundException(`Purchase order with id "${id}" not found`);
    }
    return order;
  }

  async create(dto: CreatePurchaseDto, userId: string) {
    const referenceNo = `PO-${Date.now()}`;

    const order = await this.prisma.purchaseOrder.create({
      data: {
        referenceNo,
        supplierId: dto.supplierId,
        purchaseDate: new Date(dto.purchaseDate),
        status: 'draft',
        notes: dto.notes,
        createdBy: userId,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitCostGbp: item.unitCostGbp,
            totalCostGbp: item.totalCostGbp,
            fxRatePurchase: item.fxRatePurchase,
            totalCostGhsEquivalent: item.totalCostGhsEquivalent,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
            batchReference: item.batchReference,
            notes: item.notes,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    return order;
  }

  async update(id: string, dto: UpdatePurchaseDto, userId: string) {
    const existing = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Purchase order with id "${id}" not found`);
    }
    if (existing.status !== 'draft') {
      throw new ConflictException('Only draft purchase orders can be updated');
    }

    const beforeJson = { ...existing } as Record<string, unknown>;

    const order = await this.prisma.$transaction(async (tx) => {
      // Replace items if provided
      if (dto.items) {
        await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
      }

      return tx.purchaseOrder.update({
        where: { id },
        data: {
          ...(dto.supplierId && { supplierId: dto.supplierId }),
          ...(dto.purchaseDate && { purchaseDate: new Date(dto.purchaseDate) }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
          ...(dto.items && {
            items: {
              create: dto.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitCostGbp: item.unitCostGbp,
                totalCostGbp: item.totalCostGbp,
                fxRatePurchase: item.fxRatePurchase,
                totalCostGhsEquivalent: item.totalCostGhsEquivalent,
                expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
                batchReference: item.batchReference,
                notes: item.notes,
              })),
            },
          }),
        },
        include: {
          items: true,
        },
      });
    });

    await this.audit.log({
      userId,
      actionType: 'purchase_order_update',
      entityType: 'purchase_order',
      entityId: id,
      beforeJson,
      afterJson: { ...order } as Record<string, unknown>,
    });

    return order;
  }

  async confirm(id: string, userId: string) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Purchase order with id "${id}" not found`);
    }

    if (order.status === 'confirmed') {
      throw new ConflictException('Purchase order is already confirmed');
    }

    const ukWarehouse = await this.locations.getUkWarehouse();

    const confirmedOrder = await this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await this.inventory.recordMovement(
          {
            productId: item.productId,
            movementType: 'purchase_in',
            quantity: Number(item.quantity),
            toLocationId: ukWarehouse.id,
            referenceType: 'purchase_order_item',
            referenceId: item.id,
            notes: item.notes ?? undefined,
            createdBy: userId,
          },
          tx,
        );

        await tx.fxRecord.create({
          data: {
            eventType: 'purchase',
            referenceType: 'purchase_order_item',
            referenceId: item.id,
            fromCurrency: 'GBP',
            toCurrency: 'GHS',
            exchangeRate: item.fxRatePurchase,
            sourceAmount: item.totalCostGbp,
            targetAmount: item.totalCostGhsEquivalent,
          },
        });
      }

      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: { status: 'confirmed' },
        include: { items: true },
      });

      return updated;
    });

    await this.audit.log({
      userId,
      actionType: 'purchase_order_confirm',
      entityType: 'purchase_order',
      entityId: id,
      afterJson: { status: 'confirmed' },
    });

    return confirmedOrder;
  }
}
