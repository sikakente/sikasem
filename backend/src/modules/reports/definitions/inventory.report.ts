import { ReportDefinition } from '../types';
import { ReportQueryDto } from '../dto/report-query.dto';
import { PrismaService } from '../../../prisma/prisma.service';

export const InventoryReport: ReportDefinition = {
  title: 'Inventory Report',
  columns: [
    { header: 'Product', key: 'product' },
    { header: 'SKU', key: 'sku' },
    { header: 'Category', key: 'category' },
    { header: 'UK Qty', key: 'ukQty', format: (v) => Number(v).toFixed(2) },
    { header: 'In Transit', key: 'inTransitQty', format: (v) => Number(v).toFixed(2) },
    { header: 'Ghana Qty', key: 'ghanaQty', format: (v) => Number(v).toFixed(2) },
    { header: 'Total Qty', key: 'totalQty', format: (v) => Number(v).toFixed(2) },
    { header: 'Est. Value GBP', key: 'estValueGbp', format: (v) => Number(v).toFixed(2) },
    { header: 'Min Threshold', key: 'minThreshold', format: (v) => Number(v).toFixed(2) },
    { header: 'Status', key: 'status' },
  ],

  async query(params: ReportQueryDto, prisma: PrismaService) {
    const balances = await prisma.inventoryBalance.findMany({
      include: { product: { include: { category: true } }, location: true },
      where: params.locationId ? { locationId: params.locationId } : undefined,
      orderBy: [{ product: { name: 'asc' } }],
    });

    const productMap = new Map<string, Record<string, unknown>>();

    for (const b of balances) {
      if (!productMap.has(b.productId)) {
        productMap.set(b.productId, {
          product: b.product.name,
          sku: b.product.sku,
          category: b.product.category?.name ?? '',
          ukQty: 0,
          inTransitQty: 0,
          ghanaQty: 0,
          totalQty: 0,
          estValueGbp: 0,
          minThreshold: Number(b.product.minimumStockThreshold),
          status: '',
        });
      }

      const row = productMap.get(b.productId)!;
      const qty = Number(b.quantityAvailable);
      const locType = b.location.locationType.toLowerCase();

      if (locType.includes('uk')) {
        row.ukQty = (row.ukQty as number) + qty;
      } else if (locType.includes('transit') || locType.includes('shipment')) {
        row.inTransitQty = (row.inTransitQty as number) + qty;
      } else {
        row.ghanaQty = (row.ghanaQty as number) + qty;
      }

      row.totalQty = (row.totalQty as number) + qty;
      row.estValueGbp =
        (row.estValueGbp as number) + qty * Number(b.product.defaultCostPriceGbp ?? 0);
    }

    for (const row of productMap.values()) {
      const qty = row.totalQty as number;
      const min = row.minThreshold as number;
      row.status = qty === 0 ? 'Out of Stock' : qty < min ? 'Low Stock' : 'In Stock';
    }

    return Array.from(productMap.values());
  },

  summary(rows) {
    const totalValue = rows.reduce((s, r) => s + (r.estValueGbp as number), 0);
    const outOfStock = rows.filter((r) => r.status === 'Out of Stock').length;
    const lowStock = rows.filter((r) => r.status === 'Low Stock').length;
    return {
      'Total Products': rows.length,
      'Total Est. Value GBP': totalValue.toFixed(2),
      'Out of Stock': outOfStock,
      'Low Stock': lowStock,
    };
  },
};
