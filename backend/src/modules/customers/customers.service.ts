import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class CustomersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(query: CustomerQueryDto) {
    const { page = 1, limit = 20, search, customerType } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (customerType) where.customerType = customerType;
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        include: {
          _count: { select: { sales: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        sales: {
          orderBy: { saleDatetime: 'desc' },
          take: 5,
          select: {
            id: true,
            saleReference: true,
            totalGhs: true,
            saleDatetime: true,
            status: true,
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with id "${id}" not found`);
    }

    return customer;
  }

  async create(dto: CreateCustomerDto, userId: string) {
    const customer = await this.prisma.customer.create({
      data: {
        customerType: dto.customerType,
        fullName: dto.fullName,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        notes: dto.notes,
      },
    });

    await this.audit.log({
      userId,
      actionType: 'customer_create',
      entityType: 'customer',
      entityId: customer.id,
      afterJson: {
        fullName: customer.fullName,
        customerType: customer.customerType,
      },
    });

    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto, userId: string) {
    const existing = await this.prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Customer with id "${id}" not found`);
    }

    const customer = await this.prisma.customer.update({
      where: { id },
      data: {
        ...(dto.customerType !== undefined && {
          customerType: dto.customerType,
        }),
        ...(dto.fullName !== undefined && { fullName: dto.fullName }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });

    await this.audit.log({
      userId,
      actionType: 'customer_update',
      entityType: 'customer',
      entityId: id,
      beforeJson: { ...existing } as Record<string, unknown>,
      afterJson: { ...customer } as Record<string, unknown>,
    });

    return customer;
  }

  async getSalesHistory(customerId: string, query: PaginationDto) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with id "${customerId}" not found`);
    }

    const where = { customerId };

    const [data, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        select: {
          id: true,
          saleReference: true,
          totalGhs: true,
          saleDatetime: true,
          status: true,
          _count: { select: { items: true } },
        },
        orderBy: { saleDatetime: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.sale.count({ where }),
    ]);

    return { data, total, page, limit };
  }
}
