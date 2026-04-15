import { PrismaService } from '../../../prisma/prisma.service';
import { AlertsService } from '../alerts.service';

export async function runShipmentDelayRule(
  prisma: PrismaService,
  alertsService: AlertsService,
): Promise<void> {
  const now = new Date();

  const delayed = await prisma.shipment.findMany({
    where: {
      expectedArrivalDate: { lt: now },
      actualArrivalDate: null,
      status: { notIn: ['received', 'closed', 'cancelled'] },
    },
    select: {
      id: true,
      shipmentReference: true,
      expectedArrivalDate: true,
    },
  });

  for (const shipment of delayed) {
    const overdueDays = Math.floor(
      (now.getTime() - new Date(shipment.expectedArrivalDate!).getTime()) /
        86400000,
    );
    const severity = overdueDays > 7 ? 'high' : 'medium';

    await alertsService.createOrSkip({
      alertType: 'delay',
      severity,
      title: `Shipment delayed: ${shipment.shipmentReference}`,
      message: `Shipment ${shipment.shipmentReference} is ${overdueDays} day(s) overdue.`,
      relatedEntityType: 'shipment',
      relatedEntityId: shipment.id,
    });
  }
}
