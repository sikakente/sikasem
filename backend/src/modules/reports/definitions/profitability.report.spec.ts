import {
  calcLandedCostPerUnit,
  calcRevenueGbp,
  calcGrossProfitGbp,
  calcMarginPct,
} from './profitability.report';

describe('ProfitabilityReport calculations', () => {
  it('calcLandedCostPerUnit: purchase cost GBP + (total shipment costs / total units)', () => {
    // GBP 3.00 purchase + (GBP 100 costs / 50 units) = GBP 3.00 + GBP 2.00 = GBP 5.00
    expect(calcLandedCostPerUnit(3.0, 100.0, 50)).toBeCloseTo(5.0, 5);
  });

  it('calcGrossProfitGbp: (lineTotal GHS * fxRate) - (qty * landedCost)', () => {
    // revenue: 1000 GHS * 0.065 GBP/GHS = GBP 65
    const revenueGbp = calcRevenueGbp(1000, 0.065);
    expect(revenueGbp).toBeCloseTo(65, 5);
    // profit: 65 GBP - (10 units * GBP 5.00 landed) = GBP 15
    expect(calcGrossProfitGbp(revenueGbp, 10, 5.0)).toBeCloseTo(15, 5);
  });

  it('calcMarginPct rounds to 2 decimal places', () => {
    // 15 / 65 * 100 = 23.076923... → 23.08
    expect(calcMarginPct(15, 65)).toBe(23.08);
  });
});
