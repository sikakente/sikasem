import { runLowStockRule } from './low-stock.rule';

const mockAlertsService = {
  createOrSkip: jest.fn(),
};

const makePrisma = (
  balances: {
    quantityAvailable: number;
    product: { id: string; name: string; minimumStockThreshold: number };
  }[],
) => ({
  inventoryBalance: {
    findMany: jest.fn().mockResolvedValue(
      balances.map((b) => ({
        productId: b.product.id,
        quantityAvailable: b.quantityAvailable,
        product: b.product,
      })),
    ),
  },
});

describe('runLowStockRule', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates an alert for a product where qty_available <= minimum_stock_threshold', async () => {
    const prisma = makePrisma([
      {
        quantityAvailable: 5,
        product: { id: 'p1', name: 'Widget', minimumStockThreshold: 10 },
      },
    ]);

    await runLowStockRule(prisma as any, mockAlertsService as any);

    expect(mockAlertsService.createOrSkip).toHaveBeenCalledWith(
      expect.objectContaining({
        alertType: 'low_stock',
        relatedEntityId: 'p1',
      }),
    );
  });

  it('does not create an alert when qty_available > minimum_stock_threshold', async () => {
    const prisma = makePrisma([
      {
        quantityAvailable: 20,
        product: { id: 'p2', name: 'Widget', minimumStockThreshold: 10 },
      },
    ]);

    await runLowStockRule(prisma as any, mockAlertsService as any);

    expect(mockAlertsService.createOrSkip).not.toHaveBeenCalled();
  });

  it('sets severity to high when qty_available is 0', async () => {
    const prisma = makePrisma([
      {
        quantityAvailable: 0,
        product: { id: 'p3', name: 'Widget', minimumStockThreshold: 5 },
      },
    ]);

    await runLowStockRule(prisma as any, mockAlertsService as any);

    expect(mockAlertsService.createOrSkip).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'high' }),
    );
  });

  it('sets severity to medium when qty_available is above 0 but at or below threshold', async () => {
    const prisma = makePrisma([
      {
        quantityAvailable: 3,
        product: { id: 'p4', name: 'Widget', minimumStockThreshold: 5 },
      },
    ]);

    await runLowStockRule(prisma as any, mockAlertsService as any);

    expect(mockAlertsService.createOrSkip).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'medium' }),
    );
  });
});
