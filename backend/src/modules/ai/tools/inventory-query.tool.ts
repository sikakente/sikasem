import { PrismaService } from '../../../prisma/prisma.service';

export const inventoryTool = {
  name: 'get_inventory_summary',
  description:
    'Get current stock levels, low stock products, and inventory value',
  input_schema: {
    type: 'object' as const,
    properties: {
      locationId: { type: 'string', description: 'Filter by location ID' },
      lowStockOnly: {
        type: 'boolean',
        description: 'Return only low-stock items',
      },
    },
  },
};

export async function inventoryQueryTool(
  prisma: PrismaService,
  input: { locationId?: string; lowStockOnly?: boolean },
): Promise<object> {
  const balances = await prisma.inventoryBalance.findMany({
    where: input.locationId ? { locationId: input.locationId } : undefined,
    include: {
      product: {
        select: { name: true, sku: true, minimumStockThreshold: true },
      },
    },
    orderBy: { quantityAvailable: 'asc' },
    take: 20,
  });

  const results = balances
    .filter((b) => {
      if (input.lowStockOnly) {
        return (
          Number(b.quantityAvailable) <= Number(b.product.minimumStockThreshold)
        );
      }
      return true;
    })
    .map((b) => ({
      product: b.product.name,
      sku: b.product.sku,
      quantityOnHand: Number(b.quantityOnHand),
      quantityAvailable: Number(b.quantityAvailable),
      minimumStockThreshold: Number(b.product.minimumStockThreshold),
      isLowStock:
        Number(b.quantityAvailable) <= Number(b.product.minimumStockThreshold),
    }));

  return { inventory: results, totalItems: results.length };
}
