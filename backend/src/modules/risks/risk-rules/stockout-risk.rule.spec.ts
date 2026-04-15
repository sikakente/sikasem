import { runStockoutRiskRule } from './stockout-risk.rule';

const mockRisksService = { createOrSkip: jest.fn() };

describe('runStockoutRiskRule', () => {
  beforeEach(() => jest.clearAllMocks());

  const makeProductBalance = (
    productId: string,
    available: number,
    onHand: number,
  ) => ({
    productId,
    quantityAvailable: available,
    quantityOnHand: onHand,
    product: { id: productId, name: `Product ${productId}` },
  });

  const makePrisma = (
    zeroStockBalances: ReturnType<typeof makeProductBalance>[],
    salesData: { productId: string; _sum: { quantity: number } }[],
    allBalances?: ReturnType<typeof makeProductBalance>[],
  ) => ({
    inventoryBalance: {
      findMany: jest
        .fn()
        .mockResolvedValueOnce(zeroStockBalances)
        .mockResolvedValueOnce(allBalances ?? zeroStockBalances),
    },
    saleItem: {
      groupBy: jest.fn().mockResolvedValue(salesData),
    },
  });

  it('creates a risk record for a product with zero stock and high sell-through', async () => {
    const balances = [makeProductBalance('p1', 0, 10)];
    const sales = [{ productId: 'p1', _sum: { quantity: 60 } }];
    const prisma = makePrisma(balances, sales);

    await runStockoutRiskRule(prisma as any, mockRisksService as any);

    expect(mockRisksService.createOrSkip).toHaveBeenCalledWith(
      expect.objectContaining({ riskType: 'stockout', relatedEntityId: 'p1' }),
    );
  });

  it('does not create a duplicate if an open record already exists', async () => {
    // The rule delegates deduplication to risksService.createOrSkip.
    // Verify the rule calls createOrSkip once per qualifying product.
    const balances = [makeProductBalance('p1', 0, 10)];
    const sales = [{ productId: 'p1', _sum: { quantity: 60 } }];
    // Use mockResolvedValue (not Once) so repeated calls work
    const prisma = {
      inventoryBalance: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce(balances)
          .mockResolvedValueOnce(balances),
      },
      saleItem: { groupBy: jest.fn().mockResolvedValue(sales) },
    };

    await runStockoutRiskRule(prisma as any, mockRisksService as any);

    expect(mockRisksService.createOrSkip).toHaveBeenCalledTimes(1);
    expect(mockRisksService.createOrSkip).toHaveBeenCalledWith(
      expect.objectContaining({ riskType: 'stockout', relatedEntityId: 'p1' }),
    );
  });

  it('does not create a risk when sell-through rate is 50% or below', async () => {
    const balances = [makeProductBalance('p2', 0, 50)];
    const sales = [{ productId: 'p2', _sum: { quantity: 30 } }]; // 30/(30+50) = 37.5%
    const prisma = makePrisma(balances, sales);

    await runStockoutRiskRule(prisma as any, mockRisksService as any);

    expect(mockRisksService.createOrSkip).not.toHaveBeenCalled();
  });

  it('does nothing when no zero-stock products exist', async () => {
    const prisma = {
      inventoryBalance: { findMany: jest.fn().mockResolvedValue([]) },
      saleItem: { groupBy: jest.fn() },
    };

    await runStockoutRiskRule(prisma as any, mockRisksService as any);

    expect(prisma.saleItem.groupBy).not.toHaveBeenCalled();
    expect(mockRisksService.createOrSkip).not.toHaveBeenCalled();
  });
});
