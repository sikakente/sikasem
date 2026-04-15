import { PrismaService } from '../../../prisma/prisma.service';
import { OpportunitiesService } from '../opportunities.service';

export async function runShipmentConsolidationRule(
  prisma: PrismaService,
  opportunitiesService: OpportunitiesService,
): Promise<void> {
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const draftShipments = await prisma.shipment.findMany({
    where: {
      status: 'draft',
      dispatchDate: { lte: sevenDaysFromNow },
    },
    select: {
      id: true,
      shipmentReference: true,
      destinationLocationId: true,
      carrierName: true,
      dispatchDate: true,
    },
  });

  if (draftShipments.length < 2) return;

  // Group by destination + carrier
  const groups = new Map<string, typeof draftShipments>();
  for (const shipment of draftShipments) {
    const key = `${shipment.destinationLocationId ?? 'unknown'}::${shipment.carrierName ?? 'unknown'}`;
    const group = groups.get(key) ?? [];
    group.push(shipment);
    groups.set(key, group);
  }

  for (const [key, shipments] of groups) {
    if (shipments.length < 2) continue;

    const refs = shipments.map((s) => s.shipmentReference).join(', ');
    await opportunitiesService.createOrSkip({
      opportunityType: 'consolidate_shipment',
      relatedEntityType: 'shipment_group',
      relatedEntityId: key,
      summary: `${shipments.length} draft shipments (${refs}) share the same destination and carrier within a 7-day window.`,
      recommendation:
        'Consolidate into a single shipment to reduce per-shipment costs.',
      score: Math.min(shipments.length * 20, 100),
    });
  }
}
