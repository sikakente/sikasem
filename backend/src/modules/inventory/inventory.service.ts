import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LocationsService } from '../locations/locations.service';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';

// Movement types that REDUCE stock
const DEDUCTION_TYPES = ['sale_out', 'allocate_shipment', 'dispatch', 'damage_out', 'loss_out', 'adjust_out'];
// Movement types that only reduce AVAILABLE (not on_hand) — reservation
const ALLOCATION_TYPES = ['allocate_shipment'];

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private locations: LocationsService,
  ) {}

  async recordMovement(
    params: {
      productId: string;
      movementType: string;
      quantity: number;
      fromLocationId?: string;
      toLocationId?: string;
      referenceType?: string;
      referenceId?: string;
      movementDate?: Date;
      notes?: string;
      createdBy: string;
      batchId?: string;
      allowNegative?: boolean;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<any> {
    const {
      productId,
      movementType,
      quantity,
      fromLocationId,
      toLocationId,
      referenceType,
      referenceId,
      movementDate,
      notes,
      createdBy,
      batchId,
      allowNegative = false,
    } = params;

    const isDeduction = DEDUCTION_TYPES.includes(movementType);

    // Check stock availability before starting the transaction
    if (isDeduction && !allowNegative && fromLocationId) {
      const balance = await this.prisma.inventoryBalance.findUnique({
        where: { productId_locationId: { productId, locationId: fromLocationId } },
      });
      const available = Number(balance?.quantityAvailable ?? 0);
      if (available < quantity) {
        throw new ConflictException('Insufficient stock');
      }
    }

    const executeInTx = async (client: Prisma.TransactionClient | typeof this.prisma) => {
      // Create the movement record
      const movement = await (client as any).inventoryMovement.create({
        data: {
          productId,
          movementType,
          quantity,
          fromLocationId,
          toLocationId,
          referenceType,
          referenceId,
          movementDate,
          notes,
          createdBy,
          batchId,
        },
      });

      // Update balances for toLocationId (incoming)
      if (toLocationId) {
        await (client as any).inventoryBalance.upsert({
          where: { productId_locationId: { productId, locationId: toLocationId } },
          create: {
            productId,
            locationId: toLocationId,
            quantityOnHand: quantity,
            quantityAllocated: 0,
            quantityAvailable: quantity,
          },
          update: {
            quantityOnHand: { increment: quantity },
            quantityAvailable: { increment: quantity },
          },
        });
      }

      // Update balances for fromLocationId (outgoing)
      if (fromLocationId) {
        const isAllocation = ALLOCATION_TYPES.includes(movementType);

        if (isAllocation) {
          // Allocation: decrement available, increment allocated (reserve stock)
          await (client as any).inventoryBalance.upsert({
            where: { productId_locationId: { productId, locationId: fromLocationId } },
            create: {
              productId,
              locationId: fromLocationId,
              quantityOnHand: 0,
              quantityAllocated: quantity,
              quantityAvailable: -quantity,
            },
            update: {
              quantityAllocated: { increment: quantity },
              quantityAvailable: { decrement: quantity },
            },
          });
        } else {
          // Regular deduction: decrement both on_hand and available
          await (client as any).inventoryBalance.upsert({
            where: { productId_locationId: { productId, locationId: fromLocationId } },
            create: {
              productId,
              locationId: fromLocationId,
              quantityOnHand: -quantity,
              quantityAllocated: 0,
              quantityAvailable: -quantity,
            },
            update: {
              quantityOnHand: { decrement: quantity },
              quantityAvailable: { decrement: quantity },
            },
          });
        }
      }

      return movement;
    };

    if (tx) {
      return executeInTx(tx);
    }

    return this.prisma.$transaction(async (txClient) => executeInTx(txClient));
  }

  async getBalances(query: any) {
    const {
      page = 1,
      limit = 20,
      locationId,
      productId,
      lowStock,
      search,
    } = query;

    const skip = (page - 1) * limit;

    const where: any = {};
    if (locationId) where.locationId = locationId;
    if (productId) where.productId = productId;

    if (search) {
      where.product = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    if (lowStock) {
      where.OR = [
        {
          product: { reorderPoint: { not: null } },
          quantityAvailable: { lte: 0 },
        },
        { quantityAvailable: { lte: 0 } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.inventoryBalance.findMany({
        where,
        include: {
          product: true,
          location: true,
        },
        skip,
        take: limit,
      }),
      this.prisma.inventoryBalance.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async getMovements(query: any) {
    const {
      page = 1,
      limit = 20,
      productId,
      locationId,
      movementType,
      dateFrom,
      dateTo,
    } = query;

    const skip = (page - 1) * limit;

    const where: any = {};
    if (productId) where.productId = productId;
    if (movementType) where.movementType = movementType;

    if (locationId) {
      where.OR = [{ fromLocationId: locationId }, { toLocationId: locationId }];
    }

    if (dateFrom || dateTo) {
      where.movementDate = {};
      if (dateFrom) where.movementDate.gte = new Date(dateFrom);
      if (dateTo) where.movementDate.lte = new Date(dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.inventoryMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { movementDate: 'desc' },
      }),
      this.prisma.inventoryMovement.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async createAdjustment(dto: CreateAdjustmentDto, userId: string) {
    const movementType = dto.adjustmentType === 'add' ? 'adjust_in' : 'adjust_out';
    const result = await this.recordMovement({
      productId: dto.productId,
      movementType,
      quantity: dto.quantity,
      toLocationId: dto.adjustmentType === 'add' ? dto.locationId : undefined,
      fromLocationId: dto.adjustmentType === 'remove' ? dto.locationId : undefined,
      referenceType: 'adjustment',
      referenceId: dto.productId,
      notes: dto.notes ?? dto.reason,
      createdBy: userId,
    });

    await this.audit.log({
      userId,
      actionType: 'inventory_adjustment',
      entityType: 'inventory',
      entityId: dto.productId,
      afterJson: { adjustmentType: dto.adjustmentType, quantity: dto.quantity, reason: dto.reason },
    });

    return result;
  }

  async getProductStock(productId: string) {
    return this.prisma.inventoryBalance.findMany({
      where: { productId },
      include: { location: true },
    });
  }
}
