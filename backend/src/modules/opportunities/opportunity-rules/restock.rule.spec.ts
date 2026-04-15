import { runRestockRule } from './restock.rule';

const mockOpportunitiesService = { createOrSkip: jest.fn() };

describe('runRestockRule', () => {
  beforeEach(() => jest.clearAllMocks());

  const makePrisma = (
    balances: {
      productId: string;
      quantityAvailable: number;
      product: { id: string; name: string };
    }[],
    sales: { productId: string; _sum: { quantity: number } }[],
  ) => ({
    inventoryBalance: {
      findMany: jest.fn().mockResolvedValue(balances),
    },
    saleItem: {
      groupBy: jest.fn().mockResolvedValue(sales),
    },
  });

  it('creates an opportunity when a product sold >70% of stock and has low current stock', async () => {
    // 80 sold, 10 available → sell-through = 80/(80+10) = 88.9%, current stock is low (10 < 80/2=40)
    const prisma = makePrisma(
      [
        {
          productId: 'p1',
          quantityAvailable: 10,
          product: { id: 'p1', name: 'Widget' },
        },
      ],
      [{ productId: 'p1', _sum: { quantity: 80 } }],
    );

    await runRestockRule(prisma as any, mockOpportunitiesService as any);

    expect(mockOpportunitiesService.createOrSkip).toHaveBeenCalledWith(
      expect.objectContaining({
        opportunityType: 'restock',
        relatedEntityId: 'p1',
      }),
    );
  });

  it('includes recommended reorder quantity in the record', async () => {
    const prisma = makePrisma(
      [
        {
          productId: 'p1',
          quantityAvailable: 5,
          product: { id: 'p1', name: 'Widget' },
        },
      ],
      [{ productId: 'p1', _sum: { quantity: 90 } }],
    );

    await runRestockRule(prisma as any, mockOpportunitiesService as any);

    const call = mockOpportunitiesService.createOrSkip.mock.calls[0][0];
    expect(call.recommendation).toMatch(/\d+ units/);
  });

  it('does not create an opportunity when sell-through is below 70%', async () => {
    // 50 sold, 100 available → sell-through = 50/150 = 33%
    const prisma = makePrisma(
      [
        {
          productId: 'p2',
          quantityAvailable: 100,
          product: { id: 'p2', name: 'Gadget' },
        },
      ],
      [{ productId: 'p2', _sum: { quantity: 50 } }],
    );

    await runRestockRule(prisma as any, mockOpportunitiesService as any);

    expect(mockOpportunitiesService.createOrSkip).not.toHaveBeenCalled();
  });
});
