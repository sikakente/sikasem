import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ReceiptsService } from './receipts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';
import { PdfService } from '../../common/services/pdf.service';

const mockSale = {
  id: 'sale-1',
  saleReference: 'SALE-001',
  totalGhs: 200.0,
  saleDatetime: new Date(),
  status: 'completed',
  locationId: 'loc-1',
  customerId: 'customer-1',
  soldBy: 'user-1',
  currencyCode: 'GHS',
  subtotalGhs: 200.0,
  discountTotalGhs: 0,
  taxTotalGhs: 0,
  notes: null,
  createdAt: new Date(),
  customer: {
    id: 'customer-1',
    fullName: 'John Doe',
    customerType: 'retail',
  },
  items: [
    {
      id: 'item-1',
      saleId: 'sale-1',
      productId: 'product-1',
      quantity: 2,
      unitPriceGhs: 50.0,
      lineTotalGhs: 100.0,
      product: { id: 'product-1', name: 'Product A', sku: 'SKU-001' },
    },
  ],
  payments: [
    {
      id: 'payment-1',
      saleId: 'sale-1',
      paymentMethod: 'cash',
      amountGhs: 200.0,
      paidAt: new Date(),
    },
  ],
};

const mockReceipt = {
  id: 'receipt-1',
  receiptNumber: 'REC-123456789',
  saleId: 'sale-1',
  receiptDatetime: new Date(),
  totalGhs: 200.0,
  pdfUrl: 'receipts/REC-123456789.pdf',
  createdBy: 'user-1',
};

describe('ReceiptsService', () => {
  let service: ReceiptsService;
  let prisma: any;
  let storageService: any;

  beforeEach(async () => {
    const mockPdfService = {
      renderReceipt: jest.fn().mockResolvedValue(Buffer.from('%PDF-mock')),
    };

    const mockPrisma: any = {
      receipt: {
        findUnique: jest.fn().mockResolvedValue(mockReceipt),
        findMany: jest.fn().mockResolvedValue([mockReceipt]),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue(mockReceipt),
      },
      sale: {
        findUnique: jest.fn().mockResolvedValue(mockSale),
      },
    };

    const mockStorageService = {
      uploadFile: jest.fn().mockResolvedValue(undefined),
      getSignedUrl: jest
        .fn()
        .mockResolvedValue('https://signed-url.example.com/receipt.pdf'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiptsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StorageService, useValue: mockStorageService },
        { provide: PdfService, useValue: mockPdfService },
      ],
    }).compile();

    service = module.get<ReceiptsService>(ReceiptsService);
    prisma = mockPrisma;
    storageService = mockStorageService;
  });

  describe('generate()', () => {
    it('returns a receipt record with a non-null pdfUrl', async () => {
      const result = await service.generate('sale-1', 200.0, 'user-1');

      expect(result).toEqual(mockReceipt);
      expect(result.pdfUrl).not.toBeNull();
    });

    it('calls StorageService.uploadFile with the PDF buffer', async () => {
      await service.generate('sale-1', 200.0, 'user-1');

      expect(storageService.uploadFile).toHaveBeenCalledWith(
        expect.stringMatching(/^receipts\/REC-\d+\.pdf$/),
        expect.any(Buffer),
        'application/pdf',
      );
    });

    it('creates a receipt row in the database', async () => {
      await service.generate('sale-1', 200.0, 'user-1');

      expect(prisma.receipt.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            saleId: 'sale-1',
            totalGhs: 200.0,
            createdBy: 'user-1',
          }),
        }),
      );
    });

    it('throws NotFoundException when sale is not found', async () => {
      prisma.sale.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.generate('nonexistent', 200.0, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPdfUrl()', () => {
    it('returns a signed URL string from StorageService', async () => {
      const result = await service.getPdfUrl('receipt-1');

      expect(storageService.getSignedUrl).toHaveBeenCalledWith(
        mockReceipt.pdfUrl,
      );
      expect(result).toEqual({
        url: 'https://signed-url.example.com/receipt.pdf',
      });
    });

    it('throws NotFoundException when receipt not found', async () => {
      prisma.receipt.findUnique.mockResolvedValueOnce(null);

      await expect(service.getPdfUrl('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
