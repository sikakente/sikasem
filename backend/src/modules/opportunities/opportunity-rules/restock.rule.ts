import { PrismaService } from '../../../prisma/prisma.service';
import { OpportunitiesService } from '../opportunities.service';

const RESTOCK_THRESHOLD = 0.7; // 70% sell-through

export async function runRestockRule(
  prisma: PrismaService,
  opportunitiesService: OpportunitiesService,
): Promise<void> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get all balances
  const balances = await prisma.inventoryBalance.findMany({
    select: {
      productId: true,
      quantityAvailable: true,
      product: { select: { id: true, name: true } },
    },
  });

  const productIds = balances.map((b) => b.productId);

  // Sales in last 30 days
  const sales = await prisma.saleItem.groupBy({
    by: ['productId'],
    where: {
      productId: { in: productIds },
      sale: { status: 'completed', saleDatetime: { gte: thirtyDaysAgo } },
    },
    _sum: { quantity: true },
  });

  const balanceMap = new Map(balances.map((b) => [b.productId, b]));

  for (const sale of sales) {
    const balance = balanceMap.get(sale.productId);
    if (!balance) continue;

    const qtySold = Number(sale._sum.quantity ?? 0);
    const qtyAvailable = Number(balance.quantityAvailable);
    const total = qtySold + qtyAvailable;
    if (total === 0) continue;

    const sellThroughRate = qtySold / total;
    if (sellThroughRate < RESTOCK_THRESHOLD) continue;
    if (qtyAvailable > qtySold / 2) continue; // not actually low stock

    // Daily sales rate → recommended reorder qty = 30 days of stock
    const dailySalesRate = qtySold / 30;
    const recommendedReorder = Math.ceil(dailySalesRate * 30);

    await opportunitiesService.createOrSkip({
      opportunityType: 'restock',
      relatedEntityType: 'product',
      relatedEntityId: sale.productId,
      summary: `${balance.product.name} sold ${(sellThroughRate * 100).toFixed(0)}% of stock in last 30 days with only ${qtyAvailable} units remaining.`,
      recommendation: `Reorder ${recommendedReorder} units to cover 30 days of demand.`,
      score: sellThroughRate * 100,
    });
  }
}
