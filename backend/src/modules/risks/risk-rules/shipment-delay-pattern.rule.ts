import { PrismaService } from '../../../prisma/prisma.service';
import { RisksService } from '../risks.service';

export async function runShipmentDelayPatternRule(
  prisma: PrismaService,
  risksService: RisksService,
): Promise<void> {
  // Get the last 10 shipments per carrier
  const carriers = await prisma.shipment.findMany({
    distinct: ['carrierName'],
    where: { carrierName: { not: null } },
    select: { carrierName: true },
  });

  for (const { carrierName } of carriers) {
    if (!carrierName) continue;

    const recent = await prisma.shipment.findMany({
      where: { carrierName },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        expectedArrivalDate: true,
        actualArrivalDate: true,
        status: true,
      },
    });

    if (recent.length < 3) continue;

    const delayed = recent.filter((s) => {
      if (!s.expectedArrivalDate) return false;
      const arrival = s.actualArrivalDate ?? new Date();
      const overdueDays =
        (arrival.getTime() - new Date(s.expectedArrivalDate).getTime()) /
        86400000;
      return overdueDays > 3;
    });

    const delayRate = delayed.length / recent.length;
    if (delayRate > 0.3) {
      await risksService.createOrSkip({
        riskType: 'shipment_delay',
        relatedEntityType: 'carrier',
        relatedEntityId: carrierName,
        summary: `Carrier ${carrierName} has ${(delayRate * 100).toFixed(0)}% delay rate on last ${recent.length} shipments.`,
        recommendation:
          'Consider switching carrier or adjusting expected delivery windows.',
        score: delayRate * 100,
      });
    }
  }
}
