# Step-09 Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the aggregated KPI dashboard — backend aggregation endpoints covering all business dimensions and a mobile-first dashboard screen with KPI cards, drill-through screens, and pull-to-refresh.

**Architecture:** A new `DashboardService` in NestJS aggregates data from Prisma models in parallel via `Promise.all`, exposing a single `GET /dashboard/summary` endpoint plus individual drilldown endpoints. The mobile layer replaces the placeholder `index.tsx` home screen with a real dashboard that fetches from the summary endpoint, caches results in Zustand, and renders KpiCards, a MiniChart sparkline component, RiskPanel, and OpportunityPanel. Four drilldown screens cover revenue, shipments, FX, and products.

**Tech Stack:** NestJS, Prisma (PostgreSQL), React Native, Expo Router, Zustand, react-native-svg (already installed), axios.

---

## File Map

### Backend — Create
- `backend/src/modules/dashboard/dto/dashboard-query.dto.ts` — query params DTO
- `backend/src/modules/dashboard/dashboard.service.ts` — all aggregation logic
- `backend/src/modules/dashboard/dashboard.service.spec.ts` — unit tests (mocked Prisma + FxService)
- `backend/src/modules/dashboard/dashboard.controller.ts` — HTTP routes

### Backend — Modify
- `backend/src/modules/dashboard/dashboard.module.ts` — add provider, controller, import FxModule

### Mobile — Create
- `mobile/src/lib/api/dashboard.api.ts` — API client module
- `mobile/src/store/dashboard.store.ts` — Zustand store for cached summary
- `mobile/src/components/KpiCard.tsx` — reusable KPI tile component
- `mobile/src/components/MiniChart.tsx` — react-native-svg sparkline
- `mobile/src/components/RiskPanel.tsx` — top-3 risk cards list
- `mobile/src/components/OpportunityPanel.tsx` — top-3 opportunity cards list
- `mobile/src/app/(app)/dashboard/revenue.tsx` — revenue trend drilldown
- `mobile/src/app/(app)/dashboard/shipments.tsx` — shipment status drilldown
- `mobile/src/app/(app)/dashboard/fx.tsx` — FX impact drilldown
- `mobile/src/app/(app)/dashboard/products.tsx` — product profitability drilldown

### Mobile — Modify
- `mobile/src/app/(app)/index.tsx` — replace placeholder with real dashboard screen
- `mobile/src/app/(app)/_layout.tsx` — change "Home" tab to "Dashboard" with grid-outline icon

---

## Task 1: Dashboard Query DTO

**Files:**
- Create: `backend/src/modules/dashboard/dto/dashboard-query.dto.ts`

- [ ] **Step 1: Create the DTO**

```typescript
// backend/src/modules/dashboard/dto/dashboard-query.dto.ts
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class DashboardQueryDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/dashboard/dto/dashboard-query.dto.ts
git commit -m "feat(dashboard): add DashboardQueryDto"
```

---

## Task 2: Dashboard Service — Unit Tests

**Files:**
- Create: `backend/src/modules/dashboard/dashboard.service.spec.ts`

- [ ] **Step 1: Write all failing tests**

```typescript
// backend/src/modules/dashboard/dashboard.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FxService } from '../fx/fx.service';

const now = new Date();
const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

function makeSaleAggregate(total: number) {
  return { _sum: { totalGhs: new Prisma.Decimal(total) }, _count: { id: 1 } };
}

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: any;
  let fxService: any;

  beforeEach(async () => {
    const mockPrisma: any = {
      sale: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { totalGhs: new Prisma.Decimal(0) }, _count: { id: 0 } }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      fxRecord: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { targetAmount: new Prisma.Decimal(0) } }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      saleItem: {
        findMany: jest.fn().mockResolvedValue([]),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      shipmentCost: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amountGbp: new Prisma.Decimal(0) } }),
      },
      inventoryBalance: {
        findMany: jest.fn().mockResolvedValue([]),
        aggregate: jest.fn().mockResolvedValue({ _sum: { quantityAvailable: new Prisma.Decimal(0) } }),
      },
      shipment: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      product: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      alert: {
        groupBy: jest.fn().mockResolvedValue([]),
        findMany: jest.fn().mockResolvedValue([]),
      },
      riskRecord: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      opportunityRecord: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const mockFxService: any = {
      getSummary: jest.fn().mockResolvedValue({
        purchaseFx: { totalGbpSpent: 0, totalGhsEquivalent: 0, avgRate: 0.065 },
        saleFx: { totalGhsSales: 0, totalExpectedGbp: 0, avgRate: 0.065 },
        conversionFx: { totalGhsConverted: 0, totalGbpReceived: 0, avgRate: 0, fees: 0 },
        realisedFxGainLoss: 5.5,
        unrealisedGhsBalance: 200,
        periodBreakdown: [],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FxService, useValue: mockFxService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    prisma = mockPrisma;
    fxService = mockFxService;
  });

  // ─── getRevenueSummary ───────────────────────────────────────────────────────

  describe('getRevenueSummary', () => {
    it('excludes voided sales — only queries with status: completed', async () => {
      await service.getSummary({});
      const aggregateCalls: any[] = prisma.sale.aggregate.mock.calls;
      aggregateCalls.forEach((args) => {
        expect(args[0].where.status).toBe('completed');
      });
    });

    it('scopes thisMonthGhs to the current calendar month', async () => {
      prisma.sale.aggregate
        .mockResolvedValueOnce(makeSaleAggregate(0))   // today
        .mockResolvedValueOnce(makeSaleAggregate(1000)) // this month
        .mockResolvedValueOnce(makeSaleAggregate(800)); // last month

      const result = await service.getSummary({});

      const thisMonthCall = prisma.sale.aggregate.mock.calls[1];
      const dateFilter = thisMonthCall[0].where.saleDatetime;
      expect(dateFilter.gte.getMonth()).toBe(thisMonthStart.getMonth());
      expect(dateFilter.gte.getFullYear()).toBe(thisMonthStart.getFullYear());
      expect(result.revenue.thisMonthGhs).toBe(1000);
    });

    it('calculates monthOverMonthChange as (thisMonth - lastMonth) / lastMonth * 100', async () => {
      prisma.sale.aggregate
        .mockResolvedValueOnce(makeSaleAggregate(0))    // today
        .mockResolvedValueOnce(makeSaleAggregate(1100)) // this month
        .mockResolvedValueOnce(makeSaleAggregate(1000)); // last month

      const result = await service.getSummary({});
      expect(result.revenue.monthOverMonthChange).toBeCloseTo(10, 1);
    });

    it('returns 0 monthOverMonthChange when lastMonth is 0 (avoids division by zero)', async () => {
      prisma.sale.aggregate
        .mockResolvedValueOnce(makeSaleAggregate(0))   // today
        .mockResolvedValueOnce(makeSaleAggregate(500)) // this month
        .mockResolvedValueOnce(makeSaleAggregate(0));  // last month

      const result = await service.getSummary({});
      expect(result.revenue.monthOverMonthChange).toBe(0);
    });
  });

  // ─── getInventorySummary ─────────────────────────────────────────────────────

  describe('getInventorySummary', () => {
    it('lowStockCount counts products where quantityAvailable > 0 but < minimumStockThreshold', async () => {
      prisma.inventoryBalance.findMany.mockResolvedValue([
        { quantityAvailable: new Prisma.Decimal(2), product: { minimumStockThreshold: new Prisma.Decimal(10), defaultCostPriceGbp: new Prisma.Decimal(5) } },
        { quantityAvailable: new Prisma.Decimal(0), product: { minimumStockThreshold: new Prisma.Decimal(10), defaultCostPriceGbp: new Prisma.Decimal(5) } },
        { quantityAvailable: new Prisma.Decimal(50), product: { minimumStockThreshold: new Prisma.Decimal(10), defaultCostPriceGbp: new Prisma.Decimal(5) } },
      ]);

      const result = await service.getSummary({});
      expect(result.inventory.lowStockCount).toBe(1);
    });

    it('outOfStockCount counts products where quantityAvailable = 0', async () => {
      prisma.inventoryBalance.findMany.mockResolvedValue([
        { quantityAvailable: new Prisma.Decimal(0), product: { minimumStockThreshold: new Prisma.Decimal(10), defaultCostPriceGbp: new Prisma.Decimal(5) } },
        { quantityAvailable: new Prisma.Decimal(0), product: { minimumStockThreshold: new Prisma.Decimal(5), defaultCostPriceGbp: new Prisma.Decimal(3) } },
        { quantityAvailable: new Prisma.Decimal(10), product: { minimumStockThreshold: new Prisma.Decimal(5), defaultCostPriceGbp: new Prisma.Decimal(3) } },
      ]);

      const result = await service.getSummary({});
      expect(result.inventory.outOfStockCount).toBe(2);
    });
  });

  // ─── getShipmentSummary ──────────────────────────────────────────────────────

  describe('getShipmentSummary', () => {
    it('delayedCount queries where expectedArrivalDate < today AND actualArrivalDate is null', async () => {
      prisma.shipment.count
        .mockResolvedValueOnce(3)  // in_transit count
        .mockResolvedValueOnce(2); // delayed count

      const result = await service.getSummary({});

      const delayedCall = prisma.shipment.count.mock.calls[1];
      const where = delayedCall[0].where;
      expect(where.actualArrivalDate).toBeNull();
      expect(where.expectedArrivalDate).toHaveProperty('lt');
      expect(result.shipments.delayedCount).toBe(2);
    });
  });

  // ─── getFxSummary ────────────────────────────────────────────────────────────

  describe('getFxSummary', () => {
    it('realisedFxGainLoss matches FxService.getSummary().realisedFxGainLoss', async () => {
      fxService.getSummary.mockResolvedValue({
        purchaseFx: { avgRate: 0.062 },
        saleFx: { avgRate: 0.068 },
        realisedFxGainLoss: 42.75,
        unrealisedGhsBalance: 500,
        periodBreakdown: [],
      });

      const result = await service.getSummary({});
      expect(result.fx.realisedFxGainLoss).toBe(42.75);
    });

    it('passes the same dateFrom/dateTo to FxService.getSummary', async () => {
      await service.getSummary({ dateFrom: '2026-01-01', dateTo: '2026-03-31' });
      expect(fxService.getSummary).toHaveBeenCalledWith(
        expect.objectContaining({ dateFrom: '2026-01-01', dateTo: '2026-03-31' }),
      );
    });
  });

  // ─── getSummary parallel execution ──────────────────────────────────────────

  describe('getSummary', () => {
    it('returns an object with all expected top-level keys', async () => {
      const result = await service.getSummary({});
      expect(result).toHaveProperty('revenue');
      expect(result).toHaveProperty('profit');
      expect(result).toHaveProperty('inventory');
      expect(result).toHaveProperty('shipments');
      expect(result).toHaveProperty('fx');
      expect(result).toHaveProperty('topProducts');
      expect(result).toHaveProperty('alerts');
      expect(result).toHaveProperty('risks');
      expect(result).toHaveProperty('opportunities');
    });

    it('executes all sub-queries in parallel via Promise.all', async () => {
      const promiseAllSpy = jest.spyOn(Promise, 'all');
      await service.getSummary({});
      const topLevelCall = promiseAllSpy.mock.calls.find((call) => {
        const promises = call[0] as any[];
        return Array.isArray(promises) && promises.length >= 9;
      });
      expect(topLevelCall).toBeDefined();
      promiseAllSpy.mockRestore();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && npm test -- --testPathPattern=dashboard.service.spec
```

Expected: FAIL — `DashboardService` does not exist yet.

---

## Task 3: Dashboard Service Implementation

**Files:**
- Create: `backend/src/modules/dashboard/dashboard.service.ts`

- [ ] **Step 1: Implement the service**

```typescript
// backend/src/modules/dashboard/dashboard.service.ts
import { Injectable } from '@nestjs/common';
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

    const saleWhere: any = { sale: { status: 'completed' } };
    if (hasDateFilter) saleWhere.sale = { ...saleWhere.sale, saleDatetime: df };

    const costWhere = hasDateFilter ? { costDate: df } : { costDate: { gte: thisMonthStart, lte: thisMonthEnd } };

    const [saleItems, fxSummary, shippingCosts] = await Promise.all([
      this.prisma.saleItem.findMany({
        where: saleWhere,
        select: { lineTotalGhs: true, estimatedLandedCostGbp: true },
      }),
      this.fx.getSummary(query),
      this.prisma.shipmentCost.aggregate({ where: costWhere, _sum: { amountGbp: true } }),
    ]);

    const totalRevenueGhs = saleItems.reduce((sum, i) => sum + Number(i.lineTotalGhs), 0);
    const totalLandedCostGbp = saleItems.reduce((sum, i) => sum + Number(i.estimatedLandedCostGbp ?? 0), 0);
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
    const saleWhere: any = { sale: { status: 'completed' } };
    if (hasDateFilter) saleWhere.sale = { ...saleWhere.sale, saleDatetime: df };

    const grouped = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      where: saleWhere,
      _sum: { quantity: true, lineTotalGhs: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    });

    if (grouped.length === 0) {
      return { bestSelling: [], highMargin: [], slowMoving: [] };
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
      highMargin: byRevenue.slice(0, 3),
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
        select: { id: true, alertType: true, severity: true, title: true, message: true, createdAt: true },
      }),
    ]);

    const countBySeverity = Object.fromEntries(
      bySeverity.map((b) => [b.severity, b._count.id]),
    );

    return { totalOpen: topAlerts.length, countBySeverity, topAlerts };
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
        where: { expectedArrivalDate: { lt: now }, actualArrivalDate: null, status: { not: 'received' } },
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
}
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
cd backend && npm test -- --testPathPattern=dashboard.service.spec
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/dashboard/dashboard.service.ts \
        backend/src/modules/dashboard/dashboard.service.spec.ts
git commit -m "feat(dashboard): implement DashboardService with aggregation and unit tests"
```

---

## Task 4: Dashboard Controller and Module

**Files:**
- Create: `backend/src/modules/dashboard/dashboard.controller.ts`
- Modify: `backend/src/modules/dashboard/dashboard.module.ts`

- [ ] **Step 1: Create the controller**

```typescript
// backend/src/modules/dashboard/dashboard.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiBearerAuth()
@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(RolesGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  @Roles('admin', 'operations', 'finance', 'viewer')
  getSummary(@Query() query: DashboardQueryDto) {
    return this.dashboard.getSummary(query);
  }

  @Get('revenue')
  @Roles('admin', 'operations', 'finance', 'viewer')
  getRevenue(@Query() query: DashboardQueryDto) {
    return this.dashboard.getRevenueDrilldown(query);
  }

  @Get('shipments')
  @Roles('admin', 'operations', 'finance', 'viewer')
  getShipments() {
    return this.dashboard.getShipmentDrilldown();
  }

  @Get('fx')
  @Roles('admin', 'finance', 'viewer')
  getFx(@Query() query: DashboardQueryDto) {
    return this.dashboard.getFxSummaryPublic(query);
  }

  @Get('top-products')
  @Roles('admin', 'operations', 'finance', 'viewer')
  getTopProducts(@Query() query: DashboardQueryDto) {
    return this.dashboard.getTopProductsPublic(query);
  }

  @Get('risks')
  @Roles('admin', 'operations', 'finance', 'viewer')
  getRisks() {
    return this.dashboard.getTopRisksPublic();
  }
}
```

- [ ] **Step 2: Expose three additional public methods in DashboardService** (controller needs them)

Add these three methods to `backend/src/modules/dashboard/dashboard.service.ts` at the bottom, just before the closing brace:

```typescript
  async getFxSummaryPublic(query: DashboardQueryDto) {
    return this.getFxSummary(query);
  }

  async getTopProductsPublic(query: DashboardQueryDto) {
    return this.getTopProducts(query);
  }

  async getTopRisksPublic() {
    return this.getTopRisks();
  }
```

- [ ] **Step 3: Update the module**

```typescript
// backend/src/modules/dashboard/dashboard.module.ts
import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { FxModule } from '../fx/fx.module';

@Module({
  imports: [FxModule],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
```

- [ ] **Step 4: Run lint and tests**

```bash
cd backend && npm run lint && npm test -- --testPathPattern=dashboard
```

Expected: PASS with no lint errors.

- [ ] **Step 5: Verify endpoint responds in Swagger**

With the backend running (`npm run start:dev`), open `http://localhost:3000/api/v1/docs` and confirm `GET /dashboard/summary` appears under the `dashboard` tag.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/dashboard/
git commit -m "feat(dashboard): add DashboardController and wire DashboardModule"
```

---

## Task 5: Mobile API Client

**Files:**
- Create: `mobile/src/lib/api/dashboard.api.ts`

- [ ] **Step 1: Create the API module**

```typescript
// mobile/src/lib/api/dashboard.api.ts
import client from './client';

export interface DashboardQueryParams {
  dateFrom?: string;
  dateTo?: string;
}

export const dashboardApi = {
  getSummary: (params?: DashboardQueryParams) =>
    client.get('/dashboard/summary', { params }),
  getRevenue: (params?: DashboardQueryParams) =>
    client.get('/dashboard/revenue', { params }),
  getShipments: () => client.get('/dashboard/shipments'),
  getFx: (params?: DashboardQueryParams) =>
    client.get('/dashboard/fx', { params }),
  getTopProducts: (params?: DashboardQueryParams) =>
    client.get('/dashboard/top-products', { params }),
  getRisks: () => client.get('/dashboard/risks'),
};
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/lib/api/dashboard.api.ts
git commit -m "feat(dashboard): add mobile dashboard API client"
```

---

## Task 6: Mobile Dashboard Store

**Files:**
- Create: `mobile/src/store/dashboard.store.ts`

- [ ] **Step 1: Create the store**

```typescript
// mobile/src/store/dashboard.store.ts
import { create } from 'zustand';

export interface RevenueSummary {
  todayGhs: number;
  thisMonthGhs: number;
  lastMonthGhs: number;
  monthOverMonthChange: number;
  thisMonthGbpEstimate: number;
}

export interface ProfitSummary {
  estimatedGrossProfit: number;
  estimatedGrossProfitMargin: number;
  estimatedNetProfitAfterShipping: number;
}

export interface InventorySummary {
  totalStockValueGbp: number;
  lowStockCount: number;
  outOfStockCount: number;
  ukStockCount: number;
  ghanaStockCount: number;
}

export interface ShipmentSummary {
  inTransitCount: number;
  delayedCount: number;
  avgTransitDays: number;
  avgTransitTrend: string;
  shippingCostThisMonthGbp: number;
}

export interface FxSummary {
  realisedFxGainLoss: number;
  unrealisedGhsBalance: number;
  avgSaleRate: number;
  avgPurchaseRate: number;
}

export interface TopProduct {
  id: string;
  name: string;
  sku: string;
  totalQuantity: number;
  totalRevenueGhs: number;
}

export interface TopProducts {
  bestSelling: TopProduct[];
  highMargin: TopProduct[];
  slowMoving: TopProduct[];
}

export interface AlertItem {
  id: string;
  alertType: string;
  severity: string;
  title: string;
  message: string;
}

export interface AlertSummary {
  totalOpen: number;
  countBySeverity: Record<string, number>;
  topAlerts: AlertItem[];
}

export interface RiskRecord {
  id: string;
  riskType: string;
  summary: string;
  recommendation: string | null;
  score: number | null;
  status: string;
}

export interface OpportunityRecord {
  id: string;
  opportunityType: string;
  summary: string;
  recommendation: string | null;
  score: number | null;
  status: string;
}

export interface DashboardSummary {
  revenue: RevenueSummary;
  profit: ProfitSummary;
  inventory: InventorySummary;
  shipments: ShipmentSummary;
  fx: FxSummary;
  topProducts: TopProducts;
  alerts: AlertSummary;
  risks: RiskRecord[];
  opportunities: OpportunityRecord[];
}

interface DashboardState {
  summary: DashboardSummary | null;
  lastFetched: Date | null;
  setSummary: (summary: DashboardSummary) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  summary: null,
  lastFetched: null,
  setSummary: (summary) => set({ summary, lastFetched: new Date() }),
}));
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/store/dashboard.store.ts
git commit -m "feat(dashboard): add dashboard Zustand store with typed DashboardSummary"
```

---

## Task 7: KpiCard Component

**Files:**
- Create: `mobile/src/components/KpiCard.tsx`

- [ ] **Step 1: Create the component**

```typescript
// mobile/src/components/KpiCard.tsx
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface KpiCardProps {
  label: string;
  value: string;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendPercent?: number;
  onPress?: () => void;
  color?: 'default' | 'warning' | 'danger' | 'success';
}

const TREND_COLORS = { up: '#16a34a', down: '#dc2626', neutral: '#6b7280' };
const CARD_BORDER = { default: '#e5e7eb', warning: '#fbbf24', danger: '#f87171', success: '#34d399' };

export default function KpiCard({
  label,
  value,
  subValue,
  trend,
  trendPercent,
  onPress,
  color = 'default',
}: KpiCardProps) {
  const trendArrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '';
  const trendColor = trend ? TREND_COLORS[trend] : '#6b7280';
  const borderColor = CARD_BORDER[color];

  const content = (
    <View style={[styles.card, { borderLeftColor: borderColor }]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {(subValue || (trend && trendPercent != null)) && (
        <View style={styles.footer}>
          {trend && trendPercent != null && (
            <Text style={[styles.trend, { color: trendColor }]}>
              {trendArrow} {Math.abs(trendPercent).toFixed(1)}%
            </Text>
          )}
          {subValue && <Text style={styles.subValue}>{subValue}</Text>}
        </View>
      )}
      {onPress && <Text style={styles.chevron}>›</Text>}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    position: 'relative',
  },
  label: { fontSize: 12, fontWeight: '500', color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trend: { fontSize: 12, fontWeight: '600' },
  subValue: { fontSize: 11, color: '#9ca3af' },
  chevron: { position: 'absolute', right: 12, top: '50%', fontSize: 20, color: '#9ca3af' },
});
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/components/KpiCard.tsx
git commit -m "feat(dashboard): add KpiCard component"
```

---

## Task 8: MiniChart Component

**Files:**
- Create: `mobile/src/components/MiniChart.tsx`

- [ ] **Step 1: Create the component using react-native-svg**

```typescript
// mobile/src/components/MiniChart.tsx
import { View } from 'react-native';
import Svg, { Rect, Polyline } from 'react-native-svg';

interface MiniChartProps {
  data: number[];
  type?: 'bar' | 'line';
  color?: string;
  height?: number;
  width?: number;
}

export default function MiniChart({
  data,
  type = 'bar',
  color = '#2563eb',
  height = 40,
  width = 80,
}: MiniChartProps) {
  if (!data || data.length === 0) return <View style={{ height, width }} />;

  const max = Math.max(...data, 1);
  const count = data.length;

  if (type === 'bar') {
    const barWidth = (width / count) * 0.7;
    const gap = (width / count) * 0.3;
    return (
      <Svg width={width} height={height}>
        {data.map((v, i) => {
          const barH = (v / max) * height;
          const x = i * (barWidth + gap);
          const y = height - barH;
          return <Rect key={i} x={x} y={y} width={barWidth} height={barH} rx={2} fill={color} opacity={0.85} />;
        })}
      </Svg>
    );
  }

  // line chart
  const stepX = count > 1 ? width / (count - 1) : width;
  const points = data
    .map((v, i) => {
      const x = i * stepX;
      const y = height - (v / max) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <Svg width={width} height={height}>
      <Polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/components/MiniChart.tsx
git commit -m "feat(dashboard): add MiniChart sparkline component using react-native-svg"
```

---

## Task 9: RiskPanel and OpportunityPanel Components

**Files:**
- Create: `mobile/src/components/RiskPanel.tsx`
- Create: `mobile/src/components/OpportunityPanel.tsx`

- [ ] **Step 1: Create RiskPanel**

```typescript
// mobile/src/components/RiskPanel.tsx
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RiskRecord } from '../store/dashboard.store';

const SEVERITY_COLORS: Record<string, string> = {
  high: '#dc2626',
  medium: '#f59e0b',
  low: '#22c55e',
};

interface RiskPanelProps {
  risks: RiskRecord[];
  onPress: (risk: RiskRecord) => void;
}

export default function RiskPanel({ risks, onPress }: RiskPanelProps) {
  if (risks.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No open risks</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {risks.slice(0, 3).map((risk) => {
        const severityColor = SEVERITY_COLORS[risk.riskType?.toLowerCase()] ?? '#6b7280';
        return (
          <TouchableOpacity key={risk.id} style={styles.card} onPress={() => onPress(risk)} activeOpacity={0.75}>
            <View style={[styles.indicator, { backgroundColor: severityColor }]} />
            <View style={styles.content}>
              <Text style={styles.title} numberOfLines={1}>{risk.summary}</Text>
              {risk.recommendation && (
                <Text style={styles.sub} numberOfLines={2}>{risk.recommendation}</Text>
              )}
            </View>
            {risk.score != null && (
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreText}>{Math.round(Number(risk.score))}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    gap: 10,
  },
  indicator: { width: 4, height: '100%', borderRadius: 2, minHeight: 40 },
  content: { flex: 1 },
  title: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 2 },
  sub: { fontSize: 12, color: '#6b7280', lineHeight: 16 },
  scoreBadge: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  scoreText: { fontSize: 12, fontWeight: '700', color: '#374151' },
  empty: { padding: 12 },
  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
});
```

- [ ] **Step 2: Create OpportunityPanel**

```typescript
// mobile/src/components/OpportunityPanel.tsx
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { OpportunityRecord } from '../store/dashboard.store';

interface OpportunityPanelProps {
  opportunities: OpportunityRecord[];
  onPress: (opp: OpportunityRecord) => void;
}

export default function OpportunityPanel({ opportunities, onPress }: OpportunityPanelProps) {
  if (opportunities.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No open opportunities</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {opportunities.slice(0, 3).map((opp) => (
        <TouchableOpacity key={opp.id} style={styles.card} onPress={() => onPress(opp)} activeOpacity={0.75}>
          <View style={styles.indicator} />
          <View style={styles.content}>
            <Text style={styles.title} numberOfLines={1}>{opp.summary}</Text>
            {opp.recommendation && (
              <Text style={styles.sub} numberOfLines={2}>{opp.recommendation}</Text>
            )}
          </View>
          {opp.score != null && (
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreText}>{Math.round(Number(opp.score))}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    gap: 10,
  },
  indicator: { width: 4, minHeight: 40, borderRadius: 2, backgroundColor: '#2563eb' },
  content: { flex: 1 },
  title: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 2 },
  sub: { fontSize: 12, color: '#6b7280', lineHeight: 16 },
  scoreBadge: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  scoreText: { fontSize: 12, fontWeight: '700', color: '#1d4ed8' },
  empty: { padding: 12 },
  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
});
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/RiskPanel.tsx mobile/src/components/OpportunityPanel.tsx
git commit -m "feat(dashboard): add RiskPanel and OpportunityPanel components"
```

---

## Task 10: Main Dashboard Screen

**Files:**
- Modify: `mobile/src/app/(app)/index.tsx` (replace entirely)

- [ ] **Step 1: Replace the placeholder home screen with the real dashboard**

```typescript
// mobile/src/app/(app)/index.tsx
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { dashboardApi } from '../../lib/api/dashboard.api';
import { useDashboardStore, DashboardSummary, RiskRecord, OpportunityRecord } from '../../store/dashboard.store';
import KpiCard from '../../components/KpiCard';
import RiskPanel from '../../components/RiskPanel';
import OpportunityPanel from '../../components/OpportunityPanel';

const DATE_FILTERS = [
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
  { label: 'All Time', value: 'all' },
];

function getDateRange(filter: string): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  if (filter === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      dateFrom: from.toISOString().split('T')[0],
      dateTo: now.toISOString().split('T')[0],
    };
  }
  if (filter === 'year') {
    return {
      dateFrom: `${now.getFullYear()}-01-01`,
      dateTo: now.toISOString().split('T')[0],
    };
  }
  return {};
}

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { summary: cached, setSummary } = useDashboardStore();
  const [summary, setSummaryLocal] = useState<DashboardSummary | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState('month');

  const load = useCallback(async (filter: string, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else if (!cached) setLoading(true);
      const params = getDateRange(filter);
      const res = await dashboardApi.getSummary(params);
      const data = (res.data as any).data as DashboardSummary;
      setSummary(data);
      setSummaryLocal(data);
    } catch {
      // silently fail — stale data stays visible
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cached, setSummary]);

  useEffect(() => {
    load(dateFilter);
  }, [dateFilter]);

  const onRefresh = () => load(dateFilter, true);

  const trend = (pct: number): 'up' | 'down' | 'neutral' =>
    pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral';

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const d = summary;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSubtitle}>Business performance overview</Text>
      </View>

      {/* Date Filter */}
      <View style={styles.filterRow}>
        {DATE_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.chip, dateFilter === f.value && styles.chipActive]}
            onPress={() => setDateFilter(f.value)}
          >
            <Text style={[styles.chipText, dateFilter === f.value && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Revenue + Profit */}
      <Section title="Revenue &amp; Profit">
        <View style={styles.row}>
          <View style={styles.half}>
            <KpiCard
              label="Today"
              value={`GHS ${fmt(d?.revenue.todayGhs ?? 0)}`}
              color="default"
              onPress={() => router.push('/dashboard/revenue' as never)}
            />
          </View>
          <View style={styles.half}>
            <KpiCard
              label="This Month"
              value={`GHS ${fmt(d?.revenue.thisMonthGhs ?? 0)}`}
              trend={trend(d?.revenue.monthOverMonthChange ?? 0)}
              trendPercent={d?.revenue.monthOverMonthChange}
              subValue="vs last month"
              color={trend(d?.revenue.monthOverMonthChange ?? 0) === 'up' ? 'success' : 'default'}
              onPress={() => router.push('/dashboard/revenue' as never)}
            />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.half}>
            <KpiCard
              label="Est. Gross Profit"
              value={`£${fmt(d?.profit.estimatedGrossProfit ?? 0)}`}
              subValue={`${fmt(d?.profit.estimatedGrossProfitMargin ?? 0, 1)}% margin`}
              color={
                (d?.profit.estimatedGrossProfit ?? 0) >= 0 ? 'success' : 'danger'
              }
            />
          </View>
          <View style={styles.half}>
            <KpiCard
              label="Est. GBP Revenue"
              value={`£${fmt(d?.revenue.thisMonthGbpEstimate ?? 0)}`}
              subValue="this month"
            />
          </View>
        </View>
      </Section>

      {/* Inventory */}
      <Section title="Inventory Health">
        <View style={styles.row}>
          <View style={styles.half}>
            <KpiCard
              label="Stock Value"
              value={`£${fmt(d?.inventory.totalStockValueGbp ?? 0)}`}
              onPress={() => router.push('/inventory' as never)}
            />
          </View>
          <View style={styles.half}>
            <KpiCard
              label="Low Stock"
              value={`${d?.inventory.lowStockCount ?? 0}`}
              subValue={`${d?.inventory.outOfStockCount ?? 0} out of stock`}
              color={
                (d?.inventory.lowStockCount ?? 0) > 0
                  ? (d?.inventory.outOfStockCount ?? 0) > 0
                    ? 'danger'
                    : 'warning'
                  : 'default'
              }
              onPress={() => router.push('/inventory' as never)}
            />
          </View>
        </View>
      </Section>

      {/* Shipments */}
      <Section title="Shipments">
        <View style={styles.row}>
          <View style={styles.half}>
            <KpiCard
              label="In Transit"
              value={`${d?.shipments.inTransitCount ?? 0}`}
              onPress={() => router.push('/dashboard/shipments' as never)}
            />
          </View>
          <View style={styles.half}>
            <KpiCard
              label="Delayed"
              value={`${d?.shipments.delayedCount ?? 0}`}
              color={(d?.shipments.delayedCount ?? 0) > 0 ? 'danger' : 'default'}
              onPress={() => router.push('/dashboard/shipments' as never)}
            />
          </View>
        </View>
        <KpiCard
          label="Avg Transit Time"
          value={`${d?.shipments.avgTransitDays ?? 0} days`}
          subValue={`Shipping cost: £${fmt(d?.shipments.shippingCostThisMonthGbp ?? 0)}`}
          onPress={() => router.push('/dashboard/shipments' as never)}
        />
      </Section>

      {/* FX */}
      <Section title="FX Impact">
        <KpiCard
          label="Realised FX Gain / Loss"
          value={`£${fmt(d?.fx.realisedFxGainLoss ?? 0, 2)}`}
          color={(d?.fx.realisedFxGainLoss ?? 0) >= 0 ? 'success' : 'danger'}
          subValue={`Unrealised GHS balance: ${fmt(d?.fx.unrealisedGhsBalance ?? 0)}`}
          onPress={() => router.push('/dashboard/fx' as never)}
        />
      </Section>

      {/* Top Products */}
      {(d?.topProducts.bestSelling.length ?? 0) > 0 && (
        <Section title="Best Sellers">
          {d!.topProducts.bestSelling.map((p) => (
            <View key={p.id} style={styles.productRow}>
              <Text style={styles.productName}>{p.name}</Text>
              <Text style={styles.productStat}>
                {fmt(p.totalQuantity)} units · GHS {fmt(p.totalRevenueGhs)}
              </Text>
            </View>
          ))}
          <TouchableOpacity onPress={() => router.push('/dashboard/products' as never)}>
            <Text style={styles.viewAll}>View all products →</Text>
          </TouchableOpacity>
        </Section>
      )}

      {/* Risks */}
      <Section title="Top Risks">
        <RiskPanel risks={d?.risks ?? []} onPress={() => {}} />
      </Section>

      {/* Opportunities */}
      <Section title="Opportunities">
        <OpportunityPanel opportunities={d?.opportunities ?? []} onPress={() => {}} />
      </Section>

      {/* Alerts */}
      {(d?.alerts.totalOpen ?? 0) > 0 && (
        <Section title="Active Alerts">
          <KpiCard
            label="Open Alerts"
            value={`${d?.alerts.totalOpen ?? 0}`}
            color="warning"
          />
        </Section>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 4 },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 12, fontWeight: '500', color: '#374151' },
  chipTextActive: { color: '#fff' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  half: { flex: 1 },
  productRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  productName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  productStat: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  viewAll: { marginTop: 10, fontSize: 13, color: '#2563eb', fontWeight: '600' },
});
```

- [ ] **Step 2: Run lint**

```bash
cd mobile && npm run lint
```

Fix any reported errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/app/(app)/index.tsx
git commit -m "feat(dashboard): replace placeholder home screen with real dashboard"
```

---

## Task 11: Update Tab Layout

**Files:**
- Modify: `mobile/src/app/(app)/_layout.tsx`

- [ ] **Step 1: Change "Home" tab to "Dashboard"**

In `mobile/src/app/(app)/_layout.tsx`, update the `index` tab:

```tsx
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="grid-outline" color={color} size={size} />
          ),
        }}
      />
```

Replace the existing block:
```tsx
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="home-outline" color={color} size={size} />
          ),
        }}
      />
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/app/(app)/_layout.tsx
git commit -m "feat(dashboard): update Home tab to Dashboard with grid-outline icon"
```

---

## Task 12: Revenue Drilldown Screen

**Files:**
- Create: `mobile/src/app/(app)/dashboard/revenue.tsx`

- [ ] **Step 1: Create the screen**

```typescript
// mobile/src/app/(app)/dashboard/revenue.tsx
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { dashboardApi } from '../../../lib/api/dashboard.api';
import MiniChart from '../../../components/MiniChart';

interface MonthlyRevenue {
  month: string;
  totalGhs: number;
  totalGbpEstimate: number;
  saleCount: number;
}

export default function RevenueDrilldownScreen() {
  const [data, setData] = useState<MonthlyRevenue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi
      .getRevenue()
      .then((res) => setData(((res.data as any).data as { monthly: MonthlyRevenue[] }).monthly))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const ghsValues = data.map((d) => d.totalGhs);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Revenue Trend — Last 6 Months</Text>

      <View style={styles.chartBox}>
        <MiniChart data={ghsValues} type="bar" color="#2563eb" height={80} width={320} />
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.cell, styles.headerCell]}>Month</Text>
          <Text style={[styles.cell, styles.headerCell, styles.right]}>GHS</Text>
          <Text style={[styles.cell, styles.headerCell, styles.right]}>GBP Est.</Text>
          <Text style={[styles.cell, styles.headerCell, styles.right]}>Sales</Text>
        </View>
        {data.map((row) => (
          <View key={row.month} style={styles.tableRow}>
            <Text style={styles.cell}>{row.month}</Text>
            <Text style={[styles.cell, styles.right]}>{row.totalGhs.toLocaleString()}</Text>
            <Text style={[styles.cell, styles.right]}>£{row.totalGbpEstimate.toFixed(0)}</Text>
            <Text style={[styles.cell, styles.right]}>{row.saleCount}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  chartBox: { backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 20 },
  table: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 10 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  cell: { flex: 1, fontSize: 13, color: '#374151' },
  headerCell: { fontWeight: '600', color: '#6b7280', fontSize: 12 },
  right: { textAlign: 'right' },
});
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/app/(app)/dashboard/revenue.tsx
git commit -m "feat(dashboard): add Revenue drilldown screen"
```

---

## Task 13: Shipments Drilldown Screen

**Files:**
- Create: `mobile/src/app/(app)/dashboard/shipments.tsx`

- [ ] **Step 1: Create the screen**

```typescript
// mobile/src/app/(app)/dashboard/shipments.tsx
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { dashboardApi } from '../../../lib/api/dashboard.api';

interface DelayedShipment {
  id: string;
  shipmentReference: string;
  expectedArrivalDate: string;
  carrierName: string | null;
  status: string;
}

interface StatusBreakdown {
  status: string;
  _count: { id: number };
}

interface ShipmentDrilldown {
  statusBreakdown: StatusBreakdown[];
  delayedShipments: DelayedShipment[];
  transitTimes: { days: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#9ca3af',
  packed: '#60a5fa',
  in_transit: '#f59e0b',
  received: '#22c55e',
  delayed: '#dc2626',
};

export default function ShipmentsDrilldownScreen() {
  const router = useRouter();
  const [data, setData] = useState<ShipmentDrilldown | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi
      .getShipments()
      .then((res) => setData((res.data as any).data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const avgTransit =
    data && data.transitTimes.length > 0
      ? Math.round(data.transitTimes.reduce((s, t) => s + t.days, 0) / data.transitTimes.length)
      : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Shipment Status</Text>

      {/* Status breakdown */}
      <View style={styles.card}>
        {data?.statusBreakdown.map((s) => (
          <View key={s.status} style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: STATUS_COLORS[s.status] ?? '#9ca3af' }]} />
            <Text style={styles.statusLabel}>{s.status.replace('_', ' ')}</Text>
            <Text style={styles.statusCount}>{s._count.id}</Text>
          </View>
        ))}
        <View style={styles.divider} />
        <Text style={styles.avgTransit}>Avg transit time: {avgTransit} days</Text>
      </View>

      {/* Delayed shipments */}
      {(data?.delayedShipments.length ?? 0) > 0 && (
        <>
          <Text style={styles.subheading}>Delayed Shipments</Text>
          {data!.delayedShipments.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={styles.shipmentCard}
              onPress={() => router.push(`/shipments/${s.id}` as never)}
            >
              <Text style={styles.shipRef}>{s.shipmentReference}</Text>
              <Text style={styles.shipDetail}>
                Expected: {new Date(s.expectedArrivalDate).toLocaleDateString()}
                {s.carrierName ? ` · ${s.carrierName}` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  subheading: { fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 20, marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { flex: 1, fontSize: 13, color: '#374151', textTransform: 'capitalize' },
  statusCount: { fontSize: 14, fontWeight: '700', color: '#111827' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 8 },
  avgTransit: { fontSize: 13, color: '#6b7280' },
  shipmentCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  shipRef: { fontSize: 13, fontWeight: '700', color: '#111827' },
  shipDetail: { fontSize: 12, color: '#6b7280', marginTop: 4 },
});
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/app/(app)/dashboard/shipments.tsx
git commit -m "feat(dashboard): add Shipments drilldown screen"
```

---

## Task 14: FX Impact Drilldown Screen

**Files:**
- Create: `mobile/src/app/(app)/dashboard/fx.tsx`

- [ ] **Step 1: Create the screen**

```typescript
// mobile/src/app/(app)/dashboard/fx.tsx
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { dashboardApi } from '../../../lib/api/dashboard.api';
import FxSummaryCard from '../../../components/FxSummaryCard';

interface FxData {
  realisedFxGainLoss: number;
  unrealisedGhsBalance: number;
  avgSaleRate: number;
  avgPurchaseRate: number;
}

export default function FxDrilldownScreen() {
  const [data, setData] = useState<FxData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi
      .getFx()
      .then((res) => setData((res.data as any).data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>FX Impact Detail</Text>

      <FxSummaryCard
        label="Realised FX Gain / Loss"
        gainLoss={data?.realisedFxGainLoss}
        targetCurrency="GBP"
      />

      <FxSummaryCard
        label="Unrealised GHS Balance"
        sourceAmount={data?.unrealisedGhsBalance}
        sourceCurrency="GHS"
        targetCurrency="GBP"
      />

      <View style={styles.rateCard}>
        <Text style={styles.rateTitle}>Average Rates</Text>
        <View style={styles.rateRow}>
          <Text style={styles.rateLabel}>Avg Sale Rate (GBP/GHS)</Text>
          <Text style={styles.rateValue}>{data?.avgSaleRate?.toFixed(6) ?? '—'}</Text>
        </View>
        <View style={styles.rateRow}>
          <Text style={styles.rateLabel}>Avg Purchase Rate (GBP/GHS)</Text>
          <Text style={styles.rateValue}>{data?.avgPurchaseRate?.toFixed(6) ?? '—'}</Text>
        </View>
      </View>

      <TouchableDetailLink label="View full FX history" route="/fx" />
    </ScrollView>
  );
}

function TouchableDetailLink({ label, route }: { label: string; route: string }) {
  const { useRouter } = require('expo-router');
  const router = useRouter();
  return (
    <Text style={styles.link} onPress={() => router.push(route as never)}>
      {label} →
    </Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  rateCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  rateTitle: { fontSize: 13, fontWeight: '600', color: '#6b7280', marginBottom: 10 },
  rateRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  rateLabel: { fontSize: 13, color: '#374151' },
  rateValue: { fontSize: 13, fontWeight: '700', color: '#111827' },
  link: { fontSize: 14, color: '#2563eb', fontWeight: '600', marginTop: 8 },
});
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/app/(app)/dashboard/fx.tsx
git commit -m "feat(dashboard): add FX impact drilldown screen"
```

---

## Task 15: Products Drilldown Screen

**Files:**
- Create: `mobile/src/app/(app)/dashboard/products.tsx`

- [ ] **Step 1: Create the screen**

```typescript
// mobile/src/app/(app)/dashboard/products.tsx
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { dashboardApi } from '../../../lib/api/dashboard.api';

interface ProductEntry {
  id: string;
  name: string;
  sku: string;
  totalQuantity: number;
  totalRevenueGhs: number;
}

interface TopProductsData {
  bestSelling: ProductEntry[];
  highMargin: ProductEntry[];
  slowMoving: ProductEntry[];
}

function ProductList({ products, label }: { products: ProductEntry[]; label: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{label}</Text>
      {products.length === 0 ? (
        <Text style={styles.empty}>No data</Text>
      ) : (
        products.map((p, i) => (
          <View key={p.id} style={styles.productRow}>
            <Text style={styles.rank}>#{i + 1}</Text>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{p.name}</Text>
              <Text style={styles.productSku}>{p.sku}</Text>
            </View>
            <View style={styles.productStats}>
              <Text style={styles.statValue}>{p.totalQuantity.toLocaleString()} units</Text>
              <Text style={styles.statSub}>GHS {p.totalRevenueGhs.toLocaleString()}</Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

export default function ProductsDrilldownScreen() {
  const [data, setData] = useState<TopProductsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi
      .getTopProducts()
      .then((res) => setData((res.data as any).data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Product Profitability</Text>
      <ProductList products={data?.bestSelling ?? []} label="Best Selling (by Quantity)" />
      <ProductList products={data?.highMargin ?? []} label="Best by Revenue" />
      <ProductList products={data?.slowMoving ?? []} label="Slowest Moving" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  empty: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 12 },
  productRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 10 },
  rank: { fontSize: 14, fontWeight: '700', color: '#9ca3af', width: 24 },
  productInfo: { flex: 1 },
  productName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  productSku: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  productStats: { alignItems: 'flex-end' },
  statValue: { fontSize: 13, fontWeight: '700', color: '#111827' },
  statSub: { fontSize: 11, color: '#6b7280', marginTop: 2 },
});
```

- [ ] **Step 2: Run final lint and tests**

```bash
cd backend && npm run lint && npm test
cd mobile && npm run lint
```

All tests should pass, no lint errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/app/(app)/dashboard/products.tsx
git commit -m "feat(dashboard): add Products profitability drilldown screen"
```

---

## Final Verification Checklist

- [ ] `GET /dashboard/summary` returns in <500ms with typical data volume
- [ ] All 8+ unit tests in `dashboard.service.spec.ts` pass
- [ ] Revenue figures exclude voided sales (status ≠ 'completed')
- [ ] Low stock count matches products where `quantity_available < minimum_stock_threshold`
- [ ] Delayed shipments count matches `expected_arrival_date < today AND actual_arrival_date IS NULL`
- [ ] Dashboard tab label reads "Dashboard" and shows grid-outline icon
- [ ] KpiCard tiles are tappable and navigate to the correct drilldown screen
- [ ] Pull to refresh updates all sections
- [ ] Stale data from store renders instantly while fresh data loads
- [ ] `npm test` passes (backend)
- [ ] `npm run lint` passes (backend and mobile)
