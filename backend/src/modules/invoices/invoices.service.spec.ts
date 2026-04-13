import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';
import { PdfService } from '../../common/services/pdf.service';
import { AuditService } from '../audit/audit.service';

const mockCustomer = {
  id: 'customer-1',
  fullName: 'Acme Corp',
  email: 'acme@example.com',
  phone: null,
  address: null,
  customerType: 'wholesale',
  notes: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSaleItem = {
  id: 'sale-item-1',
  saleId: 'sale-1',
  productId: 'product-1',
  quantity: 2,
  unitPriceGhs: 50,
  discountAmountGhs: 5,
  lineTotalGhs: 95,
  batchId: null,
  product: { id: 'product-1', name: 'Widget A' },
};

const mockSale = {
  id: 'sale-1',
  saleReference: 'SALE-001',
  items: [mockSaleItem],
};

const mockInvoice = {
  id: 'invoice-1',
  invoiceNumber: 'INV-001',
  customerId: 'customer-1',
  saleId: null,
  invoiceDate: new Date('2024-01-15'),
  dueDate: new Date('2024-02-15'),
  currencyCode: 'GHS',
  subtotal: 100,
  discountTotal: 0,
  taxTotal: 0,
  shippingTotal: 0,
  total: 100,
  status: 'draft',
  pdfUrl: null,
  notes: null,
  createdBy: 'user-1',
  createdAt: new Date(),
  customer: mockCustomer,
  items: [],
  sale: null,
};

const _mockPaidInvoice = { ...mockInvoice, status: 'paid' };

describe('InvoicesService', () => {
  let service: InvoicesService;
  let prisma: any;
  let storage: any;
  let pdf: any;
  let audit: any;

  beforeEach(async () => {
    prisma = {
      customer: { findUnique: jest.fn().mockResolvedValue(mockCustomer) },
      sale: { findUnique: jest.fn().mockResolvedValue(mockSale) },
      invoice: {
        findUnique: jest.fn().mockResolvedValue(mockInvoice),
        findMany: jest.fn().mockResolvedValue([mockInvoice]),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue(mockInvoice),
        update: jest.fn().mockResolvedValue(mockInvoice),
      },
      invoiceItem: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn().mockImplementation((fn) =>
        fn({
          invoice: { create: jest.fn().mockResolvedValue(mockInvoice) },
          invoiceItem: { create: jest.fn().mockResolvedValue({}) },
        }),
      ),
    };

    storage = {
      uploadFile: jest.fn().mockResolvedValue(undefined),
      getSignedUrl: jest
        .fn()
        .mockResolvedValue('https://signed-url.example.com/invoice.pdf'),
    };

    pdf = {
      renderInvoice: jest.fn().mockResolvedValue(Buffer.from('%PDF-mock')),
    };

    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
        { provide: PdfService, useValue: pdf },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
  });

  describe('create() with saleId', () => {
    it('auto-populates invoice_items from the sale line items', async () => {
      const dto = {
        customerId: 'customer-1',
        saleId: 'sale-1',
        invoiceDate: '2024-01-15',
        dueDate: '2024-02-15',
        currencyCode: 'GHS',
      };

      // Spy on the transaction fn to capture item create calls
      const txInvoiceCreate = jest.fn().mockResolvedValue(mockInvoice);
      const txItemCreate = jest.fn().mockResolvedValue({});
      prisma.$transaction.mockImplementation((fn: any) =>
        fn({
          invoice: { create: txInvoiceCreate },
          invoiceItem: { create: txItemCreate },
        }),
      );

      // Make findById return something valid
      prisma.invoice.findUnique.mockResolvedValue({
        ...mockInvoice,
        items: [{}],
        sale: null,
      });

      await service.create(dto as any, 'user-1');

      expect(txItemCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: 'Widget A',
            quantity: 2,
          }),
        }),
      );
    });
  });

  describe('create() without saleId', () => {
    it('uses items provided in the DTO', async () => {
      const dto = {
        customerId: 'customer-1',
        invoiceDate: '2024-01-15',
        dueDate: '2024-02-15',
        currencyCode: 'GHS',
        items: [
          {
            description: 'Custom Item',
            quantity: 3,
            unitPrice: 20,
            discountAmount: 0,
          },
        ],
      };

      const txInvoiceCreate = jest.fn().mockResolvedValue(mockInvoice);
      const txItemCreate = jest.fn().mockResolvedValue({});
      prisma.$transaction.mockImplementation((fn: any) =>
        fn({
          invoice: { create: txInvoiceCreate },
          invoiceItem: { create: txItemCreate },
        }),
      );

      prisma.invoice.findUnique.mockResolvedValue({
        ...mockInvoice,
        items: [{}],
        sale: null,
      });

      await service.create(dto as any, 'user-1');

      expect(txItemCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: 'Custom Item',
            quantity: 3,
          }),
        }),
      );
    });
  });

  describe('create() PDF and storage', () => {
    it('calls PdfService.renderInvoice and StorageService.uploadFile', async () => {
      const dto = {
        customerId: 'customer-1',
        invoiceDate: '2024-01-15',
        dueDate: '2024-02-15',
        currencyCode: 'GHS',
        items: [
          {
            description: 'Item',
            quantity: 1,
            unitPrice: 10,
            discountAmount: 0,
          },
        ],
      };

      prisma.$transaction.mockImplementation((fn: any) =>
        fn({
          invoice: { create: jest.fn().mockResolvedValue(mockInvoice) },
          invoiceItem: { create: jest.fn() },
        }),
      );
      prisma.invoice.findUnique.mockResolvedValue({
        ...mockInvoice,
        items: [],
        sale: null,
      });

      await service.create(dto as any, 'user-1');

      expect(pdf.renderInvoice).toHaveBeenCalled();
      expect(storage.uploadFile).toHaveBeenCalledWith(
        expect.stringMatching(/^invoices\/INV-\d+\.pdf$/),
        expect.any(Buffer),
        'application/pdf',
      );
    });

    it('saves the S3 key into invoices.pdfUrl', async () => {
      const dto = {
        customerId: 'customer-1',
        invoiceDate: '2024-01-15',
        dueDate: '2024-02-15',
        currencyCode: 'GHS',
        items: [
          {
            description: 'Item',
            quantity: 1,
            unitPrice: 10,
            discountAmount: 0,
          },
        ],
      };

      prisma.$transaction.mockImplementation((fn: any) =>
        fn({
          invoice: { create: jest.fn().mockResolvedValue(mockInvoice) },
          invoiceItem: { create: jest.fn() },
        }),
      );
      prisma.invoice.findUnique.mockResolvedValue({
        ...mockInvoice,
        items: [],
        sale: null,
      });

      await service.create(dto as any, 'user-1');

      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pdfUrl: expect.stringMatching(/^invoices\/INV-\d+\.pdf$/),
          }),
        }),
      );
    });
  });

  describe('markPaid()', () => {
    it('sets status to paid and writes an audit log entry', async () => {
      await service.markPaid('invoice-1', 'user-1');

      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'invoice-1' },
          data: { status: 'paid' },
        }),
      );

      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'invoice_paid',
          entityId: 'invoice-1',
        }),
      );
    });

    it('throws NotFoundException when invoice not found', async () => {
      prisma.invoice.findUnique.mockResolvedValueOnce(null);

      await expect(service.markPaid('nonexistent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getPdfUrl()', () => {
    it('calls StorageService.getSignedUrl with the stored key and returns the result', async () => {
      prisma.invoice.findUnique.mockResolvedValueOnce({
        ...mockInvoice,
        pdfUrl: 'invoices/INV-001.pdf',
      });

      const result = await service.getPdfUrl('invoice-1');

      expect(storage.getSignedUrl).toHaveBeenCalledWith('invoices/INV-001.pdf');
      expect(result).toEqual({
        url: 'https://signed-url.example.com/invoice.pdf',
      });
    });

    it('throws NotFoundException when invoice not found', async () => {
      prisma.invoice.findUnique.mockResolvedValueOnce(null);

      await expect(service.getPdfUrl('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getOverdueInvoices()', () => {
    it('returns only invoices where due_date < now and status != paid', async () => {
      const overdueInvoice = {
        ...mockInvoice,
        dueDate: new Date('2020-01-01'),
        status: 'sent',
      };

      prisma.invoice.findMany.mockResolvedValueOnce([overdueInvoice]);

      const result = await service.getOverdueInvoices();

      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: expect.objectContaining({ lt: expect.any(Date) }),
            status: expect.objectContaining({ not: 'paid' }),
          }),
        }),
      );

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('sent');
    });
  });

  describe('create() validation', () => {
    it('throws BadRequestException when no saleId and no items provided', async () => {
      const dto = {
        customerId: 'customer-1',
        invoiceDate: '2024-01-15',
        dueDate: '2024-02-15',
        currencyCode: 'GHS',
      };

      prisma.sale.findUnique.mockResolvedValueOnce(null);

      await expect(service.create(dto as any, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
