import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SalesService } from './sales.service';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { AuditService } from '../audit/audit.service';
import { LocationsService } from '../locations/locations.service';
import { ReceiptsService } from '../receipts/receipts.service';

const mockGhanaWarehouse = { id: 'gh-loc-1', name: 'Ghana Warehouse' };

const mockSale = {
  id: 'sale-1',
  saleReference: 'SALE-001',
  locationId: 'gh-loc-1',
  customerId: null,
  soldBy: 'user-1',
  currencyCode: 'GHS',
  subtotalGhs: 100,
  discountTotalGhs: 0,
  totalGhs: 100,
  notes: null,
  status: 'completed',
  createdAt: new Date(),
  saleDatetime: new Date(),
  items: [
    {
      id: 'si-1',
      saleId: 'sale-1',
      productId: 'product-1',
      quantity: 2,
      unitPriceGhs: 50,
      discountAmountGhs: 0,
      lineTotalGhs: 100,
    },
  ],
  payments: [{ id: 'pay-1', paymentMethod: 'cash', amountGhs: 100 }],
  receipts: [],
  fxRecords: [],
  customer: null,
};

const createDto = {
  locationId: 'gh-loc-1',
  items: [{ productId: 'product-1', quantity: 2, unitPriceGhs: 50 }],
  payments: [{ paymentMethod: 'cash', amountGhs: 100 }],
};

describe('SalesService', () => {
  let service: SalesService;
  let prisma: any;
  let inventoryService: any;
  let receiptsService: any;

  beforeEach(async () => {
    const mockPrisma: any = {
      $transaction: jest.fn((cb: (client: any) => any) => cb(mockPrisma)),
      sale: {
        findUnique: jest.fn().mockResolvedValue(mockSale),
        findMany: jest.fn().mockResolvedValue([mockSale]),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue(mockSale),
        update: jest.fn().mockResolvedValue({ ...mockSale, status: 'voided' }),
      },
      saleItem: {
        create: jest.fn().mockResolvedValue({ id: 'si-1' }),
      },
      salePayment: {
        create: jest.fn().mockResolvedValue({ id: 'pay-1' }),
      },
      fxRecord: {
        create: jest.fn().mockResolvedValue({ id: 'fx-1' }),
      },
      receipt: {
        create: jest.fn().mockResolvedValue({ id: 'rec-1', pdfUrl: null }),
      },
    };

    const mockInventoryService = {
      recordMovement: jest.fn().mockResolvedValue({ id: 'move-1' }),
    };

    const mockLocationsService = {
      getGhanaWarehouse: jest.fn().mockResolvedValue(mockGhanaWarehouse),
    };

    const mockAuditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const mockReceiptsService = {
      generate: jest
        .fn()
        .mockResolvedValue({ id: 'rec-1', pdfUrl: 'receipts/REC-123.pdf' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: InventoryService, useValue: mockInventoryService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: LocationsService, useValue: mockLocationsService },
        { provide: ReceiptsService, useValue: mockReceiptsService },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
    prisma = mockPrisma;
    inventoryService = mockInventoryService;
    receiptsService = mockReceiptsService;
  });

  describe('create()', () => {
    it('calls InventoryService.recordMovement with type sale_out for each line item', async () => {
      await service.create(createDto, 'user-1');

      expect(inventoryService.recordMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          movementType: 'sale_out',
          productId: 'product-1',
          quantity: 2,
          fromLocationId: mockGhanaWarehouse.id,
        }),
        expect.anything(),
      );
    });

    it('creates an fx_records row with event_type sale', async () => {
      await service.create({ ...createDto, fxRateAtSale: 15 }, 'user-1');

      expect(prisma.fxRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'sale',
            fromCurrency: 'GHS',
            toCurrency: 'GBP',
            exchangeRate: 15,
          }),
        }),
      );
    });

    it('creates a receipts row inside the transaction', async () => {
      await service.create(createDto, 'user-1');

      expect(prisma.receipt.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ saleId: mockSale.id }),
        }),
      );
    });

    it('triggers receipts.generate after the transaction completes', async () => {
      await service.create(createDto, 'user-1');

      // give the fire-and-forget a tick to execute
      await Promise.resolve();

      expect(receiptsService.generate).toHaveBeenCalledWith(
        mockSale.id,
        expect.any(Number),
        'user-1',
      );
    });

    it('does not throw if receipts.generate fails (fire-and-forget)', async () => {
      receiptsService.generate.mockRejectedValueOnce(new Error('S3 error'));

      await expect(service.create(createDto, 'user-1')).resolves.not.toThrow();
    });
  });

  describe('void()', () => {
    it('calls InventoryService.recordMovement with type return_in for each line item', async () => {
      await service.void('sale-1', { reason: 'mistake' }, 'user-1');

      expect(inventoryService.recordMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          movementType: 'return_in',
          productId: 'product-1',
          toLocationId: mockGhanaWarehouse.id,
        }),
        expect.anything(),
      );
    });

    it('sets sale status to voided', async () => {
      await service.void('sale-1', { reason: 'mistake' }, 'user-1');

      expect(prisma.sale.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sale-1' },
          data: expect.objectContaining({ status: 'voided' }),
        }),
      );
    });

    it('throws ConflictException when the sale is already voided', async () => {
      prisma.sale.findUnique.mockResolvedValue({
        ...mockSale,
        status: 'voided',
      });

      await expect(
        service.void('sale-1', { reason: 'test' }, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when the sale does not exist', async () => {
      prisma.sale.findUnique.mockResolvedValue(null);

      await expect(
        service.void('nonexistent', { reason: 'test' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
