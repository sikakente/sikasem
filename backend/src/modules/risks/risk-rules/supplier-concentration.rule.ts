import { PrismaService } from '../../../prisma/prisma.service';
import { RisksService } from '../risks.service';

export async function runSupplierConcentrationRule(
  prisma: PrismaService,
  risksService: RisksService,
): Promise<void> {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // Aggregate spend per supplier via purchase order items
  const items = await prisma.purchaseOrderItem.findMany({
    where: {
      purchaseOrder: {
        status: { not: 'cancelled' },
        purchaseDate: { gte: ninetyDaysAgo },
      },
    },
    select: {
      totalCostGbp: true,
      purchaseOrder: { select: { supplierId: true } },
    },
  });

  if (items.length === 0) return;

  // Group by supplierId
  const spendBySupplierId = new Map<string, number>();
  for (const item of items) {
    const supplierId = item.purchaseOrder.supplierId;
    const current = spendBySupplierId.get(supplierId) ?? 0;
    spendBySupplierId.set(supplierId, current + Number(item.totalCostGbp));
  }

  const totalSpend = Array.from(spendBySupplierId.values()).reduce(
    (sum, v) => sum + v,
    0,
  );
  if (totalSpend === 0) return;

  for (const [supplierId, supplierSpend] of spendBySupplierId) {
    const concentration = supplierSpend / totalSpend;
    if (concentration > 0.6) {
      const supplier = await prisma.supplier.findUnique({
        where: { id: supplierId },
        select: { id: true, name: true },
      });

      await risksService.createOrSkip({
        riskType: 'supplier_concentration',
        relatedEntityType: 'supplier',
        relatedEntityId: supplierId,
        summary: `Supplier ${supplier?.name ?? supplierId} accounts for ${(concentration * 100).toFixed(0)}% of purchase spend in last 90 days.`,
        recommendation: 'Diversify supplier base to reduce concentration risk.',
        score: concentration * 100,
      });
    }
  }
}
