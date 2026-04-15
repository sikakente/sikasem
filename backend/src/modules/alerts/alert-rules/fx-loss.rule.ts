import { PrismaService } from '../../../prisma/prisma.service';
import { AlertsService } from '../alerts.service';

const FX_LOSS_THRESHOLD_GBP = 500;

export async function runFxLossRule(
  prisma: PrismaService,
  alertsService: AlertsService,
): Promise<void> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Realised gain/loss = GBP received from conversions - GBP expected from sale FX records
  const [saleRecords, conversionRows] = await Promise.all([
    prisma.fxRecord.findMany({
      where: { eventType: 'sale', eventDatetime: { gte: thirtyDaysAgo } },
      select: { targetAmount: true },
    }),
    prisma.cashConversion.findMany({
      where: { conversionDate: { gte: thirtyDaysAgo } },
      select: { destinationAmount: true },
    }),
  ]);

  const totalExpectedGbp = saleRecords.reduce(
    (sum, r) => sum + Number(r.targetAmount),
    0,
  );
  const totalGbpReceived = conversionRows.reduce(
    (sum, r) => sum + Number(r.destinationAmount),
    0,
  );
  const gainLoss = totalGbpReceived - totalExpectedGbp;

  if (gainLoss < -FX_LOSS_THRESHOLD_GBP) {
    await alertsService.createOrSkip({
      alertType: 'fx_loss',
      severity: 'high',
      title: 'FX loss threshold exceeded',
      message: `Rolling 30-day FX loss of GBP ${Math.abs(gainLoss).toFixed(2)} exceeds threshold of GBP ${FX_LOSS_THRESHOLD_GBP}.`,
      relatedEntityType: 'fx',
      relatedEntityId: 'rolling-30d',
    });
  }
}
