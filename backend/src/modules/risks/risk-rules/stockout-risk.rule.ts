import { PrismaService } from '../../../prisma/prisma.service';
import { RisksService } from '../risks.service';

export async function runStockoutRiskRule(
  prisma: PrismaService,
  risksService: RisksService,
): Promise<void> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Products with zero available stock
  const zeroStockBalances = await prisma.inventoryBalance.findMany({
    where: { quantityAvailable: { lte: 0 } },
    select: { productId: true, quantityAvailable: true },
  });

  if (zeroStockBalances.length === 0) return;

  const productIds = zeroStockBalances.map((b) => b.productId);

  // Check high sell-through: sold > 50% of initial stock in last 30 days
  const salesByProduct = await prisma.saleItem.groupBy({
    by: ['productId'],
    where: {
      productId: { in: productIds },
      sale: { status: 'completed', saleDatetime: { gte: thirtyDaysAgo } },
    },
    _sum: { quantity: true },
  });

  const initialStocks = await prisma.inventoryBalance.findMany({
    where: { productId: { in: productIds } },
    select: {
      productId: true,
      quantityOnHand: true,
      product: { select: { id: true, name: true } },
    },
  });

  const stockMap = new Map(initialStocks.map((s) => [s.productId, s]));

  for (const sale of salesByProduct) {
    const stock = stockMap.get(sale.productId);
    if (!stock) continue;

    const qtySold = Number(sale._sum.quantity ?? 0);
    const qtyOnHand = Number(stock.quantityOnHand);
    const total = qtySold + qtyOnHand;
    if (total === 0) continue;

    const sellThroughRate = qtySold / total;
    if (sellThroughRate > 0.5) {
      await risksService.createOrSkip({
        riskType: 'stockout',
        relatedEntityType: 'product',
        relatedEntityId: sale.productId,
        summary: `${stock.product.name} has zero available stock and sold ${(sellThroughRate * 100).toFixed(0)}% of stock in last 30 days.`,
        recommendation: 'Reorder immediately to prevent sales loss.',
        score: Math.min(sellThroughRate * 100, 100),
      });
    }
  }
}
