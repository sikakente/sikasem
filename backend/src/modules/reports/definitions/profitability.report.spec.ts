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

  it('calcLandedCostPerUnit: returns purchase cost when totalUnitsInShipment is 0', () => {
    expect(calcLandedCostPerUnit(3.0, 100.0, 0)).toBeCloseTo(3.0, 5);
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

  it('calcMarginPct returns 0 when revenueGbp is 0', () => {
    expect(calcMarginPct(10, 0)).toBe(0);
  });

  describe('actual revenue proration (cash conversion reconciliation)', () => {
    it('prorates sale actual GBP to item by GHS weight', () => {
      // Sale has two items: 600 GHS and 400 GHS (total 1000 GHS)
      // Cash conversion delivered GBP 62 for this sale (vs 65 estimated at 0.065 rate)
      const saleActualGbp = 62;
      const totalGhsForSale = 1000;

      const item1LineTotal = 600;
      const item2LineTotal = 400;

      const item1ActualGbp = (item1LineTotal / totalGhsForSale) * saleActualGbp;
      const item2ActualGbp = (item2LineTotal / totalGhsForSale) * saleActualGbp;

      expect(item1ActualGbp).toBeCloseTo(37.2, 5);
      expect(item2ActualGbp).toBeCloseTo(24.8, 5);
      expect(item1ActualGbp + item2ActualGbp).toBeCloseTo(62, 5);
    });

    it('actual gross profit reflects FX slippage vs estimated', () => {
      // Estimated: 1000 GHS * 0.065 = GBP 65 revenue
      const revenueGbpEst = calcRevenueGbp(1000, 0.065);
      // Actual: GBP 62 received (slippage of GBP 3)
      const revenueGbpActual = 62;
      const landedCost = 5.0;
      const qty = 10;

      const grossProfitEst = calcGrossProfitGbp(revenueGbpEst, qty, landedCost);
      const grossProfitActual = calcGrossProfitGbp(
        revenueGbpActual,
        qty,
        landedCost,
      );

      expect(grossProfitEst).toBeCloseTo(15, 5);
      expect(grossProfitActual).toBeCloseTo(12, 5);
      // Margin compresses from 23.08% to 19.35% due to FX slippage
      expect(calcMarginPct(grossProfitEst, revenueGbpEst)).toBe(23.08);
      expect(calcMarginPct(grossProfitActual, revenueGbpActual)).toBe(19.35);
    });
  });
});
