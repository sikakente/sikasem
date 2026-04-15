import { PrismaService } from '../../../prisma/prisma.service';

export const supplierTool = {
  name: 'get_supplier_summary',
  description: 'Get supplier spend, product sourcing, and cost comparisons',
  input_schema: {
    type: 'object' as const,
    properties: {
      supplierId: {
        type: 'string',
        description: 'Filter by specific supplier ID',
      },
      dateFrom: {
        type: 'string',
        description: 'Purchase date from (ISO 8601)',
      },
      dateTo: { type: 'string', description: 'Purchase date to (ISO 8601)' },
    },
  },
};

export async function supplierQueryTool(
  prisma: PrismaService,
  input: { supplierId?: string; dateFrom?: string; dateTo?: string },
): Promise<object> {
  const dateFilter: Record<string, unknown> = {};
  if (input.dateFrom) dateFilter.gte = new Date(input.dateFrom);
  if (input.dateTo) dateFilter.lte = new Date(input.dateTo);

  const poWhere: Record<string, unknown> = {};
  if (input.supplierId) poWhere.supplierId = input.supplierId;
  if (Object.keys(dateFilter).length > 0) poWhere.purchaseDate = dateFilter;

  const orders = await prisma.purchaseOrder.findMany({
    where: poWhere,
    include: {
      supplier: { select: { name: true } },
      items: {
        select: { totalCostGbp: true, quantity: true, productId: true },
      },
    },
  });

  const supplierMap: Record<
    string,
    { name: string; totalSpendGbp: number; orderCount: number }
  > = {};
  for (const order of orders) {
    const id = order.supplierId;
    if (!supplierMap[id]) {
      supplierMap[id] = {
        name: order.supplier.name,
        totalSpendGbp: 0,
        orderCount: 0,
      };
    }
    const orderTotal = order.items.reduce(
      (sum, i) => sum + Number(i.totalCostGbp),
      0,
    );
    supplierMap[id].totalSpendGbp += orderTotal;
    supplierMap[id].orderCount++;
  }

  const suppliers = Object.entries(supplierMap)
    .map(([id, s]) => ({
      supplierId: id,
      ...s,
      totalSpendGbp: s.totalSpendGbp.toFixed(2),
    }))
    .sort((a, b) => Number(b.totalSpendGbp) - Number(a.totalSpendGbp));

  return { suppliers, totalOrders: orders.length };
}
