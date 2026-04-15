import { PrismaService } from '../../../prisma/prisma.service';
import { AlertsService } from '../alerts.service';

export async function runExpiryRiskRule(
  prisma: PrismaService,
  alertsService: AlertsService,
): Promise<void> {
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const batches = await prisma.inventoryBatch.findMany({
    where: {
      expiryDate: { not: null, lt: thirtyDaysFromNow },
      remainingQuantity: { gt: 0 },
    },
    select: {
      id: true,
      batchReference: true,
      expiryDate: true,
      remainingQuantity: true,
      product: { select: { id: true, name: true } },
    },
  });

  for (const batch of batches) {
    const daysUntilExpiry = Math.floor(
      (new Date(batch.expiryDate!).getTime() - now.getTime()) / 86400000,
    );
    const severity = daysUntilExpiry <= 7 ? 'high' : 'medium';

    await alertsService.createOrSkip({
      alertType: 'expiry_risk',
      severity,
      title: `Expiry risk: ${batch.product.name} (batch ${batch.batchReference ?? batch.id})`,
      message: `Batch expires in ${daysUntilExpiry} day(s) with ${Number(batch.remainingQuantity)} units remaining.`,
      relatedEntityType: 'product',
      relatedEntityId: batch.product.id,
    });
  }
}
