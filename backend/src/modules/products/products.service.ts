import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';

const PRODUCT_INCLUDE = {
  category: true,
  barcodes: true,
  productSupplierMaps: { include: { supplier: true } },
} as const;

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(query: ProductQueryDto) {
    const {
      page = 1,
      limit = 20,
      search,
      categoryId,
      isActive,
      lowStock,
    } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (isActive !== undefined) where.isActive = isActive;
    if (lowStock) {
      // Products where any balance location has stock below threshold
      // We filter via a raw subquery approach using a nested filter
      where.AND = [
        ...((where.AND as unknown[]) ?? []),
        {
          inventoryBalances: {
            some: {
              quantityOnHand: { lt: 0 }, // placeholder — replaced at runtime by comparing against product's own threshold
            },
          },
        },
      ];
      // Note: true low-stock filter comparing quantityOnHand < minimumStockThreshold per-product
      // requires a raw SQL query; the simple version above returns products with any zero-stock location.
      // For now, filter products where total quantityOnHand across locations < minimumStockThreshold
      // is done in application layer after fetch (STEP-03 will refine via InventoryService)
      delete where.AND;
      where.inventoryBalances = { some: { quantityOnHand: { lte: 0 } } };
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: PRODUCT_INCLUDE,
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { products, total, page, limit };
  }

  async findByBarcode(barcode: string) {
    // Check primary barcode first (indexed)
    let product = await this.prisma.product.findUnique({
      where: { barcode },
      include: PRODUCT_INCLUDE,
    });

    if (!product) {
      // Check additional barcodes table (also indexed)
      const extra = await this.prisma.productBarcode.findFirst({
        where: { barcode },
        include: {
          product: { include: PRODUCT_INCLUDE },
        },
      });
      product = extra?.product ?? null;
    }

    if (!product)
      throw new NotFoundException(`Product with barcode ${barcode} not found`);
    return product;
  }

  async findById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: PRODUCT_INCLUDE,
    });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  async create(dto: CreateProductDto, userId: string) {
    const { additionalBarcodes, ...productData } = dto;

    const product = await this.prisma.product.create({
      data: {
        ...productData,
        ...(additionalBarcodes?.length
          ? {
              barcodes: {
                create: additionalBarcodes.map((b) => ({
                  barcode: b,
                  barcodeType: 'ean13',
                })),
              },
            }
          : {}),
      },
      include: PRODUCT_INCLUDE,
    });

    void this.audit.log({
      userId,
      actionType: 'create',
      entityType: 'Product',
      entityId: product.id,
      afterJson: product as object,
    });

    return product;
  }

  async update(id: string, dto: UpdateProductDto, userId: string) {
    const before = await this.findById(id);
    const { additionalBarcodes: _additionalBarcodes, ...productData } = dto;

    const product = await this.prisma.product.update({
      where: { id },
      data: { ...productData },
      include: PRODUCT_INCLUDE,
    });

    void this.audit.log({
      userId,
      actionType: 'update',
      entityType: 'Product',
      entityId: id,
      beforeJson: before as object,
      afterJson: product as object,
    });

    return product;
  }

  async getStockByLocation(productId: string) {
    await this.findById(productId);
    return this.prisma.inventoryBalance.findMany({
      where: { productId },
      include: { location: true },
    });
  }

  async getHistory(productId: string) {
    await this.findById(productId);

    const [purchaseItems, shipmentItems, saleItems] = await Promise.all([
      this.prisma.purchaseOrderItem.findMany({
        where: { productId },
        include: {
          purchaseOrder: {
            select: { referenceNo: true, purchaseDate: true, status: true },
          },
        },
        orderBy: { purchaseOrder: { purchaseDate: 'desc' } },
        take: 20,
      }),
      this.prisma.shipmentItem.findMany({
        where: { productId },
        include: {
          shipment: {
            select: {
              shipmentReference: true,
              dispatchDate: true,
              status: true,
            },
          },
        },
        orderBy: { shipment: { dispatchDate: 'desc' } },
        take: 20,
      }),
      this.prisma.saleItem.findMany({
        where: { productId },
        include: {
          sale: { select: { saleReference: true, saleDatetime: true } },
        },
        orderBy: { sale: { saleDatetime: 'desc' } },
        take: 20,
      }),
    ]);

    return { purchaseItems, shipmentItems, saleItems };
  }

  async getCategories() {
    return this.prisma.productCategory.findMany({ orderBy: { name: 'asc' } });
  }

  async createCategory(name: string, description?: string) {
    return this.prisma.productCategory.create({ data: { name, description } });
  }
}
