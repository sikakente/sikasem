import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FxService } from './fx.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const mockFxRecordSale = {
  id: 'fx-sale-1',
  eventType: 'sale',
  referenceType: 'sale',
  referenceId: 'sale-1',
  fromCurrency: 'GHS',
  toCurrency: 'GBP',
  exchangeRate: new Prisma.Decimal('0.065'),
  sourceAmount: new Prisma.Decimal('1000.00'),
  targetAmount: new Prisma.Decimal('65.00'),
  eventDatetime: new Date('2024-03-01'),
  notes: null,
  saleId: 'sale-1',
};

const mockFxRecordPurchase = {
  id: 'fx-purchase-1',
  eventType: 'purchase',
  referenceType: 'purchase_item',
  referenceId: 'pi-1',
  fromCurrency: 'GBP',
  toCurrency: 'GHS',
  exchangeRate: new Prisma.Decimal('0.063'),
  sourceAmount: new Prisma.Decimal('500.00'),
  targetAmount: new Prisma.Decimal('7936.51'),
  eventDatetime: new Date('2024-02-15'),
  notes: null,
  saleId: null,
};

const mockConversion = {
  id: 'conv-1',
  conversionReference: 'CONV-123456',
  conversionDate: new Date('2024-03-05'),
  sourceCurrency: 'GHS',
  sourceAmount: new Prisma.Decimal('800.00'),
  destinationCurrency: 'GBP',
  destinationAmount: new Prisma.Decimal('52.00'),
  exchangeRate: new Prisma.Decimal('0.065'),
  feesGbp: new Prisma.Decimal('1.00'),
  notes: null,
  createdBy: 'user-1',
  createdAt: new Date(),
  saleLinks: [],
  createdByUser: { id: 'user-1', email: 'admin@example.com' },
  _count: { saleLinks: 0 },
};

describe('FxService', () => {
  let service: FxService;
  let prisma: any;
  let _auditService: any;

  beforeEach(async () => {
    const mockPrisma: any = {
      $transaction: jest.fn((cb: (client: any) => any) => cb(mockPrisma)),
      fxRecord: {
        findMany: jest.fn().mockResolvedValue([mockFxRecordSale]),
        findUnique: jest.fn().mockResolvedValue(mockFxRecordSale),
        findFirst: jest.fn().mockResolvedValue(mockFxRecordSale),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue({ id: 'fx-conv-1' }),
      },
      cashConversion: {
        findMany: jest.fn().mockResolvedValue([mockConversion]),
        findUnique: jest.fn().mockResolvedValue(mockConversion),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue(mockConversion),
      },
      cashConversionSaleLink: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    const mockAuditService = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FxService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<FxService>(FxService);
    prisma = module.get(PrismaService);
    _auditService = module.get(AuditService);
  });

  // ─── createConversion ───────────────────────────────────────────────────────

  describe('createConversion', () => {
    const dto = {
      conversionDate: '2024-03-05',
      sourceAmountGhs: 800,
      exchangeRate: 0.065,
      destinationAmountGbp: 52,
      feesGbp: 1,
      notes: 'Test conversion',
    };

    it('creates a cash_conversions row', async () => {
      await service.createConversion(dto, 'user-1');
      expect(prisma.cashConversion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sourceCurrency: 'GHS',
            destinationCurrency: 'GBP',
            createdBy: 'user-1',
          }),
        }),
      );
    });

    it('creates an fx_records row with eventType conversion', async () => {
      await service.createConversion(dto, 'user-1');
      expect(prisma.fxRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'conversion',
            referenceType: 'cash_conversion',
            fromCurrency: 'GHS',
            toCurrency: 'GBP',
          }),
        }),
      );
    });

    it('stores exchange rate as GBP-per-GHS (rate < 1 for typical values)', async () => {
      await service.createConversion(dto, 'user-1');
      const callArgs = prisma.fxRecord.create.mock.calls[0][0];
      const rate = Number(callArgs.data.exchangeRate);
      expect(rate).toBeLessThan(1);
      expect(rate).toBeCloseTo(0.065, 5);
    });

    it('creates sale_links when saleLinks provided', async () => {
      const dtoWithLinks = {
        ...dto,
        saleLinks: [{ saleId: 'sale-1', amountGhsAllocated: 800 }],
      };
      await service.createConversion(dtoWithLinks, 'user-1');
      expect(prisma.cashConversionSaleLink.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              saleId: 'sale-1',
              cashConversionId: mockConversion.id,
            }),
          ]),
        }),
      );
    });

    it('does not create sale_links when saleLinks is absent', async () => {
      await service.createConversion(dto, 'user-1');
      expect(prisma.cashConversionSaleLink.createMany).not.toHaveBeenCalled();
    });

    it('runs inside a $transaction so both rows roll back on failure', async () => {
      prisma.fxRecord.create.mockRejectedValueOnce(new Error('DB error'));
      await expect(service.createConversion(dto, 'user-1')).rejects.toThrow(
        'DB error',
      );
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  // ─── getSummary ─────────────────────────────────────────────────────────────

  describe('getSummary', () => {
    it('calculates realisedFxGainLoss as totalGbpReceived - totalExpectedGbpFromSales', async () => {
      // sale fx: 1000 GHS → 65 GBP expected
      prisma.fxRecord.findMany
        .mockResolvedValueOnce([mockFxRecordPurchase]) // purchase records
        .mockResolvedValueOnce([mockFxRecordSale]) // sale records
        .mockResolvedValueOnce([mockFxRecordPurchase, mockFxRecordSale]); // period breakdown all fx

      // conversion: 800 GHS → 52 GBP actual
      prisma.cashConversion.findMany
        .mockResolvedValueOnce([mockConversion]) // conversion totals
        .mockResolvedValueOnce([mockConversion]); // period breakdown all conversions

      const result = await service.getSummary({});
      // expectedGbp = 65 (from sale targetAmount), actualGbp = 52 (from conversion destinationAmount)
      expect(result.realisedFxGainLoss).toBeCloseTo(52 - 65, 5);
    });

    it('calculates unrealisedGhsBalance as totalGhsSales - totalGhsConverted', async () => {
      prisma.fxRecord.findMany
        .mockResolvedValueOnce([mockFxRecordPurchase])
        .mockResolvedValueOnce([mockFxRecordSale])
        .mockResolvedValueOnce([mockFxRecordPurchase, mockFxRecordSale]);

      prisma.cashConversion.findMany
        .mockResolvedValueOnce([mockConversion])
        .mockResolvedValueOnce([mockConversion]);

      const result = await service.getSummary({});
      // totalGhsSales = 1000, totalGhsConverted = 800
      expect(result.unrealisedGhsBalance).toBeCloseTo(1000 - 800, 5);
    });

    it('scopes results to the provided dateFrom/dateTo range', async () => {
      prisma.fxRecord.findMany.mockResolvedValue([]);
      prisma.cashConversion.findMany.mockResolvedValue([]);

      await service.getSummary({
        dateFrom: '2024-01-01',
        dateTo: '2024-03-31',
      });

      expect(prisma.fxRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            eventType: 'purchase',
            eventDatetime: expect.objectContaining({
              gte: new Date('2024-01-01'),
              lte: new Date('2024-03-31'),
            }),
          }),
        }),
      );
    });

    it('returns a periodBreakdown array with one entry per calendar month', async () => {
      prisma.fxRecord.findMany.mockResolvedValue([]);
      prisma.cashConversion.findMany.mockResolvedValue([]);

      const result = await service.getSummary({
        dateFrom: '2024-01-01',
        dateTo: '2024-03-31',
      });

      expect(result.periodBreakdown).toHaveLength(3);
      expect(result.periodBreakdown[0].month).toBe('2024-01');
      expect(result.periodBreakdown[1].month).toBe('2024-02');
      expect(result.periodBreakdown[2].month).toBe('2024-03');
    });
  });

  // ─── getLatestSaleRate ──────────────────────────────────────────────────────

  describe('getLatestSaleRate', () => {
    it('returns the exchangeRate from the most recent sale fx_records row', async () => {
      prisma.fxRecord.findFirst.mockResolvedValue(mockFxRecordSale);
      const result = await service.getLatestSaleRate();
      expect(result.exchangeRate).toBeCloseTo(0.065, 5);
    });

    it('queries with eventType = sale and orders by eventDatetime desc', async () => {
      await service.getLatestSaleRate();
      expect(prisma.fxRecord.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventType: 'sale' },
          orderBy: { eventDatetime: 'desc' },
        }),
      );
    });

    it('returns null exchangeRate when no sale records exist', async () => {
      prisma.fxRecord.findFirst.mockResolvedValue(null);
      const result = await service.getLatestSaleRate();
      expect(result.exchangeRate).toBeNull();
    });
  });

  // ─── findById ───────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('throws NotFoundException when record not found', async () => {
      prisma.fxRecord.findUnique.mockResolvedValue(null);
      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the fx record when found', async () => {
      prisma.fxRecord.findUnique.mockResolvedValue({
        ...mockFxRecordSale,
        sale: { id: 'sale-1', totalGhs: new Prisma.Decimal('100') },
      });
      const result = await service.findById('fx-sale-1');
      expect(result.id).toBe('fx-sale-1');
    });
  });
});
