import { PrismaService } from '../../../prisma/prisma.service';
import { OpportunitiesService } from '../opportunities.service';

export async function runSupplierSwitchRule(
  prisma: PrismaService,
  opportunitiesService: OpportunitiesService,
): Promise<void> {
  // Find products with multiple suppliers (via purchase order items)
  const allItems = await prisma.purchaseOrderItem.findMany({
    select: {
      productId: true,
      unitCostGbp: true,
      purchaseOrder: { select: { supplierId: true } },
    },
  });

  // Group avg cost per (productId, supplierId)
  const costMap = new Map<
    string,
    { supplierId: string; totalCost: number; count: number }[]
  >();
  for (const item of allItems) {
    const key = item.productId;
    const entry = costMap.get(key) ?? [];
    const supplierEntry = entry.find(
      (e) => e.supplierId === item.purchaseOrder.supplierId,
    );
    if (supplierEntry) {
      supplierEntry.totalCost += Number(item.unitCostGbp);
      supplierEntry.count += 1;
    } else {
      entry.push({
        supplierId: item.purchaseOrder.supplierId,
        totalCost: Number(item.unitCostGbp),
        count: 1,
      });
    }
    costMap.set(key, entry);
  }

  const products = await prisma.product.findMany({
    select: { id: true, name: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  // Find current supplier for each product (most recent purchase)
  const latestPurchases = await prisma.purchaseOrderItem.findMany({
    orderBy: { purchaseOrder: { purchaseDate: 'desc' } },
    distinct: ['productId'],
    select: {
      productId: true,
      unitCostGbp: true,
      purchaseOrder: { select: { supplierId: true } },
    },
  });
  const currentSupplierMap = new Map(
    latestPurchases.map((p) => [
      p.productId,
      {
        supplierId: p.purchaseOrder.supplierId,
        cost: Number(p.unitCostGbp),
      },
    ]),
  );

  for (const [productId, supplierCosts] of costMap) {
    if (supplierCosts.length < 2) continue;

    const current = currentSupplierMap.get(productId);
    if (!current) continue;

    const avgCosts = supplierCosts.map((s) => ({
      supplierId: s.supplierId,
      avgCost: s.totalCost / s.count,
    }));

    const cheapest = avgCosts.reduce((min, s) =>
      s.avgCost < min.avgCost ? s : min,
    );

    if (
      cheapest.supplierId !== current.supplierId &&
      cheapest.avgCost < current.cost * 0.95
    ) {
      const saving = current.cost - cheapest.avgCost;
      const product = productMap.get(productId);
      await opportunitiesService.createOrSkip({
        opportunityType: 'supplier_switch',
        relatedEntityType: 'product',
        relatedEntityId: productId,
        summary: `${product?.name ?? productId} could be sourced cheaper from an alternative supplier (est. GBP ${saving.toFixed(2)}/unit saving).`,
        recommendation: `Switch to supplier ${cheapest.supplierId} for this product.`,
        score: Math.min((saving / current.cost) * 100, 100),
      });
    }
  }
}
