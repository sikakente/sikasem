import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const makeSupplier = (overrides = {}) => ({
  id: 'supplier-1',
  name: 'Test Supplier',
  supplierType: 'shop',
  contactName: null,
  phone: null,
  email: null,
  addressLine1: null,
  city: 'London',
  country: 'UK',
  currencyCode: 'GBP',
  notes: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('SuppliersService', () => {
  let service: SuppliersService;
  let prisma: jest.Mocked<PrismaService>;
  let audit: jest.Mocked<AuditService>;

  beforeEach(async () => {
    const mockPrisma = {
      supplier: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuppliersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<SuppliersService>(SuppliersService);
    prisma = mockPrisma as any;
    audit = mockAudit as any;
  });

  describe('findAll()', () => {
    it('returns paginated results respecting page and limit', async () => {
      (prisma.supplier.findMany as jest.Mock).mockResolvedValue([makeSupplier()]);
      (prisma.supplier.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll({ page: 2, limit: 5 });

      expect(prisma.supplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
      expect(result.total).toBe(1);
      expect(result.page).toBe(2);
    });

    it('filters by search against the name field', async () => {
      (prisma.supplier.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.supplier.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({ search: 'Tesco' });

      expect(prisma.supplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ name: { contains: 'Tesco', mode: 'insensitive' } }),
        }),
      );
    });
  });

  describe('findById()', () => {
    it('throws NotFoundException for an unknown ID', async () => {
      (prisma.supplier.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create()', () => {
    it('calls AuditService.log() with actionType: create', async () => {
      const supplier = makeSupplier();
      (prisma.supplier.create as jest.Mock).mockResolvedValue(supplier);

      await service.create(
        { name: 'New', supplierType: 'shop', country: 'UK' },
        'user-1',
      );

      // Let the fire-and-forget settle
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: 'create', userId: 'user-1' }),
      );
    });
  });

  describe('update()', () => {
    it('calls AuditService.log() with correct beforeJson and afterJson', async () => {
      const before = makeSupplier({ name: 'Old Name' });
      const after = makeSupplier({ name: 'New Name' });
      (prisma.supplier.findUnique as jest.Mock).mockResolvedValue(before);
      (prisma.supplier.update as jest.Mock).mockResolvedValue(after);

      await service.update('supplier-1', { name: 'New Name' }, 'user-1');

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'update',
          beforeJson: before,
          afterJson: after,
        }),
      );
    });
  });

  describe('deactivate()', () => {
    it('sets isActive to false without hard-deleting the record', async () => {
      (prisma.supplier.findUnique as jest.Mock).mockResolvedValue(makeSupplier());
      (prisma.supplier.update as jest.Mock).mockResolvedValue(makeSupplier({ isActive: false }));

      const result = await service.deactivate('supplier-1', 'user-1');

      expect(prisma.supplier.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: false } }),
      );
      expect(result.isActive).toBe(false);
    });
  });
});
