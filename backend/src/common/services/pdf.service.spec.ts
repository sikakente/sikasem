import { Test, TestingModule } from '@nestjs/testing';
import { PdfService } from './pdf.service';

const mockInvoiceData = {
  invoiceNumber: 'INV-001',
  invoiceDate: new Date('2024-01-15'),
  dueDate: new Date('2024-02-15'),
  currencyCode: 'GHS',
  customer: { fullName: 'Acme Corp', email: 'acme@example.com', phone: null },
  items: [
    {
      description: 'Product A',
      quantity: 2,
      unitPrice: 50.0,
      discountAmount: 0,
      lineTotal: 100.0,
    },
  ],
  subtotal: 100.0,
  discountTotal: 0,
  taxTotal: 0,
  shippingTotal: 0,
  total: 100.0,
  notes: null,
};

const mockReceiptData = {
  receiptNumber: 'REC-001',
  sale: {
    saleReference: 'SALE-001',
    totalGhs: 100.0,
    customer: { fullName: 'John Doe' },
    items: [
      {
        product: { name: 'Product A' },
        quantity: 2,
        unitPriceGhs: 50.0,
        lineTotalGhs: 100.0,
      },
    ],
    payments: [{ paymentMethod: 'cash', amountGhs: 100.0 }],
  },
};

describe('PdfService', () => {
  let service: PdfService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfService],
    }).compile();

    service = module.get<PdfService>(PdfService);
  });

  describe('renderInvoice()', () => {
    it('returns a Buffer with length > 0', async () => {
      const result = await service.renderInvoice(mockInvoiceData);
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('output begins with PDF magic bytes (%PDF)', async () => {
      const result = await service.renderInvoice(mockInvoiceData);
      expect(result.toString('ascii', 0, 4)).toBe('%PDF');
    });
  });

  describe('renderReceipt()', () => {
    it('returns a Buffer with length > 0', async () => {
      const result = await service.renderReceipt(mockReceiptData);
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('output begins with PDF magic bytes (%PDF)', async () => {
      const result = await service.renderReceipt(mockReceiptData);
      expect(result.toString('ascii', 0, 4)).toBe('%PDF');
    });
  });
});
