import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateConversionDto } from './dto/create-conversion.dto';
import { FxQueryDto } from './dto/fx-query.dto';

/**
 * Rate direction convention: all exchange_rate values are stored as GBP per 1 GHS.
 * Example: 0.065 means 1 GHS = 0.065 GBP.
 * This applies to ALL fx_records rows regardless of event_type.
 */
export const FX_RATE_DIRECTION = 'GBP_PER_GHS';

@Injectable()
export class FxService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ─── FX Records ────────────────────────────────────────────────────────────

  async findAll(query: FxQueryDto) {
    const { page = 1, limit = 20, eventType, dateFrom, dateTo } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.FxRecordWhereInput = {};
    if (eventType) where.eventType = eventType;
    if (dateFrom || dateTo) {
      where.eventDatetime = {};
      if (dateFrom)
        (where.eventDatetime as Prisma.DateTimeFilter).gte = new Date(dateFrom);
      if (dateTo)
        (where.eventDatetime as Prisma.DateTimeFilter).lte = new Date(dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.fxRecord.findMany({
        where,
        orderBy: { eventDatetime: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.fxRecord.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    const record = await this.prisma.fxRecord.findUnique({
      where: { id },
      include: { sale: { select: { id: true, totalGhs: true } } },
    });
    if (!record) throw new NotFoundException(`FX record ${id} not found`);
    return record;
  }

  // ─── Cash Conversions ──────────────────────────────────────────────────────

  async findConversions(query: FxQueryDto) {
    const { page = 1, limit = 20, dateFrom, dateTo } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CashConversionWhereInput = {};
    if (dateFrom || dateTo) {
      where.conversionDate = {};
      if (dateFrom)
        (where.conversionDate as Prisma.DateTimeFilter).gte = new Date(
          dateFrom,
        );
      if (dateTo)
        (where.conversionDate as Prisma.DateTimeFilter).lte = new Date(dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.cashConversion.findMany({
        where,
        include: { _count: { select: { saleLinks: true } } },
        orderBy: { conversionDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.cashConversion.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findConversionById(id: string) {
    const conversion = await this.prisma.cashConversion.findUnique({
      where: { id },
      include: {
        saleLinks: {
          include: {
            sale: { select: { id: true, totalGhs: true, createdAt: true } },
          },
        },
        createdByUser: { select: { id: true, email: true } },
      },
    });
    if (!conversion)
      throw new NotFoundException(`Cash conversion ${id} not found`);
    return conversion;
  }

  async createConversion(dto: CreateConversionDto, userId: string) {
    const conversionReference = `CONV-${Date.now()}`;

    return this.prisma.$transaction(async (tx) => {
      const conversion = await tx.cashConversion.create({
        data: {
          conversionReference,
          conversionDate: new Date(dto.conversionDate),
          sourceCurrency: 'GHS',
          sourceAmount: new Prisma.Decimal(dto.sourceAmountGhs),
          destinationCurrency: 'GBP',
          destinationAmount: new Prisma.Decimal(dto.destinationAmountGbp),
          exchangeRate: new Prisma.Decimal(dto.exchangeRate),
          feesGbp: dto.feesGbp != null ? new Prisma.Decimal(dto.feesGbp) : null,
          notes: dto.notes,
          createdBy: userId,
        },
      });

      await tx.fxRecord.create({
        data: {
          eventType: 'conversion',
          referenceType: 'cash_conversion',
          referenceId: conversion.id,
          fromCurrency: 'GHS',
          toCurrency: 'GBP',
          exchangeRate: new Prisma.Decimal(dto.exchangeRate),
          sourceAmount: new Prisma.Decimal(dto.sourceAmountGhs),
          targetAmount: new Prisma.Decimal(dto.destinationAmountGbp),
          eventDatetime: new Date(dto.conversionDate),
          notes: dto.notes,
        },
      });

      if (dto.saleLinks && dto.saleLinks.length > 0) {
        await tx.cashConversionSaleLink.createMany({
          data: dto.saleLinks.map((link) => ({
            cashConversionId: conversion.id,
            saleId: link.saleId,
            amountGhsAllocated: new Prisma.Decimal(link.amountGhsAllocated),
          })),
        });
      }

      this.audit.log({
        userId,
        actionType: 'create',
        entityType: 'cash_conversion',
        entityId: conversion.id,
        afterJson: {
          conversionReference,
          sourceAmountGhs: dto.sourceAmountGhs,
        },
      });

      return this.findConversionById(conversion.id);
    });
  }

  async getLatestSaleRate(): Promise<{ exchangeRate: number | null }> {
    const record = await this.prisma.fxRecord.findFirst({
      where: { eventType: 'sale' },
      orderBy: { eventDatetime: 'desc' },
      select: { exchangeRate: true },
    });
    return { exchangeRate: record ? Number(record.exchangeRate) : null };
  }

  // ─── Summary ───────────────────────────────────────────────────────────────

  async getSummary(query: { dateFrom?: string; dateTo?: string }) {
    const { dateFrom, dateTo } = query;
    const dateFilter: Prisma.DateTimeFilter = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) dateFilter.lte = new Date(dateTo);
    const hasDateFilter = dateFrom || dateTo;

    // ── Purchase FX (GBP → GHS) ──────────────────────────────────────────────
    const purchaseRecords = await this.prisma.fxRecord.findMany({
      where: {
        eventType: 'purchase',
        ...(hasDateFilter ? { eventDatetime: dateFilter } : {}),
      },
      select: { sourceAmount: true, targetAmount: true, exchangeRate: true },
    });

    const purchaseFx = this.aggregateFxRecords(purchaseRecords);

    // ── Sale FX (GHS → GBP) ──────────────────────────────────────────────────
    const saleRecords = await this.prisma.fxRecord.findMany({
      where: {
        eventType: 'sale',
        ...(hasDateFilter ? { eventDatetime: dateFilter } : {}),
      },
      select: { sourceAmount: true, targetAmount: true, exchangeRate: true },
    });

    const totalGhsSales = saleRecords.reduce(
      (sum, r) => sum + Number(r.sourceAmount),
      0,
    );
    const totalExpectedGbp = saleRecords.reduce(
      (sum, r) => sum + Number(r.targetAmount),
      0,
    );
    const saleFx = {
      totalGhsSales,
      totalExpectedGbp,
      avgRate:
        saleRecords.length > 0
          ? saleRecords.reduce((sum, r) => sum + Number(r.exchangeRate), 0) /
            saleRecords.length
          : 0,
    };

    // ── Conversion FX ────────────────────────────────────────────────────────
    const conversionDateFilter: Prisma.DateTimeFilter = {};
    if (dateFrom) conversionDateFilter.gte = new Date(dateFrom);
    if (dateTo) conversionDateFilter.lte = new Date(dateTo);

    const conversionRows = await this.prisma.cashConversion.findMany({
      where: hasDateFilter ? { conversionDate: conversionDateFilter } : {},
      select: {
        sourceAmount: true,
        destinationAmount: true,
        exchangeRate: true,
        feesGbp: true,
      },
    });

    const totalGhsConverted = conversionRows.reduce(
      (sum, r) => sum + Number(r.sourceAmount),
      0,
    );
    const totalGbpReceived = conversionRows.reduce(
      (sum, r) => sum + Number(r.destinationAmount),
      0,
    );
    const totalFees = conversionRows.reduce(
      (sum, r) => sum + Number(r.feesGbp ?? 0),
      0,
    );
    const conversionFx = {
      totalGhsConverted,
      totalGbpReceived,
      fees: totalFees,
      avgRate:
        conversionRows.length > 0
          ? conversionRows.reduce((sum, r) => sum + Number(r.exchangeRate), 0) /
            conversionRows.length
          : 0,
    };

    const realisedFxGainLoss = totalGbpReceived - totalExpectedGbp;
    const unrealisedGhsBalance = totalGhsSales - totalGhsConverted;

    // ── Period Breakdown ─────────────────────────────────────────────────────
    const periodBreakdown = await this.buildPeriodBreakdown(
      dateFrom,
      dateTo,
      dateFilter,
      conversionDateFilter,
    );

    return {
      purchaseFx,
      saleFx,
      conversionFx,
      realisedFxGainLoss,
      unrealisedGhsBalance,
      periodBreakdown,
    };
  }

  private aggregateFxRecords(
    records: {
      sourceAmount: Prisma.Decimal;
      targetAmount: Prisma.Decimal;
      exchangeRate: Prisma.Decimal;
    }[],
  ) {
    return {
      totalGbpSpent: records.reduce(
        (sum, r) => sum + Number(r.sourceAmount),
        0,
      ),
      totalGhsEquivalent: records.reduce(
        (sum, r) => sum + Number(r.targetAmount),
        0,
      ),
      avgRate:
        records.length > 0
          ? records.reduce((sum, r) => sum + Number(r.exchangeRate), 0) /
            records.length
          : 0,
    };
  }

  private async buildPeriodBreakdown(
    dateFrom: string | undefined,
    dateTo: string | undefined,
    fxDateFilter: Prisma.DateTimeFilter,
    convDateFilter: Prisma.DateTimeFilter,
  ) {
    const from = dateFrom
      ? new Date(dateFrom)
      : new Date(new Date().getFullYear(), 0, 1);
    const to = dateTo ? new Date(dateTo) : new Date();

    const months: string[] = [];
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    while (cursor <= to) {
      months.push(
        `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`,
      );
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const [allFxRecords, allConversions] = await Promise.all([
      this.prisma.fxRecord.findMany({
        where: Object.keys(fxDateFilter).length
          ? { eventDatetime: fxDateFilter }
          : {},
        select: {
          eventType: true,
          sourceAmount: true,
          targetAmount: true,
          exchangeRate: true,
          eventDatetime: true,
        },
      }),
      this.prisma.cashConversion.findMany({
        where: Object.keys(convDateFilter).length
          ? { conversionDate: convDateFilter }
          : {},
        select: {
          sourceAmount: true,
          destinationAmount: true,
          exchangeRate: true,
          conversionDate: true,
        },
      }),
    ]);

    return months.map((month) => {
      const [year, mon] = month.split('-').map(Number);
      const monthStart = new Date(year, mon - 1, 1);
      const monthEnd = new Date(year, mon, 0, 23, 59, 59);

      const monthPurchase = allFxRecords.filter(
        (r) =>
          r.eventType === 'purchase' &&
          r.eventDatetime >= monthStart &&
          r.eventDatetime <= monthEnd,
      );
      const monthSale = allFxRecords.filter(
        (r) =>
          r.eventType === 'sale' &&
          r.eventDatetime >= monthStart &&
          r.eventDatetime <= monthEnd,
      );
      const monthConv = allConversions.filter(
        (r) => r.conversionDate >= monthStart && r.conversionDate <= monthEnd,
      );

      const expectedGbp = monthSale.reduce(
        (sum, r) => sum + Number(r.targetAmount),
        0,
      );
      const actualGbp = monthConv.reduce(
        (sum, r) => sum + Number(r.destinationAmount),
        0,
      );

      return {
        month,
        purchaseFx: this.aggregateFxRecords(monthPurchase),
        saleFx: {
          totalGhsSales: monthSale.reduce(
            (sum, r) => sum + Number(r.sourceAmount),
            0,
          ),
          totalExpectedGbp: expectedGbp,
        },
        conversionFx: {
          totalGhsConverted: monthConv.reduce(
            (sum, r) => sum + Number(r.sourceAmount),
            0,
          ),
          totalGbpReceived: actualGbp,
        },
        gainLoss: actualGbp - expectedGbp,
      };
    });
  }
}
