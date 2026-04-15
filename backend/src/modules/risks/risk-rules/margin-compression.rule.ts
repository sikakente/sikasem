import { PrismaService } from '../../../prisma/prisma.service';
import { RisksService } from '../risks.service';

export async function runMarginCompressionRule(
  prisma: PrismaService,
  risksService: RisksService,
): Promise<void> {
  const now = new Date();
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const oneTwentyDaysAgo = new Date(now);
  oneTwentyDaysAgo.setDate(oneTwentyDaysAgo.getDate() - 120);

  const calcMargin = async (dateGte: Date, dateLte: Date) => {
    return prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        sale: {
          status: 'completed',
          saleDatetime: { gte: dateGte, lte: dateLte },
        },
      },
      _sum: { lineTotalGhs: true, estimatedLandedCostGbp: true },
    });
  };

  const [recentItems, priorItems] = await Promise.all([
    calcMargin(sixtyDaysAgo, now),
    calcMargin(oneTwentyDaysAgo, sixtyDaysAgo),
  ]);

  const priorMap = new Map(priorItems.map((p) => [p.productId, p]));

  const products = await prisma.product.findMany({
    where: { id: { in: recentItems.map((r) => r.productId) } },
    select: { id: true, name: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const recent of recentItems) {
    const prior = priorMap.get(recent.productId);
    if (!prior) continue;

    const recentRevenue = Number(recent._sum.lineTotalGhs ?? 0);
    const recentCost = Number(recent._sum.estimatedLandedCostGbp ?? 0);
    const priorRevenue = Number(prior._sum.lineTotalGhs ?? 0);
    const priorCost = Number(prior._sum.estimatedLandedCostGbp ?? 0);

    if (recentRevenue === 0 || priorRevenue === 0) continue;

    const recentMargin = ((recentRevenue - recentCost) / recentRevenue) * 100;
    const priorMargin = ((priorRevenue - priorCost) / priorRevenue) * 100;
    const marginDrop = priorMargin - recentMargin;

    if (marginDrop > 10) {
      const product = productMap.get(recent.productId);
      await risksService.createOrSkip({
        riskType: 'margin_drop',
        relatedEntityType: 'product',
        relatedEntityId: recent.productId,
        summary: `${product?.name ?? recent.productId} margin dropped ${marginDrop.toFixed(1)}pp over last 60 days.`,
        recommendation: 'Review pricing or supplier costs to restore margins.',
        score: Math.min(marginDrop, 100),
      });
    }
  }
}
