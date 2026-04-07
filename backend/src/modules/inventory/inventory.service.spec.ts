import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LocationsService } from '../locations/locations.service';

const makeBalance = (overrides = {}) => ({
  id: 'balance-1',
  productId: 'product-1',
  locationId: 'location-1',
  quantityOnHand: 100,
  quantityAllocated: 0,
  quantityAvailable: 100,
  ...overrides,
});

const makeMovement = (overrides = {}) => ({
  id: 'movement-1',
  productId: 'product-1',
  batchId: null,
  movementType: 'purchase_in',
  quantity: 10,
  fromLocationId: null,
  toLocationId: 'location-1',
  referenceType: null,
  referenceId: null,
  movementDate: new Date(),
  notes: null,
  createdBy: 'user-1',
  ...overrides,
});

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: any;
  let audit: any;
  let locations: any;

  beforeEach(async () => {
    const mockPrisma: any = {
      $transaction: jest.fn((cb: (client: any) => any) => cb(mockPrisma)),
      inventoryMovement: {
        create: jest.fn().mockResolvedValue(makeMovement()),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      inventoryBalance: {
        findUnique: jest.fn().mockResolvedValue(makeBalance()),
        upsert: jest.fn().mockResolvedValue(makeBalance()),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const mockAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const mockLocations = {
      findById: jest.fn().mockResolvedValue({ id: 'location-1', name: 'Test Location' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: LocationsService, useValue: mockLocations },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    prisma = mockPrisma;
    audit = mockAudit;
    locations = mockLocations;
  });

  describe('recordMovement', () => {
    it('inserts a row into inventory_movements with correct fields', async () => {
      const params = {
        productId: 'product-1',
        movementType: 'purchase_in',
        quantity: 10,
        toLocationId: 'location-1',
        createdBy: 'user-1',
        notes: 'Test movement',
      };

      await service.recordMovement(params);

      expect(prisma.inventoryMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            productId: 'product-1',
            movementType: 'purchase_in',
            quantity: 10,
            toLocationId: 'location-1',
            createdBy: 'user-1',
            notes: 'Test movement',
          }),
        }),
      );
    });

    it('upserts inventory_balances for the target location inside the same transaction', async () => {
      const params = {
        productId: 'product-1',
        movementType: 'purchase_in',
        quantity: 10,
        toLocationId: 'location-1',
        createdBy: 'user-1',
      };

      await service.recordMovement(params);

      expect(prisma.inventoryBalance.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { productId_locationId: { productId: 'product-1', locationId: 'location-1' } },
        }),
      );
    });

    it('throws ConflictException when deducting more than quantity_available and allowNegative is false', async () => {
      prisma.inventoryBalance.findUnique.mockResolvedValue(makeBalance({ quantityAvailable: 5 }));

      await expect(
        service.recordMovement({
          productId: 'product-1',
          movementType: 'sale_out',
          quantity: 10,
          fromLocationId: 'location-1',
          createdBy: 'user-1',
          allowNegative: false,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('allows deduction below zero when allowNegative is true', async () => {
      prisma.inventoryBalance.findUnique.mockResolvedValue(makeBalance({ quantityAvailable: 5 }));

      await expect(
        service.recordMovement({
          productId: 'product-1',
          movementType: 'sale_out',
          quantity: 10,
          fromLocationId: 'location-1',
          createdBy: 'user-1',
          allowNegative: true,
        }),
      ).resolves.not.toThrow();
    });

    it('allocate_shipment decrements quantity_available but NOT quantity_on_hand', async () => {
      prisma.inventoryBalance.findUnique.mockResolvedValue(makeBalance({ quantityAvailable: 50 }));

      await service.recordMovement({
        productId: 'product-1',
        movementType: 'allocate_shipment',
        quantity: 10,
        fromLocationId: 'location-1',
        createdBy: 'user-1',
      });

      const upsertCall = prisma.inventoryBalance.upsert.mock.calls[0][0];
      const updateData = upsertCall.update;

      // quantityAllocated should be incremented
      expect(updateData.quantityAllocated).toEqual({ increment: 10 });
      // quantityAvailable should be decremented
      expect(updateData.quantityAvailable).toEqual({ decrement: 10 });
      // quantityOnHand should NOT be decremented
      expect(updateData.quantityOnHand).toBeUndefined();
    });

    it('purchase_in increments both quantity_on_hand and quantity_available', async () => {
      await service.recordMovement({
        productId: 'product-1',
        movementType: 'purchase_in',
        quantity: 20,
        toLocationId: 'location-1',
        createdBy: 'user-1',
      });

      const upsertCall = prisma.inventoryBalance.upsert.mock.calls[0][0];
      const updateData = upsertCall.update;

      expect(updateData.quantityOnHand).toEqual({ increment: 20 });
      expect(updateData.quantityAvailable).toEqual({ increment: 20 });
    });

    it('uses passed-in tx client instead of opening new $transaction when tx is provided', async () => {
      const txClient = {
        inventoryMovement: { create: jest.fn().mockResolvedValue({ id: 'move-1' }) },
        inventoryBalance: {
          findUnique: jest.fn().mockResolvedValue({ quantityAvailable: new Prisma.Decimal(100) }),
          upsert: jest.fn().mockResolvedValue({}),
        },
      } as unknown as Prisma.TransactionClient;

      await service.recordMovement(
        { productId: 'p1', movementType: 'dispatch', quantity: 5, fromLocationId: 'loc-1', createdBy: 'u1' },
        txClient,
      );

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(txClient.inventoryBalance.upsert).toHaveBeenCalled();
      expect(txClient.inventoryBalance.findUnique).toHaveBeenCalled();
    });
  });

  describe('createAdjustment', () => {
    it('calls AuditService.log() with correct adjustment details', async () => {
      const dto = {
        productId: 'product-1',
        locationId: 'location-1',
        adjustmentType: 'add' as const,
        quantity: 5,
        reason: 'Stock count correction',
        notes: 'End of month audit',
      };

      await service.createAdjustment(dto, 'user-1');

      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          actionType: 'inventory_adjustment',
          entityType: 'inventory',
          entityId: 'product-1',
          afterJson: expect.objectContaining({
            adjustmentType: 'add',
            quantity: 5,
            reason: 'Stock count correction',
          }),
        }),
      );
    });
  });
});
