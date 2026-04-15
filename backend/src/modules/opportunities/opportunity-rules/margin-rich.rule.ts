import { PrismaService } from '../../../prisma/prisma.service';
import { OpportunitiesService } from '../opportunities.service';

export async function runMarginRichRule(
  prisma: PrismaService,
  opportunitiesService: OpportunitiesService,
): Promise<void> {
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  // Products with high gross margin (>40%) in recent sales
  const saleItems = await prisma.saleItem.groupBy({
    by: ['productId'],
    where: {
      sale: { status: 'completed' },
    },
    _sum: { lineTotalGhs: true, estimatedLandedCostGbp: true },
  });

  // Products not restocked in last 60 days
  const recentlyRestocked = await prisma.purchaseOrderItem.findMany({
    where: {
      purchaseOrder: { purchaseDate: { gte: sixtyDaysAgo } },
    },
    select: { productId: true },
    distinct: ['productId'],
  });
  const recentlyRestockedSet = new Set(
    recentlyRestocked.map((r) => r.productId),
  );

  const products = await prisma.product.findMany({
    where: { id: { in: saleItems.map((s) => s.productId) } },
    select: { id: true, name: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const item of saleItems) {
    if (recentlyRestockedSet.has(item.productId)) continue;

    const revenue = Number(item._sum.lineTotalGhs ?? 0);
    const cost = Number(item._sum.estimatedLandedCostGbp ?? 0);
    if (revenue === 0) continue;

    const margin = ((revenue - cost) / revenue) * 100;
    if (margin > 40) {
      const product = productMap.get(item.productId);
      await opportunitiesService.createOrSkip({
        opportunityType: 'repricing',
        relatedEntityType: 'product',
        relatedEntityId: item.productId,
        summary: `${product?.name ?? item.productId} has ${margin.toFixed(0)}% gross margin and has not been restocked in 60+ days.`,
        recommendation:
          'Consider repricing upward or restocking to capture demand.',
        score: Math.min(margin, 100),
      });
    }
  }
}
