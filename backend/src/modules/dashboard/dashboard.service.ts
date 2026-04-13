import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FxService } from '../fx/fx.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private fx: FxService,
  ) {}

  private monthBounds(offset = 0): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  private dateFilter(query: DashboardQueryDto) {
    const filter: { gte?: Date; lte?: Date } = {};
    if (query.dateFrom) filter.gte = new Date(query.dateFrom);
    if (query.dateTo) filter.lte = new Date(query.dateTo);
    return filter;
  }

  private async getRevenueSummary(query: DashboardQueryDto) {
    const { start: thisMonthStart, end: thisMonthEnd } = this.monthBounds(0);
    const { start: lastMonthStart, end: lastMonthEnd } = this.monthBounds(-1);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [today, thisMonth, lastMonth, fxThisMonth] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { status: 'completed', saleDatetime: { gte: todayStart, lte: todayEnd } },
        _sum: { totalGhs: true },
      }),
      this.prisma.sale.aggregate({
        where: { status: 'completed', saleDatetime: { gte: thisMonthStart, lte: thisMonthEnd } },
        _sum: { totalGhs: true },
      }),
      this.prisma.sale.aggregate({
        where: { status: 'completed', saleDatetime: { gte: lastMonthStart, lte: lastMonthEnd } },
        _sum: { totalGhs: true },
      }),
      this.prisma.fxRecord.aggregate({
        where: { eventType: 'sale', eventDatetime: { gte: thisMonthStart, lte: thisMonthEnd } },
        _sum: { targetAmount: true },
      }),
    ]);

    const todayGhs = Number(today._sum.totalGhs ?? 0);
    const thisMonthGhs = Number(thisMonth._sum.totalGhs ?? 0);
    const lastMonthGhs = Number(lastMonth._sum.totalGhs ?? 0);
    const monthOverMonthChange =
      lastMonthGhs > 0 ? ((thisMonthGhs - lastMonthGhs) / lastMonthGhs) * 100 : 0;
    const thisMonthGbpEstimate = Number(fxThisMonth._sum.targetAmount ?? 0);

    return { todayGhs, thisMonthGhs, lastMonthGhs, monthOverMonthChange, thisMonthGbpEstimate };
  }

  private async getProfitSummary(query: DashboardQueryDto) {
    const df = this.dateFilter(query);
    const hasDateFilter = Object.keys(df).length > 0;
    const { start: thisMonthStart, end: thisMonthEnd } = this.monthBounds(0);

    let saleWhere: Prisma.SaleItemWhereInput = { sale: { status: 'completed' } };
    if (hasDateFilter) saleWhere = { sale: { status: 'completed', saleDatetime: df } };

    const costWhere = hasDateFilter
      ? { costDate: df }
      : { costDate: { gte: thisMonthStart, lte: thisMonthEnd } };

    const [saleItems, fxSummary, shippingCosts] = await Promise.all([
      this.prisma.saleItem.findMany({
        where: saleWhere,
        select: { lineTotalGhs: true, estimatedLandedCostGbp: true },
      }),
      this.fx.getSummary(query),
      this.prisma.shipmentCost.aggregate({ where: costWhere, _sum: { amountGbp: true } }),
    ]);

    const totalRevenueGhs = saleItems.reduce((sum, i) => sum + Number(i.lineTotalGhs), 0);
    const totalLandedCostGbp = saleItems.reduce(
      (sum, i) => sum + Number(i.estimatedLandedCostGbp ?? 0),
      0,
    );
    const avgSaleRate = fxSummary.saleFx.avgRate || 0.065;
    const totalRevenueGbp = totalRevenueGhs * avgSaleRate;

    const estimatedGrossProfit = totalRevenueGbp - totalLandedCostGbp;
    const estimatedGrossProfitMargin =
      totalRevenueGbp > 0 ? (estimatedGrossProfit / totalRevenueGbp) * 100 : 0;
    const shippingCostGbp = Number(shippingCosts._sum.amountGbp ?? 0);
    const estimatedNetProfitAfterShipping = estimatedGrossProfit - shippingCostGbp;

    return { estimatedGrossProfit, estimatedGrossProfitMargin, estimatedNetProfitAfterShipping };
  }

  private async getInventorySummary() {
    const [balances, ukStock, ghanaStock] = await Promise.all([
      this.prisma.inventoryBalance.findMany({
        select: {
          quantityAvailable: true,
          product: { select: { minimumStockThreshold: true, defaultCostPriceGbp: true } },
        },
      }),
      this.prisma.inventoryBalance.aggregate({
        where: { location: { locationType: 'UK warehouse' } },
        _sum: { quantityAvailable: true },
      }),
      this.prisma.inventoryBalance.aggregate({
        where: { location: { locationType: 'Ghana warehouse' } },
        _sum: { quantityAvailable: true },
      }),
    ]);

    const lowStockCount = balances.filter(
      (b) =>
        Number(b.quantityAvailable) > 0 &&
        Number(b.quantityAvailable) < Number(b.product.minimumStockThreshold),
    ).length;
    const outOfStockCount = balances.filter((b) => Number(b.quantityAvailable) === 0).length;
    const totalStockValueGbp = balances.reduce((sum, b) => {
      return sum + Number(b.product.defaultCostPriceGbp ?? 0) * Number(b.quantityAvailable);
    }, 0);

    return {
      totalStockValueGbp,
      lowStockCount,
      outOfStockCount,
      ukStockCount: Number(ukStock._sum.quantityAvailable ?? 0),
      ghanaStockCount: Number(ghanaStock._sum.quantityAvailable ?? 0),
    };
  }

  private async getShipmentSummary(query: DashboardQueryDto) {
    const now = new Date();
    const df = this.dateFilter(query);
    const hasDateFilter = Object.keys(df).length > 0;
    const { start: thisMonthStart, end: thisMonthEnd } = this.monthBounds(0);
    const costWhere = hasDateFilter
      ? { costDate: df }
      : { costDate: { gte: thisMonthStart, lte: thisMonthEnd } };

    const [inTransitCount, delayedCount, completedShipments, shippingCost] = await Promise.all([
      this.prisma.shipment.count({ where: { status: 'in_transit' } }),
      this.prisma.shipment.count({
        where: {
          expectedArrivalDate: { lt: now },
          actualArrivalDate: null,
          status: { not: 'received' },
        },
      }),
      this.prisma.shipment.findMany({
        where: { actualArrivalDate: { not: null }, dispatchDate: { not: null } },
        select: { dispatchDate: true, actualArrivalDate: true },
        orderBy: { actualArrivalDate: 'desc' },
        take: 50,
      }),
      this.prisma.shipmentCost.aggregate({ where: costWhere, _sum: { amountGbp: true } }),
    ]);

    let avgTransitDays = 0;
    if (completedShipments.length > 0) {
      const totalDays = completedShipments.reduce((sum, s) => {
        const days =
          (new Date(s.actualArrivalDate!).getTime() - new Date(s.dispatchDate!).getTime()) /
          86400000;
        return sum + days;
      }, 0);
      avgTransitDays = Math.round(totalDays / completedShipments.length);
    }

    return {
      inTransitCount,
      delayedCount,
      avgTransitDays,
      avgTransitTrend: 'neutral' as const,
      shippingCostThisMonthGbp: Number(shippingCost._sum.amountGbp ?? 0),
    };
  }

  private async getFxSummary(query: DashboardQueryDto) {
    const summary = await this.fx.getSummary(query);
    return {
      realisedFxGainLoss: summary.realisedFxGainLoss,
      unrealisedGhsBalance: summary.unrealisedGhsBalance,
      avgSaleRate: summary.saleFx.avgRate,
      avgPurchaseRate: summary.purchaseFx.avgRate,
    };
  }

  private async getTopProducts(query: DashboardQueryDto) {
    const df = this.dateFilter(query);
    const hasDateFilter = Object.keys(df).length > 0;
    let saleWhere: Prisma.SaleItemWhereInput = { sale: { status: 'completed' } };
    if (hasDateFilter) saleWhere = { sale: { status: 'completed', saleDatetime: df } };

    const grouped = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      where: saleWhere,
      _sum: { quantity: true, lineTotalGhs: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    });

    if (grouped.length === 0) {
      return { bestSelling: [], highRevenue: [], slowMoving: [] };
    }

    const productIds = grouped.map((g) => g.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const enriched = grouped.map((g) => ({
      ...productMap.get(g.productId),
      totalQuantity: Number(g._sum.quantity ?? 0),
      totalRevenueGhs: Number(g._sum.lineTotalGhs ?? 0),
    }));

    const byQuantity = [...enriched].sort((a, b) => b.totalQuantity - a.totalQuantity);
    const byRevenue = [...enriched].sort((a, b) => b.totalRevenueGhs - a.totalRevenueGhs);
    const slowest = [...enriched].sort((a, b) => a.totalQuantity - b.totalQuantity);

    return {
      bestSelling: byQuantity.slice(0, 3),
      highRevenue: byRevenue.slice(0, 3),
      slowMoving: slowest.slice(0, 3),
    };
  }

  private async getActiveAlerts() {
    const [bySeverity, topAlerts] = await Promise.all([
      this.prisma.alert.groupBy({
        by: ['severity'],
        where: { status: 'open' },
        _count: { id: true },
      }),
      this.prisma.alert.findMany({
        where: { status: 'open' },
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        take: 5,
        select: {
          id: true,
          alertType: true,
          severity: true,
          title: true,
          message: true,
          createdAt: true,
        },
      }),
    ]);

    const countBySeverity = Object.fromEntries(
      bySeverity.map((b) => [b.severity, b._count.id]),
    );

    const totalOpen = bySeverity.reduce((sum, b) => sum + b._count.id, 0);
    return { totalOpen, countBySeverity, topAlerts };
  }

  private async getTopRisks() {
    return this.prisma.riskRecord.findMany({
      where: { status: 'open' },
      orderBy: { score: 'desc' },
      take: 3,
    });
  }

  private async getTopOpportunities() {
    return this.prisma.opportunityRecord.findMany({
      where: { status: 'open' },
      orderBy: { score: 'desc' },
      take: 3,
    });
  }

  async getSummary(query: DashboardQueryDto) {
    const [revenue, profit, inventory, shipments, fx, topProducts, alerts, risks, opportunities] =
      await Promise.all([
        this.getRevenueSummary(query),
        this.getProfitSummary(query),
        this.getInventorySummary(),
        this.getShipmentSummary(query),
        this.getFxSummary(query),
        this.getTopProducts(query),
        this.getActiveAlerts(),
        this.getTopRisks(),
        this.getTopOpportunities(),
      ]);

    return { revenue, profit, inventory, shipments, fx, topProducts, alerts, risks, opportunities };
  }

  async getRevenueDrilldown(query: DashboardQueryDto) {
    const months: { label: string; start: Date; end: Date }[] = [];
    for (let i = 5; i >= 0; i--) {
      const { start, end } = this.monthBounds(-i);
      const label = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
      months.push({ label, start, end });
    }

    const monthly = await Promise.all(
      months.map(async ({ label, start, end }) => {
        const [sales, fx] = await Promise.all([
          this.prisma.sale.aggregate({
            where: { status: 'completed', saleDatetime: { gte: start, lte: end } },
            _sum: { totalGhs: true },
            _count: { id: true },
          }),
          this.prisma.fxRecord.aggregate({
            where: { eventType: 'sale', eventDatetime: { gte: start, lte: end } },
            _sum: { targetAmount: true },
          }),
        ]);
        return {
          month: label,
          totalGhs: Number(sales._sum.totalGhs ?? 0),
          totalGbpEstimate: Number(fx._sum.targetAmount ?? 0),
          saleCount: sales._count.id,
        };
      }),
    );

    return { monthly };
  }

  async getShipmentDrilldown() {
    const now = new Date();
    const [statusBreakdown, delayedShipments, completedShipments] = await Promise.all([
      this.prisma.shipment.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.shipment.findMany({
        where: {
          expectedArrivalDate: { lt: now },
          actualArrivalDate: null,
          status: { not: 'received' },
        },
        select: {
          id: true,
          shipmentReference: true,
          expectedArrivalDate: true,
          carrierName: true,
          status: true,
        },
      }),
      this.prisma.shipment.findMany({
        where: { actualArrivalDate: { not: null }, dispatchDate: { not: null } },
        select: { dispatchDate: true, actualArrivalDate: true },
        orderBy: { actualArrivalDate: 'desc' },
        take: 30,
      }),
    ]);

    const transitTimes = completedShipments.map((s) => ({
      days: Math.round(
        (new Date(s.actualArrivalDate!).getTime() - new Date(s.dispatchDate!).getTime()) /
          86400000,
      ),
    }));

    return { statusBreakdown, delayedShipments, transitTimes };
  }

  async getFxSummaryPublic(query: DashboardQueryDto) {
    return this.getFxSummary(query);
  }

  async getTopProductsPublic(query: DashboardQueryDto) {
    return this.getTopProducts(query);
  }

  async getTopRisksPublic() {
    return this.getTopRisks();
  }
}
