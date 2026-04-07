import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PurchasingService } from './purchasing.service';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { AuditService } from '../audit/audit.service';
import { LocationsService } from '../locations/locations.service';

const mockPurchaseOrder = {
  id: 'po-1',
  referenceNo: 'PO-123456',
  supplierId: 'supplier-1',
  purchaseDate: new Date('2024-01-15'),
  status: 'draft',
  notes: null,
  createdBy: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [
    {
      id: 'item-1',
      purchaseOrderId: 'po-1',
      productId: 'product-1',
      quantity: 10,
      unitCostGbp: 5.0,
      totalCostGbp: 50.0,
      fxRatePurchase: 1.25,
      totalCostGhsEquivalent: 62.5,
      expiryDate: null,
      batchReference: null,
      notes: null,
    },
    {
      id: 'item-2',
      purchaseOrderId: 'po-1',
      productId: 'product-2',
      quantity: 20,
      unitCostGbp: 3.0,
      totalCostGbp: 60.0,
      fxRatePurchase: 1.25,
      totalCostGhsEquivalent: 75.0,
      expiryDate: null,
      batchReference: null,
      notes: null,
    },
  ],
};

describe('PurchasingService', () => {
  let service: PurchasingService;
  let prisma: any;
  let inventoryService: any;
  let locationsService: any;
  let auditService: any;

  beforeEach(async () => {
    const mockPrisma: any = {
      $transaction: jest.fn((cb: (client: any) => any) => cb(mockPrisma)),
      purchaseOrder: {
        findUnique: jest.fn().mockResolvedValue(mockPurchaseOrder),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue(mockPurchaseOrder),
        update: jest.fn().mockResolvedValue({ ...mockPurchaseOrder, status: 'confirmed' }),
      },
      purchaseOrderItem: {
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      fxRecord: {
        create: jest.fn().mockResolvedValue({ id: 'fx-1' }),
      },
    };

    const mockInventoryService = {
      recordMovement: jest.fn().mockResolvedValue({ id: 'move-1' }),
    };

    const mockLocationsService = {
      getUkWarehouse: jest.fn().mockResolvedValue({ id: 'uk-loc-1', name: 'UK Warehouse' }),
    };

    const mockAuditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchasingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: InventoryService, useValue: mockInventoryService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: LocationsService, useValue: mockLocationsService },
      ],
    }).compile();

    service = module.get<PurchasingService>(PurchasingService);
    prisma = mockPrisma;
    inventoryService = mockInventoryService;
    locationsService = mockLocationsService;
    auditService = mockAuditService;
  });

  it('confirm() calls InventoryService.recordMovement() once per purchase order item with movementType purchase_in', async () => {
    await service.confirm('po-1', 'user-1');

    expect(inventoryService.recordMovement).toHaveBeenCalledTimes(mockPurchaseOrder.items.length);

    for (const item of mockPurchaseOrder.items) {
      expect(inventoryService.recordMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          movementType: 'purchase_in',
          productId: item.productId,
          toLocationId: 'uk-loc-1',
        }),
        expect.anything(),
      );
    }
  });

  it('confirm() creates an fx_records row for each item with eventType purchase', async () => {
    await service.confirm('po-1', 'user-1');

    expect(prisma.fxRecord.create).toHaveBeenCalledTimes(mockPurchaseOrder.items.length);

    for (const item of mockPurchaseOrder.items) {
      expect(prisma.fxRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'purchase',
            referenceType: 'purchase_order_item',
            referenceId: item.id,
            fromCurrency: 'GBP',
            toCurrency: 'GHS',
          }),
        }),
      );
    }
  });

  it('confirm() updates purchase_orders.status to confirmed', async () => {
    await service.confirm('po-1', 'user-1');

    expect(prisma.purchaseOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'po-1' },
        data: expect.objectContaining({ status: 'confirmed' }),
      }),
    );
  });

  it('confirm() rolls back the entire transaction if any step fails', async () => {
    inventoryService.recordMovement.mockRejectedValueOnce(new Error('DB error'));

    // Make $transaction actually throw when the callback throws
    prisma.$transaction.mockImplementationOnce(async (cb: (client: any) => any) => {
      return cb(prisma);
    });

    await expect(service.confirm('po-1', 'user-1')).rejects.toThrow('DB error');

    // The update should not have been called since error occurred during recordMovement
    expect(prisma.purchaseOrder.update).not.toHaveBeenCalled();
  });

  it('confirm() throws ConflictException when called on an already-confirmed order', async () => {
    prisma.purchaseOrder.findUnique.mockResolvedValueOnce({
      ...mockPurchaseOrder,
      status: 'confirmed',
    });

    await expect(service.confirm('po-1', 'user-1')).rejects.toThrow(ConflictException);
  });
});
