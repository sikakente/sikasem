import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FxService } from '../fx/fx.service';

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
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      prisma.sale.aggregate
        .mockResolvedValueOnce(makeSaleAggregate(0))    // today
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
