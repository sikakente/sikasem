import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';
import { PdfService } from '../../common/services/pdf.service';
import { AuditService } from '../audit/audit.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceQueryDto } from './dto/invoice-query.dto';

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private pdf: PdfService,
    private audit: AuditService,
  ) {}

  async findAll(query: InvoiceQueryDto) {
    const {
      page = 1,
      limit = 20,
      status,
      customerId,
      dateFrom,
      dateTo,
      overdue,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (overdue) {
      where.dueDate = { lt: new Date() };
      where.status = { not: 'paid' };
    } else {
      if (status) where.status = status;
    }

    if (customerId) where.customerId = customerId;

    if (dateFrom || dateTo) {
      where.invoiceDate = {};
      if (dateFrom) where.invoiceDate.gte = new Date(dateFrom);
      if (dateTo) where.invoiceDate.lte = new Date(dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          customer: { select: { id: true, fullName: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: { product: { select: { id: true, name: true, sku: true } } },
        },
        sale: { select: { id: true, saleReference: true } },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with id "${id}" not found`);
    }

    return invoice;
  }

  async create(dto: CreateInvoiceDto, userId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer "${dto.customerId}" not found`);
    }

    // Determine line items — from sale or from DTO
    let itemsToCreate: Array<{
      productId?: string;
      description: string;
      quantity: number;
      unitPrice: number;
      discountAmount: number;
    }>;

    if (dto.saleId) {
      const sale = await this.prisma.sale.findUnique({
        where: { id: dto.saleId },
        include: {
          items: { include: { product: { select: { id: true, name: true } } } },
        },
      });
      if (!sale) {
        throw new NotFoundException(`Sale "${dto.saleId}" not found`);
      }
      itemsToCreate = sale.items.map((i) => ({
        productId: i.productId,
        description: i.product?.name ?? 'Unknown',
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPriceGhs),
        discountAmount: Number(i.discountAmountGhs),
      }));
    } else {
      if (!dto.items || dto.items.length === 0) {
        throw new BadRequestException(
          'items are required when saleId is not provided',
        );
      }
      itemsToCreate = dto.items.map((i) => ({
        productId: i.productId,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discountAmount: i.discountAmount ?? 0,
      }));
    }

    const subtotal = itemsToCreate.reduce(
      (sum, i) => sum + i.quantity * i.unitPrice,
      0,
    );
    const discountTotal = itemsToCreate.reduce(
      (sum, i) => sum + i.discountAmount,
      0,
    );
    const total =
      subtotal - discountTotal + (dto.taxTotal ?? 0) + (dto.shippingTotal ?? 0);

    const invoiceNumber = `INV-${Date.now()}`;

    const invoice = await this.prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId: dto.customerId,
          saleId: dto.saleId ?? null,
          invoiceDate: new Date(dto.invoiceDate),
          dueDate: new Date(dto.dueDate),
          currencyCode: dto.currencyCode,
          subtotal,
          discountTotal,
          taxTotal: dto.taxTotal ?? 0,
          shippingTotal: dto.shippingTotal ?? 0,
          total,
          notes: dto.notes ?? null,
          createdBy: userId,
        },
      });

      await Promise.all(
        itemsToCreate.map((item) =>
          tx.invoiceItem.create({
            data: {
              invoiceId: inv.id,
              productId: item.productId ?? null,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discountAmount: item.discountAmount,
              lineTotal: item.quantity * item.unitPrice - item.discountAmount,
            },
          }),
        ),
      );

      return inv;
    });

    const buffer = await this.pdf.renderInvoice({
      invoiceNumber,
      invoiceDate: new Date(dto.invoiceDate),
      dueDate: new Date(dto.dueDate),
      currencyCode: dto.currencyCode,
      customer: {
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone,
      },
      items: itemsToCreate.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discountAmount: i.discountAmount,
        lineTotal: i.quantity * i.unitPrice - i.discountAmount,
      })),
      subtotal,
      discountTotal,
      taxTotal: dto.taxTotal ?? 0,
      shippingTotal: dto.shippingTotal ?? 0,
      total,
      notes: dto.notes,
    });

    const pdfKey = `invoices/${invoiceNumber}.pdf`;
    await this.storage.uploadFile(pdfKey, buffer, 'application/pdf');

    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: { pdfUrl: pdfKey },
    });

    await this.audit.log({
      userId,
      actionType: 'invoice_create',
      entityType: 'invoice',
      entityId: invoice.id,
      afterJson: {
        invoiceNumber,
        total,
        customerId: dto.customerId,
        saleId: dto.saleId ?? null,
      },
    });

    return this.findById(invoice.id);
  }

  async update(id: string, dto: UpdateInvoiceDto, userId: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });

    if (!invoice) {
      throw new NotFoundException(`Invoice with id "${id}" not found`);
    }

    if (invoice.status !== 'draft') {
      throw new BadRequestException('Only draft invoices can be updated');
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        ...(dto.invoiceDate && { invoiceDate: new Date(dto.invoiceDate) }),
        ...(dto.dueDate && { dueDate: new Date(dto.dueDate) }),
        ...(dto.currencyCode && { currencyCode: dto.currencyCode }),
        ...(dto.shippingTotal !== undefined && {
          shippingTotal: dto.shippingTotal,
        }),
        ...(dto.taxTotal !== undefined && { taxTotal: dto.taxTotal }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });

    await this.audit.log({
      userId,
      actionType: 'invoice_update',
      entityType: 'invoice',
      entityId: id,
      afterJson: { invoiceNumber: invoice.invoiceNumber },
    });

    return this.findById(updated.id);
  }

  async markPaid(id: string, userId: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });

    if (!invoice) {
      throw new NotFoundException(`Invoice with id "${id}" not found`);
    }

    await this.prisma.invoice.update({
      where: { id },
      data: { status: 'paid' },
    });

    await this.audit.log({
      userId,
      actionType: 'invoice_paid',
      entityType: 'invoice',
      entityId: id,
      afterJson: { invoiceNumber: invoice.invoiceNumber, status: 'paid' },
    });

    return this.findById(id);
  }

  async getPdfUrl(id: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });

    if (!invoice) {
      throw new NotFoundException(`Invoice with id "${id}" not found`);
    }

    if (!invoice.pdfUrl) {
      throw new NotFoundException(`PDF not yet generated for invoice "${id}"`);
    }

    const url = await this.storage.getSignedUrl(invoice.pdfUrl);
    return { url };
  }

  async getOverdueInvoices() {
    return this.prisma.invoice.findMany({
      where: {
        dueDate: { lt: new Date() },
        status: { not: 'paid' },
      },
      include: {
        customer: { select: { id: true, fullName: true } },
      },
      orderBy: { dueDate: 'asc' },
    });
  }
}
