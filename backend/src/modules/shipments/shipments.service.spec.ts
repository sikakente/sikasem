import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { AuditService } from '../audit/audit.service';
import { LocationsService } from '../locations/locations.service';

const mockShipment = {
  id: 'ship-1',
  shipmentReference: 'SHP-001',
  shipmentName: 'Test Shipment',
  originLocationId: 'uk-loc-1',
  destinationLocationId: 'gh-loc-1',
  carrierName: 'DHL',
  trackingNumber: 'TRACK123',
  packedDate: null,
  dispatchDate: null,
  expectedArrivalDate: null,
  actualArrivalDate: null,
  status: 'draft',
  notes: null,
  createdBy: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [
    {
      id: 'item-1',
      shipmentId: 'ship-1',
      productId: 'product-1',
      batchId: null,
      quantity: 10,
      sourcePurchaseItemId: null,
      notes: null,
    },
    {
      id: 'item-2',
      shipmentId: 'ship-1',
      productId: 'product-2',
      batchId: null,
      quantity: 5,
      sourcePurchaseItemId: null,
      notes: null,
    },
  ],
};

const mockVirtualLocation = {
  id: 'virtual-loc-1',
  name: 'SHP-001',
  locationType: 'shipment',
  country: 'UK',
  isActive: true,
};

describe('ShipmentsService', () => {
  let service: ShipmentsService;
  let prisma: any;
  let inventoryService: any;
  let _auditService: any;

  beforeEach(async () => {
    const mockPrisma: any = {
      $transaction: jest.fn((cb: (client: any) => any) => cb(mockPrisma)),
      shipment: {
        findUnique: jest.fn().mockResolvedValue(mockShipment),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue(mockShipment),
        update: jest.fn().mockResolvedValue(mockShipment),
      },
      shipmentItem: {
        findUnique: jest.fn().mockResolvedValue(mockShipment.items[0]),
        create: jest.fn().mockResolvedValue(mockShipment.items[0]),
        delete: jest.fn().mockResolvedValue(mockShipment.items[0]),
      },
      shipmentStatusHistory: {
        create: jest.fn().mockResolvedValue({ id: 'hist-1', status: 'draft' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      shipmentCost: {
        create: jest.fn().mockResolvedValue({ id: 'cost-1' }),
        findMany: jest.fn().mockResolvedValue([]),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amountGbp: 0 } }),
      },
      location: {
        create: jest.fn().mockResolvedValue(mockVirtualLocation),
        findFirst: jest.fn().mockResolvedValue(mockVirtualLocation),
      },
    };

    const mockInventoryService = {
      recordMovement: jest.fn().mockResolvedValue({ id: 'move-1' }),
    };

    const mockLocationsService = {
      getUkWarehouse: jest
        .fn()
        .mockResolvedValue({ id: 'uk-loc-1', name: 'UK Warehouse' }),
    };

    const mockAuditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShipmentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: InventoryService, useValue: mockInventoryService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: LocationsService, useValue: mockLocationsService },
      ],
    }).compile();

    service = module.get<ShipmentsService>(ShipmentsService);
    prisma = mockPrisma;
    inventoryService = mockInventoryService;
    _auditService = mockAuditService;
  });

  describe('create()', () => {
    it('also inserts a locations row of type shipment for the virtual transit location', async () => {
      await service.create(
        {
          shipmentReference: 'SHP-001',
          originLocationId: 'uk-loc-1',
          destinationLocationId: 'gh-loc-1',
        },
        'user-1',
      );

      expect(prisma.location.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            locationType: 'shipment',
            name: 'SHP-001',
          }),
        }),
      );
    });

    it('inserts an initial shipment_status_history row with status draft', async () => {
      await service.create(
        {
          shipmentReference: 'SHP-001',
          originLocationId: 'uk-loc-1',
          destinationLocationId: 'gh-loc-1',
        },
        'user-1',
      );

      expect(prisma.shipmentStatusHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'draft',
          }),
        }),
      );
    });
  });

  describe('addItem()', () => {
    it('calls InventoryService.recordMovement with type allocate_shipment', async () => {
      prisma.shipment.findUnique.mockResolvedValue(mockShipment);
      prisma.location.findFirst.mockResolvedValue(mockVirtualLocation);

      await service.addItem(
        'ship-1',
        { productId: 'product-1', quantity: 5 },
        'user-1',
      );

      expect(inventoryService.recordMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          movementType: 'allocate_shipment',
          productId: 'product-1',
          quantity: 5,
          fromLocationId: 'uk-loc-1',
        }),
        expect.anything(),
      );
    });

    it('throws ConflictException when the product has insufficient available stock', async () => {
      prisma.shipment.findUnique.mockResolvedValue(mockShipment);
      prisma.location.findFirst.mockResolvedValue(mockVirtualLocation);
      inventoryService.recordMovement.mockRejectedValueOnce(
        new ConflictException('Insufficient stock'),
      );

      await expect(
        service.addItem(
          'ship-1',
          { productId: 'product-1', quantity: 9999 },
          'user-1',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when called on a dispatched shipment', async () => {
      prisma.shipment.findUnique.mockResolvedValue({
        ...mockShipment,
        status: 'dispatched',
      });

      await expect(
        service.addItem(
          'ship-1',
          { productId: 'product-1', quantity: 5 },
          'user-1',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('removeItem()', () => {
    it('calls InventoryService.recordMovement to reverse the allocation', async () => {
      const item = { ...mockShipment.items[0], quantity: 10 };
      prisma.shipment.findUnique.mockResolvedValue(mockShipment);
      prisma.shipmentItem.findUnique.mockResolvedValue(item);

      await service.removeItem('ship-1', 'item-1', 'user-1');

      expect(inventoryService.recordMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          movementType: 'adjust_in',
          productId: item.productId,
          toLocationId: 'uk-loc-1',
        }),
        expect.anything(),
      );
    });

    it('throws ConflictException when the shipment has already been dispatched', async () => {
      prisma.shipment.findUnique.mockResolvedValue({
        ...mockShipment,
        status: 'dispatched',
      });
      prisma.shipmentItem.findUnique.mockResolvedValue(mockShipment.items[0]);

      await expect(
        service.removeItem('ship-1', 'item-1', 'user-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('dispatch()', () => {
    it('calls InventoryService.recordMovement with type dispatch for each item', async () => {
      prisma.shipment.findUnique.mockResolvedValue(mockShipment);
      prisma.location.findFirst.mockResolvedValue(mockVirtualLocation);

      await service.dispatch('ship-1', 'user-1');

      expect(inventoryService.recordMovement).toHaveBeenCalledTimes(
        mockShipment.items.length,
      );

      for (const item of mockShipment.items) {
        expect(inventoryService.recordMovement).toHaveBeenCalledWith(
          expect.objectContaining({
            movementType: 'dispatch',
            productId: item.productId,
            fromLocationId: 'uk-loc-1',
            toLocationId: mockVirtualLocation.id,
          }),
          expect.anything(),
        );
      }
    });

    it('updates the shipment status to dispatched and inserts a status history row', async () => {
      prisma.shipment.findUnique.mockResolvedValue(mockShipment);
      prisma.location.findFirst.mockResolvedValue(mockVirtualLocation);

      await service.dispatch('ship-1', 'user-1');

      expect(prisma.shipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ship-1' },
          data: expect.objectContaining({ status: 'dispatched' }),
        }),
      );

      expect(prisma.shipmentStatusHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'dispatched' }),
        }),
      );
    });

    it('throws ConflictException when the current status is not draft or packed', async () => {
      prisma.shipment.findUnique.mockResolvedValue({
        ...mockShipment,
        status: 'dispatched',
      });

      await expect(service.dispatch('ship-1', 'user-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws NotFoundException when the shipment does not exist', async () => {
      prisma.shipment.findUnique.mockResolvedValue(null);

      await expect(service.dispatch('nonexistent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
