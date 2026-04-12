import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const mockCustomer = {
  id: 'customer-1',
  customerType: 'retail',
  fullName: 'John Doe',
  phone: '+233201234567',
  email: 'john@example.com',
  address: '123 Main St',
  notes: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSale = {
  id: 'sale-1',
  saleReference: 'SALE-001',
  totalGhs: 150.0,
  saleDatetime: new Date(),
  status: 'completed',
  _count: { items: 3 },
};

describe('CustomersService', () => {
  let service: CustomersService;
  let prisma: any;
  let auditService: any;

  beforeEach(async () => {
    const mockPrisma: any = {
      customer: {
        findUnique: jest.fn().mockResolvedValue(mockCustomer),
        findMany: jest.fn().mockResolvedValue([mockCustomer]),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue(mockCustomer),
        update: jest.fn().mockResolvedValue(mockCustomer),
      },
      sale: {
        findMany: jest.fn().mockResolvedValue([mockSale]),
        count: jest.fn().mockResolvedValue(1),
      },
    };

    const mockAuditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    prisma = mockPrisma;
    auditService = mockAuditService;
  });

  describe('findAll()', () => {
    it('returns paginated results filtered by customerType', async () => {
      const result = await service.findAll({
        customerType: 'retail',
        page: 1,
        limit: 20,
      });

      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ customerType: 'retail' }),
        }),
      );
      expect(result).toEqual({
        data: [mockCustomer],
        total: 1,
        page: 1,
        limit: 20,
      });
    });

    it('searches by name, phone, and email', async () => {
      await service.findAll({ search: 'john', page: 1, limit: 20 });

      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ fullName: expect.anything() }),
              expect.objectContaining({ phone: expect.anything() }),
              expect.objectContaining({ email: expect.anything() }),
            ]),
          }),
        }),
      );
    });
  });

  describe('create()', () => {
    it('creates a customer and logs audit', async () => {
      const dto = {
        customerType: 'retail',
        fullName: 'John Doe',
        phone: '+233201234567',
      };

      const result = await service.create(dto, 'user-1');

      expect(prisma.customer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fullName: 'John Doe',
            customerType: 'retail',
          }),
        }),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: 'customer_create' }),
      );
      expect(result).toEqual(mockCustomer);
    });
  });

  describe('update()', () => {
    it('throws NotFoundException when customer not found', async () => {
      prisma.customer.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.update('nonexistent', { fullName: 'Jane Doe' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates customer fields', async () => {
      const dto = { fullName: 'Jane Doe' };
      prisma.customer.findUnique.mockResolvedValueOnce(mockCustomer);
      prisma.customer.update.mockResolvedValueOnce({
        ...mockCustomer,
        fullName: 'Jane Doe',
      });

      const result = await service.update('customer-1', dto, 'user-1');

      expect(prisma.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'customer-1' },
          data: expect.objectContaining({ fullName: 'Jane Doe' }),
        }),
      );
      expect(result.fullName).toBe('Jane Doe');
    });
  });

  describe('getSalesHistory()', () => {
    it('returns paginated sales for a customer', async () => {
      const result = await service.getSalesHistory('customer-1', {
        page: 1,
        limit: 20,
      });

      expect(prisma.sale.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { customerId: 'customer-1' },
        }),
      );
      expect(result).toEqual({
        data: [mockSale],
        total: 1,
        page: 1,
        limit: 20,
      });
    });

    it('throws NotFoundException when customer not found', async () => {
      prisma.customer.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.getSalesHistory('nonexistent', { page: 1, limit: 20 }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
