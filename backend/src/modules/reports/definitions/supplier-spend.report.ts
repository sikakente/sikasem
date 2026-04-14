import { ReportDefinition } from '../types';
import { ReportQueryDto } from '../dto/report-query.dto';
import { PrismaService } from '../../../prisma/prisma.service';

export const SupplierSpendReport: ReportDefinition = {
  title: 'Supplier Spend Report',
  columns: [
    { header: 'Supplier', key: 'supplier' },
    { header: 'Products Count', key: 'productsCount' },
    {
      header: 'Total Spend GBP',
      key: 'totalSpendGbp',
      format: (v) => Number(v).toFixed(2),
    },
    {
      header: 'Avg Unit Cost GBP',
      key: 'avgUnitCostGbp',
      format: (v) => Number(v).toFixed(4),
    },
    { header: 'Last Purchase Date', key: 'lastPurchaseDate' },
  ],

  async query(params: ReportQueryDto, prisma: PrismaService) {
    const dateWhere: Record<string, unknown> = {};
    if (params.dateFrom) dateWhere.gte = new Date(params.dateFrom);
    if (params.dateTo) dateWhere.lte = new Date(params.dateTo);

    const orders = await prisma.purchaseOrder.findMany({
      where: {
        ...(Object.keys(dateWhere).length > 0
          ? { purchaseDate: dateWhere }
          : {}),
        ...(params.supplierId ? { supplierId: params.supplierId } : {}),
      },
      include: {
        supplier: true,
        items: true,
      },
      orderBy: { purchaseDate: 'desc' },
    });

    const supplierMap = new Map<
      string,
      {
        name: string;
        totalSpend: number;
        totalQty: number;
        productIds: Set<string>;
        lastDate: string;
      }
    >();

    for (const order of orders) {
      const entry = supplierMap.get(order.supplierId) ?? {
        name: order.supplier.name,
        totalSpend: 0,
        totalQty: 0,
        productIds: new Set<string>(),
        lastDate: '',
      };

      for (const item of order.items) {
        entry.totalSpend += Number(item.totalCostGbp);
        entry.totalQty += Number(item.quantity);
        entry.productIds.add(item.productId);
      }

      const orderDateStr = order.purchaseDate.toISOString().split('T')[0];
      if (!entry.lastDate || orderDateStr > entry.lastDate) {
        entry.lastDate = orderDateStr;
      }

      supplierMap.set(order.supplierId, entry);
    }

    return Array.from(supplierMap.values()).map((s) => ({
      supplier: s.name,
      productsCount: s.productIds.size,
      totalSpendGbp: s.totalSpend,
      avgUnitCostGbp: s.totalQty > 0 ? s.totalSpend / s.totalQty : 0,
      lastPurchaseDate: s.lastDate,
    }));
  },

  summary(rows) {
    const total = rows.reduce((s, r) => s + (r.totalSpendGbp as number), 0);
    return {
      'Total Suppliers': rows.length,
      'Total Spend GBP': total.toFixed(2),
    };
  },
};
