import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { AuditService } from '../audit/audit.service';
import { LocationsService } from '../locations/locations.service';
import { ReceiptsService } from '../receipts/receipts.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { VoidSaleDto } from './dto/void-sale.dto';
import { SaleQueryDto } from './dto/sale-query.dto';

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private inventory: InventoryService,
    private audit: AuditService,
    private locations: LocationsService,
    private receipts: ReceiptsService,
  ) {}

  async findAll(query: SaleQueryDto) {
    const {
      page = 1,
      limit = 20,
      dateFrom,
      dateTo,
      soldBy,
      locationId,
      customerId,
      status,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (soldBy) where.soldBy = soldBy;
    if (locationId) where.locationId = locationId;
    if (customerId) where.customerId = customerId;
    if (dateFrom || dateTo) {
      where.saleDatetime = {};
      if (dateFrom) where.saleDatetime.gte = new Date(dateFrom);
      if (dateTo) where.saleDatetime.lte = new Date(dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        include: {
          customer: { select: { id: true, fullName: true } },
          _count: { select: { items: true } },
        },
        orderBy: { saleDatetime: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.sale.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: { select: { id: true, name: true, sku: true } } },
        },
        payments: true,
        receipts: true,
        customer: true,
        fxRecords: true,
      },
    });

    if (!sale) {
      throw new NotFoundException(`Sale with id "${id}" not found`);
    }

    return sale;
  }

  async create(dto: CreateSaleDto, userId: string) {
    const ghanaWarehouse = await this.locations.getGhanaWarehouse();

    // Calculate totals
    const subtotalGhs = dto.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPriceGhs,
      0,
    );
    const discountTotalGhs = dto.items.reduce(
      (sum, item) => sum + (item.discountAmountGhs ?? 0),
      0,
    );
    const totalGhs = subtotalGhs - discountTotalGhs;

    const saleReference = `SALE-${Date.now()}`;

    const sale = await this.prisma.$transaction(async (tx) => {
      // Create the sale header
      const newSale = await tx.sale.create({
        data: {
          saleReference,
          locationId: dto.locationId,
          customerId: dto.customerId ?? null,
          soldBy: userId,
          currencyCode: dto.currencyCode ?? 'GHS',
          subtotalGhs,
          discountTotalGhs,
          totalGhs,
          notes: dto.notes,
          status: 'completed',
        },
      });

      // Create sale items and record inventory movements
      for (const item of dto.items) {
        const lineTotal =
          item.quantity * item.unitPriceGhs - (item.discountAmountGhs ?? 0);

        await tx.saleItem.create({
          data: {
            saleId: newSale.id,
            productId: item.productId,
            batchId: item.batchId ?? null,
            quantity: item.quantity,
            unitPriceGhs: item.unitPriceGhs,
            discountAmountGhs: item.discountAmountGhs ?? 0,
            lineTotalGhs: lineTotal,
          },
        });

        await this.inventory.recordMovement(
          {
            productId: item.productId,
            movementType: 'sale_out',
            quantity: item.quantity,
            fromLocationId: ghanaWarehouse.id,
            referenceType: 'sale',
            referenceId: newSale.id,
            createdBy: userId,
            batchId: item.batchId,
          },
          tx,
        );
      }

      // Create payments
      for (const payment of dto.payments) {
        await tx.salePayment.create({
          data: {
            saleId: newSale.id,
            paymentMethod: payment.paymentMethod,
            amountGhs: payment.amountGhs,
            paymentReference: payment.paymentReference ?? null,
          },
        });
      }

      // Create FX record
      const fxRate = dto.fxRateAtSale ?? 1;
      await tx.fxRecord.create({
        data: {
          eventType: 'sale',
          referenceType: 'sale',
          referenceId: newSale.id,
          fromCurrency: 'GHS',
          toCurrency: 'GBP',
          exchangeRate: fxRate,
          sourceAmount: totalGhs,
          targetAmount: totalGhs / fxRate,
          saleId: newSale.id,
        },
      });

      // Create receipt row (PDF generated after transaction)
      await tx.receipt.create({
        data: {
          receiptNumber: `REC-${Date.now()}`,
          saleId: newSale.id,
          totalGhs,
          createdBy: userId,
        },
      });

      return newSale;
    });

    // Generate PDF in background — does not block the transaction
    this.receipts.generate(sale.id, totalGhs, userId).catch(() => {
      // Fire-and-forget: PDF generation failure does not fail the sale
    });

    await this.audit.log({
      userId,
      actionType: 'sale_create',
      entityType: 'sale',
      entityId: sale.id,
      afterJson: {
        saleReference,
        totalGhs,
        itemCount: dto.items.length,
      },
    });

    return this.findById(sale.id);
  }

  async void(id: string, dto: VoidSaleDto, userId: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!sale) {
      throw new NotFoundException(`Sale with id "${id}" not found`);
    }
    if (sale.status === 'voided') {
      throw new ConflictException('Sale is already voided');
    }

    const ghanaWarehouse = await this.locations.getGhanaWarehouse();

    await this.prisma.$transaction(async (tx) => {
      for (const item of sale.items) {
        await this.inventory.recordMovement(
          {
            productId: item.productId,
            movementType: 'return_in',
            quantity: Number(item.quantity),
            toLocationId: ghanaWarehouse.id,
            referenceType: 'sale_void',
            referenceId: id,
            notes: dto.reason,
            createdBy: userId,
          },
          tx,
        );
      }

      await tx.sale.update({
        where: { id },
        data: { status: 'voided' },
      });
    });

    await this.audit.log({
      userId,
      actionType: 'sale_void',
      entityType: 'sale',
      entityId: id,
      afterJson: { reason: dto.reason, itemCount: sale.items.length },
    });

    return this.findById(id);
  }
}
