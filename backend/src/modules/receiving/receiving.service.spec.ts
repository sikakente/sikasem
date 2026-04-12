import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ReceivingService } from './receiving.service';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { AuditService } from '../audit/audit.service';
import { LocationsService } from '../locations/locations.service';

const mockVirtualLocation = {
  id: 'virtual-loc-1',
  name: 'SHP-001',
  locationType: 'shipment',
};

const mockGhanaWarehouse = { id: 'gh-loc-1', name: 'Ghana Warehouse' };

const mockShipment = {
  id: 'ship-1',
  shipmentReference: 'SHP-001',
  status: 'dispatched',
  items: [
    {
      id: 'si-1',
      productId: 'product-1',
      quantity: 10,
      batchId: null,
    },
    {
      id: 'si-2',
      productId: 'product-2',
      quantity: 5,
      batchId: null,
    },
  ],
};

const mockRecord = {
  id: 'rec-1',
  shipmentId: 'ship-1',
  receivedLocationId: 'gh-loc-1',
  receivedDate: new Date('2026-04-12'),
  notes: null,
  status: 'partial',
  receivedBy: 'user-1',
  createdAt: new Date(),
  shipment: mockShipment,
  items: [
    {
      id: 'ri-1',
      receivingRecordId: 'rec-1',
      shipmentItemId: 'si-1',
      productId: 'product-1',
      expectedQuantity: 10,
      receivedQuantity: 8,
      damagedQuantity: 1,
      lostQuantity: 1,
      notes: null,
    },
    {
      id: 'ri-2',
      receivingRecordId: 'rec-1',
      shipmentItemId: 'si-2',
      productId: 'product-2',
      expectedQuantity: 5,
      receivedQuantity: 5,
      damagedQuantity: 0,
      lostQuantity: 0,
      notes: null,
    },
  ],
};

describe('ReceivingService', () => {
  let service: ReceivingService;
  let prisma: any;
  let inventoryService: any;
  let locationsService: any;

  beforeEach(async () => {
    const mockPrisma: any = {
      $transaction: jest.fn((cb: (client: any) => any) => cb(mockPrisma)),
      shipment: {
        findUnique: jest.fn().mockResolvedValue(mockShipment),
        findMany: jest.fn().mockResolvedValue([mockShipment]),
        update: jest
          .fn()
          .mockResolvedValue({ ...mockShipment, status: 'received' }),
      },
      receivingRecord: {
        findUnique: jest.fn().mockResolvedValue(mockRecord),
        findMany: jest.fn().mockResolvedValue([mockRecord]),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue(mockRecord),
        update: jest
          .fn()
          .mockResolvedValue({ ...mockRecord, status: 'completed' }),
      },
      receivingItem: {
        update: jest.fn().mockResolvedValue(mockRecord.items[0]),
      },
      location: {
        findFirst: jest.fn().mockResolvedValue(mockVirtualLocation),
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceivingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: InventoryService, useValue: mockInventoryService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: LocationsService, useValue: mockLocationsService },
      ],
    }).compile();

    service = module.get<ReceivingService>(ReceivingService);
    prisma = mockPrisma;
    inventoryService = mockInventoryService;
    locationsService = mockLocationsService;
  });

  describe('getQueue()', () => {
    it('queries shipments with dispatched/in_transit/arrived status and no completed receiving record', async () => {
      await service.getQueue();

      expect(prisma.shipment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['dispatched', 'in_transit', 'arrived'] },
            receivingRecords: { none: { status: 'completed' } },
          }),
        }),
      );
    });
  });

  describe('create()', () => {
    it('pre-fills expectedQuantity from the matching shipment item', async () => {
      await service.create(
        {
          shipmentId: 'ship-1',
          receivedDate: '2026-04-12',
          items: [
            {
              shipmentItemId: 'si-1',
              productId: 'product-1',
              receivedQuantity: 8,
            },
          ],
        },
        'user-1',
      );

      expect(prisma.receivingRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            items: {
              create: expect.arrayContaining([
                expect.objectContaining({
                  shipmentItemId: 'si-1',
                  expectedQuantity: 10, // pre-filled from mockShipment.items[0].quantity
                }),
              ]),
            },
          }),
        }),
      );
    });

    it('defaults receivedLocationId to Ghana Warehouse when not provided', async () => {
      await service.create(
        {
          shipmentId: 'ship-1',
          receivedDate: '2026-04-12',
          items: [],
        },
        'user-1',
      );

      expect(locationsService.getGhanaWarehouse).toHaveBeenCalled();
      expect(prisma.receivingRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ receivedLocationId: 'gh-loc-1' }),
        }),
      );
    });

    it('uses provided receivedLocationId without calling getGhanaWarehouse', async () => {
      await service.create(
        {
          shipmentId: 'ship-1',
          receivedLocationId: 'custom-loc-1',
          receivedDate: '2026-04-12',
          items: [],
        },
        'user-1',
      );

      expect(locationsService.getGhanaWarehouse).not.toHaveBeenCalled();
      expect(prisma.receivingRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ receivedLocationId: 'custom-loc-1' }),
        }),
      );
    });

    it('throws NotFoundException when the shipment does not exist', async () => {
      prisma.shipment.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          { shipmentId: 'nonexistent', receivedDate: '2026-04-12', items: [] },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('does NOT call recordMovement on create (stock only moves on submit)', async () => {
      await service.create(
        {
          shipmentId: 'ship-1',
          receivedDate: '2026-04-12',
          items: [
            {
              shipmentItemId: 'si-1',
              productId: 'product-1',
              receivedQuantity: 8,
            },
          ],
        },
        'user-1',
      );

      expect(inventoryService.recordMovement).not.toHaveBeenCalled();
    });
  });

  describe('update()', () => {
    it('updates item quantities while status is partial', async () => {
      prisma.receivingRecord.findUnique.mockResolvedValue(mockRecord);

      await service.update(
        'rec-1',
        {
          items: [{ id: 'ri-1', receivedQuantity: 9, damagedQuantity: 1 }],
        },
        'user-1',
      );

      expect(prisma.receivingItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ri-1' },
          data: expect.objectContaining({
            receivedQuantity: 9,
            damagedQuantity: 1,
          }),
        }),
      );
    });

    it('throws ConflictException when the receiving record is already completed', async () => {
      prisma.receivingRecord.findUnique.mockResolvedValue({
        ...mockRecord,
        status: 'completed',
      });

      await expect(
        service.update('rec-1', { items: [] }, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('does NOT call recordMovement on update (stock only moves on submit)', async () => {
      await service.update(
        'rec-1',
        { items: [{ id: 'ri-1', receivedQuantity: 9 }] },
        'user-1',
      );

      expect(inventoryService.recordMovement).not.toHaveBeenCalled();
    });
  });

  describe('submit()', () => {
    it('calls recordMovement with type receive for each item where received_quantity > 0', async () => {
      await service.submit('rec-1', 'user-1');

      expect(inventoryService.recordMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          movementType: 'receive',
          productId: 'product-1',
          quantity: 8,
          fromLocationId: mockVirtualLocation.id,
          toLocationId: mockGhanaWarehouse.id,
        }),
        expect.anything(),
      );
      expect(inventoryService.recordMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          movementType: 'receive',
          productId: 'product-2',
          quantity: 5,
          fromLocationId: mockVirtualLocation.id,
          toLocationId: mockGhanaWarehouse.id,
        }),
        expect.anything(),
      );
    });

    it('calls recordMovement with type damage_out for each item where damaged_quantity > 0', async () => {
      await service.submit('rec-1', 'user-1');

      expect(inventoryService.recordMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          movementType: 'damage_out',
          productId: 'product-1',
          quantity: 1,
          fromLocationId: mockVirtualLocation.id,
        }),
        expect.anything(),
      );
    });

    it('calls recordMovement with type loss_out for each item where lost_quantity > 0', async () => {
      await service.submit('rec-1', 'user-1');

      expect(inventoryService.recordMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          movementType: 'loss_out',
          productId: 'product-1',
          quantity: 1,
          fromLocationId: mockVirtualLocation.id,
        }),
        expect.anything(),
      );
    });

    it('does NOT call recordMovement for items where all quantities are 0', async () => {
      prisma.receivingRecord.findUnique.mockResolvedValue({
        ...mockRecord,
        items: [
          {
            id: 'ri-zero',
            productId: 'product-1',
            receivedQuantity: 0,
            damagedQuantity: 0,
            lostQuantity: 0,
          },
        ],
      });

      await service.submit('rec-1', 'user-1');

      expect(inventoryService.recordMovement).not.toHaveBeenCalled();
    });

    it('sets receiving_records.status to completed inside the transaction', async () => {
      await service.submit('rec-1', 'user-1');

      expect(prisma.receivingRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rec-1' },
          data: expect.objectContaining({ status: 'completed' }),
        }),
      );
    });

    it('sets shipment.actual_arrival_date and shipment.status to received atomically', async () => {
      await service.submit('rec-1', 'user-1');

      expect(prisma.shipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ship-1' },
          data: expect.objectContaining({
            status: 'received',
            actualArrivalDate: mockRecord.receivedDate,
          }),
        }),
      );
    });

    it('throws ConflictException when the record is already completed', async () => {
      prisma.receivingRecord.findUnique.mockResolvedValue({
        ...mockRecord,
        status: 'completed',
      });

      await expect(service.submit('rec-1', 'user-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws NotFoundException when the record does not exist', async () => {
      prisma.receivingRecord.findUnique.mockResolvedValue(null);

      await expect(service.submit('nonexistent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when the virtual shipment location is missing', async () => {
      prisma.location.findFirst.mockResolvedValue(null);

      await expect(service.submit('rec-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
