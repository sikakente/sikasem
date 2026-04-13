import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');

export interface ReceiptPdfData {
  receiptNumber: string;
  sale: {
    saleReference: string;
    totalGhs: any;
    customer?: { fullName: string } | null;
    items?: Array<{
      product?: { name: string } | null;
      quantity: any;
      unitPriceGhs: any;
      lineTotalGhs: any;
    }>;
    payments?: Array<{
      paymentMethod: string;
      amountGhs: any;
    }>;
  };
}

export interface InvoicePdfData {
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  currencyCode: string;
  customer: { fullName: string; email?: string | null; phone?: string | null };
  items: Array<{
    description: string;
    quantity: any;
    unitPrice: any;
    discountAmount: any;
    lineTotal: any;
  }>;
  subtotal: any;
  discountTotal: any;
  taxTotal: any;
  shippingTotal: any;
  total: any;
  notes?: string | null;
}

@Injectable()
export class PdfService {
  renderReceipt(data: ReceiptPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const { receiptNumber, sale } = data;

      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('EXPORT BUSINESS MANAGER', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(14).text('Receipt', { align: 'center' });
      doc.moveDown(1);

      doc.fontSize(10).font('Helvetica');
      doc.text(`Receipt Number: ${receiptNumber}`);
      doc.text(`Date: ${new Date().toLocaleDateString()}`);
      doc.text(`Sale Reference: ${sale.saleReference}`);
      if (sale.customer) {
        doc.text(`Customer: ${sale.customer.fullName}`);
      }
      doc.moveDown(1);

      doc.font('Helvetica-Bold');
      doc.text('Items', { underline: true });
      doc.moveDown(0.5);

      const colX = { name: 40, qty: 280, unit: 340, total: 440 };
      doc.text('Product', colX.name, doc.y, { width: 230 });
      doc.text('Qty', colX.qty, doc.y, { width: 55 });
      doc.text('Unit Price', colX.unit, doc.y, { width: 95 });
      doc.text('Total', colX.total, doc.y, { width: 95 });
      doc.moveDown(0.5);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.3);

      doc.font('Helvetica');
      for (const item of sale.items ?? []) {
        const y = doc.y;
        doc.text(item.product?.name ?? 'Unknown', colX.name, y, { width: 230 });
        doc.text(String(item.quantity), colX.qty, y, { width: 55 });
        doc.text(`GHS ${Number(item.unitPriceGhs).toFixed(2)}`, colX.unit, y, {
          width: 95,
        });
        doc.text(`GHS ${Number(item.lineTotalGhs).toFixed(2)}`, colX.total, y, {
          width: 95,
        });
        doc.moveDown(0.5);
      }

      doc.moveDown(0.5);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.5);

      doc.font('Helvetica-Bold');
      doc.text(`Total: GHS ${Number(sale.totalGhs).toFixed(2)}`, {
        align: 'right',
      });

      if (sale.payments && sale.payments.length > 0) {
        doc.moveDown(1);
        doc
          .font('Helvetica-Bold')
          .text('Payment Methods:', { underline: true });
        doc.font('Helvetica');
        for (const payment of sale.payments) {
          doc.text(
            `${payment.paymentMethod}: GHS ${Number(payment.amountGhs).toFixed(2)}`,
          );
        }
      }

      doc.end();
    });
  }

  renderInvoice(data: InvoicePdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const currency = data.currencyCode;

      // Header
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('EXPORT BUSINESS MANAGER', { align: 'left' });
      doc.moveDown(0.3);
      doc.fontSize(26).text('INVOICE', { align: 'left' });
      doc.moveDown(1);

      // Invoice metadata
      doc.fontSize(10).font('Helvetica');
      doc.text(`Invoice Number: ${data.invoiceNumber}`);
      doc.text(
        `Invoice Date: ${new Date(data.invoiceDate).toLocaleDateString()}`,
      );
      doc.text(`Due Date: ${new Date(data.dueDate).toLocaleDateString()}`);
      doc.text(`Currency: ${currency}`);
      doc.moveDown(1);

      // Bill To
      doc.font('Helvetica-Bold').text('Bill To:', { underline: true });
      doc.font('Helvetica');
      doc.text(data.customer.fullName);
      if (data.customer.email) doc.text(data.customer.email);
      if (data.customer.phone) doc.text(data.customer.phone);
      doc.moveDown(1);

      // Items table header
      const colX = { desc: 40, qty: 260, unit: 320, disc: 390, total: 460 };
      doc.font('Helvetica-Bold');
      doc.text('Description', colX.desc, doc.y, { width: 215 });
      doc.text('Qty', colX.qty, doc.y, { width: 55 });
      doc.text('Unit Price', colX.unit, doc.y, { width: 65 });
      doc.text('Discount', colX.disc, doc.y, { width: 65 });
      doc.text('Total', colX.total, doc.y, { width: 75 });
      doc.moveDown(0.5);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.3);

      // Items
      doc.font('Helvetica');
      for (const item of data.items) {
        const y = doc.y;
        doc.text(item.description, colX.desc, y, { width: 215 });
        doc.text(String(Number(item.quantity)), colX.qty, y, { width: 55 });
        doc.text(
          `${currency} ${Number(item.unitPrice).toFixed(2)}`,
          colX.unit,
          y,
          { width: 65 },
        );
        doc.text(
          `${currency} ${Number(item.discountAmount).toFixed(2)}`,
          colX.disc,
          y,
          { width: 65 },
        );
        doc.text(
          `${currency} ${Number(item.lineTotal).toFixed(2)}`,
          colX.total,
          y,
          { width: 75 },
        );
        doc.moveDown(0.5);
      }

      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.5);

      // Totals
      const totalsX = 380;
      const valX = 460;
      const tw = 75;
      doc.font('Helvetica');
      doc.text('Subtotal:', totalsX, doc.y, { width: 75 });
      doc.text(
        `${currency} ${Number(data.subtotal).toFixed(2)}`,
        valX,
        doc.y - doc.currentLineHeight(),
        { width: tw },
      );
      doc.moveDown(0.3);

      if (Number(data.discountTotal) > 0) {
        doc.text('Discount:', totalsX, doc.y, { width: 75 });
        doc.text(
          `- ${currency} ${Number(data.discountTotal).toFixed(2)}`,
          valX,
          doc.y - doc.currentLineHeight(),
          { width: tw },
        );
        doc.moveDown(0.3);
      }

      if (Number(data.shippingTotal) > 0) {
        doc.text('Shipping:', totalsX, doc.y, { width: 75 });
        doc.text(
          `${currency} ${Number(data.shippingTotal).toFixed(2)}`,
          valX,
          doc.y - doc.currentLineHeight(),
          { width: tw },
        );
        doc.moveDown(0.3);
      }

      if (Number(data.taxTotal) > 0) {
        doc.text('Tax:', totalsX, doc.y, { width: 75 });
        doc.text(
          `${currency} ${Number(data.taxTotal).toFixed(2)}`,
          valX,
          doc.y - doc.currentLineHeight(),
          { width: tw },
        );
        doc.moveDown(0.3);
      }

      doc.moveTo(totalsX, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold');
      doc.text('Total:', totalsX, doc.y, { width: 75 });
      doc.text(
        `${currency} ${Number(data.total).toFixed(2)}`,
        valX,
        doc.y - doc.currentLineHeight(),
        { width: tw },
      );

      // Notes
      if (data.notes) {
        doc.moveDown(2);
        doc.font('Helvetica-Bold').text('Notes:', { underline: true });
        doc.font('Helvetica').text(data.notes);
      }

      doc.end();
    });
  }
}
