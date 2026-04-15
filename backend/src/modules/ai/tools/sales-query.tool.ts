import { PrismaService } from '../../../prisma/prisma.service';

export const salesTool = {
  name: 'get_sales_summary',
  description:
    'Get sales performance, top products, revenue, and profit estimates',
  input_schema: {
    type: 'object' as const,
    properties: {
      dateFrom: { type: 'string', description: 'Start date (ISO 8601)' },
      dateTo: { type: 'string', description: 'End date (ISO 8601)' },
      topN: {
        type: 'number',
        description: 'Number of top products to return (default 10)',
      },
    },
  },
};

export async function salesQueryTool(
  prisma: PrismaService,
  input: { dateFrom?: string; dateTo?: string; topN?: number },
): Promise<object> {
  const dateFilter: Record<string, unknown> = {};
  if (input.dateFrom) dateFilter.gte = new Date(input.dateFrom);
  if (input.dateTo) dateFilter.lte = new Date(input.dateTo);

  const saleWhere =
    Object.keys(dateFilter).length > 0 ? { saleDatetime: dateFilter } : {};

  const sales = await prisma.sale.findMany({
    where: { ...saleWhere, status: 'completed' },
    include: {
      items: {
        include: { product: { select: { name: true, sku: true } } },
      },
    },
  });

  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.totalGhs), 0);
  const totalOrders = sales.length;

  const productMap: Record<
    string,
    {
      name: string;
      sku: string;
      unitsSold: number;
      revenueGhs: number;
      estimatedCostGbp: number;
    }
  > = {};
  for (const sale of sales) {
    for (const item of sale.items) {
      const key = item.productId;
      if (!productMap[key]) {
        productMap[key] = {
          name: item.product.name,
          sku: item.product.sku,
          unitsSold: 0,
          revenueGhs: 0,
          estimatedCostGbp: 0,
        };
      }
      productMap[key].unitsSold += Number(item.quantity);
      productMap[key].revenueGhs += Number(item.lineTotalGhs);
      productMap[key].estimatedCostGbp += Number(
        item.estimatedLandedCostGbp ?? 0,
      );
    }
  }

  const topN = input.topN ?? 10;
  const topProducts = Object.values(productMap)
    .sort((a, b) => b.revenueGhs - a.revenueGhs)
    .slice(0, topN);

  return {
    totalRevenueGhs: totalRevenue.toFixed(2),
    totalOrders,
    topProducts,
    period: {
      dateFrom: input.dateFrom ?? 'all time',
      dateTo: input.dateTo ?? 'now',
    },
  };
}
