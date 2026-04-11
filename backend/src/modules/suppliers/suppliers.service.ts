import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierQueryDto } from './dto/supplier-query.dto';

@Injectable()
export class SuppliersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(query: SupplierQueryDto) {
    const { page = 1, limit = 20, search, country, isActive } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (country) where.country = country;
    if (isActive !== undefined) where.isActive = isActive;

    const [suppliers, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return { suppliers, total, page, limit };
  }

  async findById(id: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException(`Supplier ${id} not found`);
    return supplier;
  }

  async create(dto: CreateSupplierDto, userId: string) {
    const supplier = await this.prisma.supplier.create({ data: { ...dto } });
    void this.audit.log({
      userId,
      actionType: 'create',
      entityType: 'Supplier',
      entityId: supplier.id,
      afterJson: supplier as object,
    });
    return supplier;
  }

  async update(id: string, dto: UpdateSupplierDto, userId: string) {
    const before = await this.findById(id);
    const supplier = await this.prisma.supplier.update({
      where: { id },
      data: { ...dto },
    });
    void this.audit.log({
      userId,
      actionType: 'update',
      entityType: 'Supplier',
      entityId: id,
      beforeJson: before as object,
      afterJson: supplier as object,
    });
    return supplier;
  }

  async deactivate(id: string, userId: string) {
    await this.findById(id);
    const supplier = await this.prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    });
    void this.audit.log({
      userId,
      actionType: 'delete',
      entityType: 'Supplier',
      entityId: id,
    });
    return supplier;
  }

  async getProductsBySupplier(supplierId: string) {
    await this.findById(supplierId);
    const maps = await this.prisma.productSupplierMap.findMany({
      where: { supplierId },
      include: { product: { include: { category: true } } },
    });
    return maps.map((m) => m.product);
  }

  async getSpendSummary(supplierId: string, from?: string, to?: string) {
    await this.findById(supplierId);

    const dateFilter: Record<string, unknown> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    const orders = await this.prisma.purchaseOrder.findMany({
      where: {
        supplierId,
        ...(Object.keys(dateFilter).length ? { purchaseDate: dateFilter } : {}),
      },
      include: { items: true },
      orderBy: { purchaseDate: 'asc' },
    });

    // Group by year-month
    const byMonth: Record<string, number> = {};
    for (const order of orders) {
      const key = order.purchaseDate.toISOString().slice(0, 7);
      const total = order.items.reduce(
        (sum, i) => sum + Number(i.totalCostGbp),
        0,
      );
      byMonth[key] = (byMonth[key] ?? 0) + total;
    }

    return Object.entries(byMonth).map(([month, totalGbp]) => ({
      month,
      totalGbp,
    }));
  }
}
