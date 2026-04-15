import { salesQueryTool } from './sales-query.tool';
import { PrismaService } from '../../../prisma/prisma.service';

const mockPrisma = {
  sale: {
    findMany: jest.fn(),
  },
} as unknown as PrismaService;

describe('salesQueryTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns revenue and unit totals scoped to the provided dateFrom/dateTo', async () => {
    (mockPrisma.sale.findMany as jest.Mock).mockResolvedValue([
      {
        id: 's1',
        totalGhs: 500,
        status: 'completed',
        items: [
          {
            productId: 'p1',
            quantity: 10,
            lineTotalGhs: 500,
            estimatedLandedCostGbp: 40,
            product: { name: 'Rice', sku: 'RICE-001' },
          },
        ],
      },
      {
        id: 's2',
        totalGhs: 300,
        status: 'completed',
        items: [
          {
            productId: 'p1',
            quantity: 5,
            lineTotalGhs: 300,
            estimatedLandedCostGbp: 25,
            product: { name: 'Rice', sku: 'RICE-001' },
          },
        ],
      },
    ]);

    const result = (await salesQueryTool(mockPrisma, {
      dateFrom: '2025-01-01',
      dateTo: '2025-03-31',
    })) as {
      totalRevenueGhs: string;
      totalOrders: number;
      topProducts: unknown[];
    };

    expect(result.totalRevenueGhs).toBe('800.00');
    expect(result.totalOrders).toBe(2);
    expect(result.topProducts).toHaveLength(1);
    expect((result.topProducts[0] as { unitsSold: number }).unitsSold).toBe(15);

    // Verify the date filter was passed to Prisma
    expect(mockPrisma.sale.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          saleDatetime: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      }),
    );
  });
});
