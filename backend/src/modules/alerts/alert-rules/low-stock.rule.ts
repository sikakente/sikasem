import { PrismaService } from '../../../prisma/prisma.service';
import { AlertsService } from '../alerts.service';

export async function runLowStockRule(
  prisma: PrismaService,
  alertsService: AlertsService,
): Promise<void> {
  const balances = await prisma.inventoryBalance.findMany({
    where: {
      product: { minimumStockThreshold: { gt: 0 } },
    },
    select: {
      productId: true,
      quantityAvailable: true,
      product: {
        select: { id: true, name: true, minimumStockThreshold: true },
      },
    },
  });

  for (const balance of balances) {
    const available = Number(balance.quantityAvailable);
    const threshold = Number(balance.product.minimumStockThreshold);

    if (available <= threshold) {
      const severity = available <= 0 ? 'high' : 'medium';
      await alertsService.createOrSkip({
        alertType: 'low_stock',
        severity,
        title: `Low stock: ${balance.product.name}`,
        message: `Available quantity (${available}) is at or below minimum threshold (${threshold}).`,
        relatedEntityType: 'product',
        relatedEntityId: balance.product.id,
      });
    }
  }
}
