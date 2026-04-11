import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const makeProduct = (overrides = {}) => ({
  id: 'product-1',
  name: 'Test Product',
  sku: 'SKU-001',
  barcode: '1234567890',
  categoryId: null,
  brand: null,
  description: null,
  unitType: 'box',
  defaultCostPriceGbp: null,
  defaultSellingPriceGhs: null,
  minimumStockThreshold: 10,
  expiryTrackingEnabled: false,
  imageUrl: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  category: null,
  barcodes: [],
  productSupplierMaps: [],
  ...overrides,
});

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: jest.Mocked<PrismaService>;
  let _audit: jest.Mocked<AuditService>;

  beforeEach(async () => {
    const mockPrisma = {
      product: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      productBarcode: {
        findFirst: jest.fn(),
      },
      productCategory: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
    };

    const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prisma = mockPrisma as any;
    _audit = mockAudit as any;
  });

  describe('findByBarcode()', () => {
    it('resolves when the barcode matches products.barcode', async () => {
      const product = makeProduct();
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(product);

      const result = await service.findByBarcode('1234567890');

      expect(result.id).toBe('product-1');
      expect(prisma.productBarcode.findFirst).not.toHaveBeenCalled();
    });

    it('resolves when the barcode matches a row in product_barcodes', async () => {
      const product = makeProduct({ barcode: 'other-barcode' });
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.productBarcode.findFirst as jest.Mock).mockResolvedValue({
        product,
      });

      const result = await service.findByBarcode('extra-barcode');

      expect(result.id).toBe('product-1');
    });

    it('throws NotFoundException when neither table has a match', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.productBarcode.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findByBarcode('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create()', () => {
    it('creates additional barcode rows in product_barcodes when additionalBarcodes is provided', async () => {
      let capturedData: any;
      (prisma.product.create as jest.Mock).mockImplementation(({ data }) => {
        capturedData = data;
        return makeProduct();
      });

      await service.create(
        {
          name: 'P',
          sku: 'S',
          unitType: 'box',
          minimumStockThreshold: 5,
          expiryTrackingEnabled: false,
          isActive: true,
          additionalBarcodes: ['EXTRA-1', 'EXTRA-2'],
        },
        'user-1',
      );

      expect(capturedData.barcodes.create).toHaveLength(2);
      expect(capturedData.barcodes.create[0].barcode).toBe('EXTRA-1');
    });
  });

  describe('findAll()', () => {
    it('with search filters across name, SKU, and barcode (OR logic)', async () => {
      (prisma.product.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.product.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({ search: 'test' });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: expect.any(Object) }),
              expect.objectContaining({ sku: expect.any(Object) }),
              expect.objectContaining({ barcode: expect.any(Object) }),
            ]),
          }),
        }),
      );
    });
  });
});
