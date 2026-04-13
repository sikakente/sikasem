import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';
import { PdfService } from '../../common/services/pdf.service';

@Injectable()
export class ReceiptsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private pdf: PdfService,
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

    const buffer = await this.pdf.renderReceipt({ receiptNumber, sale });

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
}
