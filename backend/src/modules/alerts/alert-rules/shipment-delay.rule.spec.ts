import { runShipmentDelayRule } from './shipment-delay.rule';

const mockAlertsService = { createOrSkip: jest.fn() };

const pastDate = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d;
};

const makePrisma = (
  shipments: {
    id: string;
    shipmentReference: string;
    expectedArrivalDate: Date;
  }[],
) => ({
  shipment: {
    findMany: jest.fn().mockResolvedValue(shipments),
  },
});

describe('runShipmentDelayRule', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates an alert for a shipment past expected arrival with no actual arrival', async () => {
    const prisma = makePrisma([
      {
        id: 's1',
        shipmentReference: 'SHP-001',
        expectedArrivalDate: pastDate(3),
      },
    ]);

    await runShipmentDelayRule(prisma as any, mockAlertsService as any);

    expect(mockAlertsService.createOrSkip).toHaveBeenCalledWith(
      expect.objectContaining({ alertType: 'delay', relatedEntityId: 's1' }),
    );
  });

  it('does not create an alert when no delayed shipments exist', async () => {
    const prisma = makePrisma([]);

    await runShipmentDelayRule(prisma as any, mockAlertsService as any);

    expect(mockAlertsService.createOrSkip).not.toHaveBeenCalled();
  });

  it('sets severity to high when overdue by more than 7 days', async () => {
    const prisma = makePrisma([
      {
        id: 's2',
        shipmentReference: 'SHP-002',
        expectedArrivalDate: pastDate(10),
      },
    ]);

    await runShipmentDelayRule(prisma as any, mockAlertsService as any);

    expect(mockAlertsService.createOrSkip).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'high' }),
    );
  });

  it('sets severity to medium when overdue by 7 days or fewer', async () => {
    const prisma = makePrisma([
      {
        id: 's3',
        shipmentReference: 'SHP-003',
        expectedArrivalDate: pastDate(5),
      },
    ]);

    await runShipmentDelayRule(prisma as any, mockAlertsService as any);

    expect(mockAlertsService.createOrSkip).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'medium' }),
    );
  });
});
