import { Test, TestingModule } from '@nestjs/testing';
import { AlertsService } from './alerts.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as lowStockRule from './alert-rules/low-stock.rule';

const mockPrisma = {
  alert: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  user: { findMany: jest.fn() },
};

describe('AlertsService', () => {
  let service: AlertsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
    jest.clearAllMocks();
  });

  describe('createOrSkip()', () => {
    const params = {
      alertType: 'low_stock',
      severity: 'medium',
      title: 'Low stock: Widget',
      message: 'Available qty below threshold',
      relatedEntityType: 'product',
      relatedEntityId: 'prod-1',
    };

    it('creates an alert when no open alert with same type + entity exists', async () => {
      mockPrisma.alert.findFirst.mockResolvedValue(null);
      mockPrisma.alert.create.mockResolvedValue({
        ...params,
        id: 'alert-1',
        status: 'open',
      });
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.createOrSkip(params);

      expect(mockPrisma.alert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          alertType: 'low_stock',
          relatedEntityId: 'prod-1',
          status: 'open',
        }),
      });
    });

    it('skips when an open alert for the same type + entity already exists', async () => {
      mockPrisma.alert.findFirst.mockResolvedValue({
        id: 'existing',
        status: 'open',
      });

      await service.createOrSkip(params);

      expect(mockPrisma.alert.create).not.toHaveBeenCalled();
    });

    it('creates a new alert when previous alert for the same entity is resolved', async () => {
      mockPrisma.alert.findFirst.mockResolvedValue(null); // no open alert
      mockPrisma.alert.create.mockResolvedValue({
        ...params,
        id: 'alert-2',
        status: 'open',
      });
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.createOrSkip(params);

      expect(mockPrisma.alert.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('runAlertDetection()', () => {
    it('continues running remaining rules even when one rule throws', async () => {
      // Mock prisma to throw on first findMany call (low-stock rule), succeed on others
      mockPrisma.alert.findFirst.mockResolvedValue(null);
      mockPrisma.alert.create.mockResolvedValue({
        id: 'a',
        severity: 'medium',
        status: 'open',
      });
      mockPrisma.user.findMany.mockResolvedValue([]);

      // Patch the individual rule function to simulate a rule failure
      const spy = jest
        .spyOn(lowStockRule, 'runLowStockRule')
        .mockRejectedValue(new Error('DB error'));

      await expect(service.runAlertDetection()).resolves.not.toThrow();

      spy.mockRestore();
    });
  });

  describe('acknowledge()', () => {
    it('sets status to acknowledged with user and timestamp', async () => {
      mockPrisma.alert.findUnique.mockResolvedValue({
        id: 'a1',
        status: 'open',
      });
      mockPrisma.alert.update.mockResolvedValue({
        id: 'a1',
        status: 'acknowledged',
        acknowledgedBy: 'user-1',
        acknowledgedAt: new Date(),
      });

      const result = await service.acknowledge('a1', 'user-1');

      expect(mockPrisma.alert.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: expect.objectContaining({
          status: 'acknowledged',
          acknowledgedBy: 'user-1',
        }),
      });
      expect(result.status).toBe('acknowledged');
    });
  });

  describe('resolve()', () => {
    it('sets status to resolved', async () => {
      mockPrisma.alert.findUnique.mockResolvedValue({
        id: 'a1',
        status: 'acknowledged',
      });
      mockPrisma.alert.update.mockResolvedValue({
        id: 'a1',
        status: 'resolved',
      });

      const result = await service.resolve('a1', 'user-1');

      expect(mockPrisma.alert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'resolved' }),
        }),
      );
      expect(result.status).toBe('resolved');
    });
  });

  describe('dismiss()', () => {
    it('sets status to dismissed', async () => {
      mockPrisma.alert.findUnique.mockResolvedValue({
        id: 'a1',
        status: 'open',
      });
      mockPrisma.alert.update.mockResolvedValue({
        id: 'a1',
        status: 'dismissed',
      });

      const result = await service.dismiss('a1', 'user-1');

      expect(mockPrisma.alert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'dismissed' }),
        }),
      );
      expect(result.status).toBe('dismissed');
    });
  });
});
