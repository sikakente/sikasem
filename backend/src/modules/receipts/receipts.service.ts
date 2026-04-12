import { Injectable, NotFoundException } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';

@Injectable()
export class ReceiptsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async findAll(query: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.receipt.findMany({
        include: {
          sale: { select: { id: true, saleReference: true } },
        },
        orderBy: { receiptDatetime: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.receipt.count(),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    const receipt = await this.prisma.receipt.findUnique({
      where: { id },
      include: {
        sale: {
          include: {
            items: {
              include: {
                product: { select: { id: true, name: true, sku: true } },
              },
            },
            customer: true,
            payments: true,
          },
        },
      },
    });

    if (!receipt) {
      throw new NotFoundException(`Receipt with id "${id}" not found`);
    }

    return receipt;
  }

  async generate(saleId: string, totalGhs: number, userId: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
        customer: true,
        payments: true,
      },
    });

    if (!sale) {
      throw new NotFoundException(`Sale with id "${saleId}" not found`);
    }

    const receiptNumber = `REC-${Date.now()}`;

    const buffer = await this.buildPdfBuffer(sale, receiptNumber);

    await this.storage.uploadFile(
      `receipts/${receiptNumber}.pdf`,
      buffer,
      'application/pdf',
    );

    const receipt = await this.prisma.receipt.create({
      data: {
        receiptNumber,
        saleId,
        totalGhs,
        pdfUrl: `receipts/${receiptNumber}.pdf`,
        createdBy: userId,
      },
    });

    return receipt;
  }

  async getPdfUrl(id: string) {
    const receipt = await this.prisma.receipt.findUnique({ where: { id } });

    if (!receipt) {
      throw new NotFoundException(`Receipt with id "${id}" not found`);
    }

    const url = await this.storage.getSignedUrl(receipt.pdfUrl as string);
    return { url };
  }

  private buildPdfBuffer(sale: any, receiptNumber: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('EXPORT BUSINESS MANAGER', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(14).text('Receipt', { align: 'center' });
      doc.moveDown(1);

      // Receipt metadata
      doc.fontSize(10).font('Helvetica');
      doc.text(`Receipt Number: ${receiptNumber}`);
      doc.text(`Date: ${new Date().toLocaleDateString()}`);
      doc.text(`Sale Reference: ${sale.saleReference}`);
      if (sale.customer) {
        doc.text(`Customer: ${sale.customer.fullName}`);
      }
      doc.moveDown(1);

      // Items table header
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

      // Items
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

      // Totals
      doc.font('Helvetica-Bold');
      doc.text(`Total: GHS ${Number(sale.totalGhs).toFixed(2)}`, {
        align: 'right',
      });

      // Payment methods
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
}
