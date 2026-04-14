import { groupFxByMonth } from './fx-gain-loss.report';

describe('FxGainLossReport', () => {
  it('rows are ordered by month ascending', () => {
    const fxRecords = [
      {
        eventType: 'sale',
        sourceAmount: 1000,
        targetAmount: 65,
        eventDatetime: new Date('2024-03-01'),
      },
      {
        eventType: 'sale',
        sourceAmount: 500,
        targetAmount: 32.5,
        eventDatetime: new Date('2024-01-15'),
      },
    ];
    const conversions: { conversionDate: Date; destinationAmount: number }[] =
      [];

    const result = groupFxByMonth(fxRecords, conversions);
    expect(result).toHaveLength(2);
    expect(result[0].month).toBe('2024-01');
    expect(result[1].month).toBe('2024-03');
  });

  it('monthly gainLossGbp = actualGbpReceived (conversions) - expectedGbp (sale fx)', () => {
    const fxRecords = [
      {
        eventType: 'sale',
        sourceAmount: 1000,
        targetAmount: 65,
        eventDatetime: new Date('2024-03-01'),
      },
    ];
    const conversions = [
      { conversionDate: new Date('2024-03-15'), destinationAmount: 52 },
    ];

    const result = groupFxByMonth(fxRecords, conversions);
    expect(result).toHaveLength(1);
    // actual 52 GBP received vs 65 GBP expected = -13
    expect(result[0].gainLossGbp).toBeCloseTo(52 - 65, 5);
  });
});
