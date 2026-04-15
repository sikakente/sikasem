import { inventoryQueryTool } from './inventory-query.tool';
import { PrismaService } from '../../../prisma/prisma.service';

const mockPrisma = {
  inventoryBalance: {
    findMany: jest.fn(),
  },
} as unknown as PrismaService;

describe('inventoryQueryTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an array of inventory items from the DB', async () => {
    (mockPrisma.inventoryBalance.findMany as jest.Mock).mockResolvedValue([
      {
        productId: 'p1',
        locationId: 'l1',
        quantityOnHand: 100,
        quantityAvailable: 80,
        product: { name: 'Rice', sku: 'RICE-001', minimumStockThreshold: 20 },
      },
    ]);

    const result = (await inventoryQueryTool(mockPrisma, {})) as {
      inventory: unknown[];
      totalItems: number;
    };
    expect(result.inventory).toHaveLength(1);
    expect(result.inventory[0]).toMatchObject({
      product: 'Rice',
      sku: 'RICE-001',
    });
    expect(result.totalItems).toBe(1);
  });

  it('returns an empty array when no inventory records exist — does not throw', async () => {
    (mockPrisma.inventoryBalance.findMany as jest.Mock).mockResolvedValue([]);

    const result = (await inventoryQueryTool(mockPrisma, {})) as {
      inventory: unknown[];
      totalItems: number;
    };
    expect(result.inventory).toHaveLength(0);
    expect(result.totalItems).toBe(0);
  });
});
