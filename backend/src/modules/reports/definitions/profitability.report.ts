import { ReportDefinition } from '../types';
import { ReportQueryDto } from '../dto/report-query.dto';
import { PrismaService } from '../../../prisma/prisma.service';

// Pure calculation functions — exported for unit testing
export function calcLandedCostPerUnit(
  purchaseUnitCostGbp: number,
  totalShipmentCostsGbp: number,
  totalUnitsInShipment: number,
): number {
  if (totalUnitsInShipment === 0) return purchaseUnitCostGbp;
  return purchaseUnitCostGbp + totalShipmentCostsGbp / totalUnitsInShipment;
}

export function calcRevenueGbp(
  lineTotalGhs: number,
  fxRateGbpPerGhs: number,
): number {
  return lineTotalGhs * fxRateGbpPerGhs;
}

export function calcGrossProfitGbp(
  revenueGbp: number,
  quantity: number,
  landedCostPerUnitGbp: number,
): number {
  return revenueGbp - quantity * landedCostPerUnitGbp;
}

export function calcMarginPct(
  grossProfitGbp: number,
  revenueGbp: number,
): number {
  if (revenueGbp === 0) return 0;
  return Math.round((grossProfitGbp / revenueGbp) * 10000) / 100;
}

export const ProfitabilityReport: ReportDefinition = {
  title: 'Profitability Report',
  columns: [
    { header: 'Product', key: 'product' },
    { header: 'SKU', key: 'sku' },
    {
      header: 'Units Sold',
      key: 'unitsSold',
      format: (v) => Number(v).toFixed(2),
    },
    {
      header: 'Revenue GHS',
      key: 'revenueGhs',
      format: (v) => Number(v).toFixed(2),
    },
    {
      header: 'Est. Revenue GBP',
      key: 'revenueGbp',
      format: (v) => Number(v).toFixed(2),
    },
    {
      header: 'Actual Revenue GBP',
      key: 'revenueGbpActual',
      format: (v) => Number(v).toFixed(2),
    },
    {
      header: 'Purchase Cost GBP',
      key: 'purchaseCostGbp',
      format: (v) => Number(v).toFixed(2),
    },
    {
      header: 'Shipping Cost Alloc. GBP',
      key: 'shippingCostGbp',
      format: (v) => Number(v).toFixed(2),
    },
    {
      header: 'Landed Cost GBP',
      key: 'landedCostGbp',
      format: (v) => Number(v).toFixed(2),
    },
    {
      header: 'Est. Gross Profit GBP',
      key: 'grossProfitGbp',
      format: (v) => Number(v).toFixed(2),
    },
    {
      header: 'Actual Gross Profit GBP',
      key: 'grossProfitGbpActual',
      format: (v) => Number(v).toFixed(2),
    },
    {
      header: 'Est. Margin %',
      key: 'marginPct',
      format: (v) => Number(v).toFixed(2),
    },
    {
      header: 'Actual Margin %',
      key: 'marginPctActual',
      format: (v) => Number(v).toFixed(2),
    },
  ],

  async query(params: ReportQueryDto, prisma: PrismaService) {
    const dateWhere: Record<string, unknown> = {};
    if (params.dateFrom) dateWhere.gte = new Date(params.dateFrom);
    if (params.dateTo) dateWhere.lte = new Date(params.dateTo);

    // 1. Fetch sale items with product and FX rate
    const saleItems = await prisma.saleItem.findMany({
      where: {
        sale: {
          status: { not: 'voided' },
          ...(Object.keys(dateWhere).length > 0
            ? { saleDatetime: dateWhere }
            : {}),
        },
      },
      include: {
        product: true,
        sale: { include: { fxRecords: { where: { eventType: 'sale' } } } },
        batch: { include: { sourcePurchaseItem: true } },
      },
    });

    // 2. Fetch shipment cost allocation per product
    const shipmentItems = await prisma.shipmentItem.findMany({
      include: { shipment: { include: { costs: true } } },
    });

    // Build per-product shipment cost allocation map
    const productShipmentCost = new Map<
      string,
      { totalCost: number; totalUnits: number }
    >();
    for (const si of shipmentItems) {
      const entry = productShipmentCost.get(si.productId) ?? {
        totalCost: 0,
        totalUnits: 0,
      };
      const shipmentTotalCost = si.shipment.costs.reduce(
        (s, c) => s + Number(c.amountGbp),
        0,
      );
      const shipmentTotalUnits = shipmentItems
        .filter((i) => i.shipmentId === si.shipmentId)
        .reduce((s, i) => s + Number(i.quantity), 0);
      entry.totalCost +=
        shipmentTotalCost > 0 && shipmentTotalUnits > 0
          ? (Number(si.quantity) / shipmentTotalUnits) * shipmentTotalCost
          : 0;
      entry.totalUnits += Number(si.quantity);
      productShipmentCost.set(si.productId, entry);
    }

    // 3. Build per-sale actual GBP map from cash conversion links.
    // For each linked conversion: actualGbp = (amountGhsAllocated / sourceAmount) * destinationAmount.
    // Falls back to estimated revenue (fxRate × GHS) for sales with no conversion record.
    const saleIds = [...new Set(saleItems.map((i) => i.saleId))];
    const conversionLinks = await prisma.cashConversionSaleLink.findMany({
      where: { saleId: { in: saleIds } },
      include: { cashConversion: true },
    });

    const saleActualGbp = new Map<string, number>();
    for (const link of conversionLinks) {
      if (!link.saleId) continue;
      const sourceAmount = Number(link.cashConversion.sourceAmount);
      const actualGbp =
        sourceAmount > 0
          ? (Number(link.amountGhsAllocated) / sourceAmount) *
            Number(link.cashConversion.destinationAmount)
          : 0;
      saleActualGbp.set(
        link.saleId,
        (saleActualGbp.get(link.saleId) ?? 0) + actualGbp,
      );
    }

    // Pre-compute per-sale total GHS for item-level proration of actual GBP
    const saleTotalGhs = new Map<string, number>();
    for (const item of saleItems) {
      saleTotalGhs.set(
        item.saleId,
        (saleTotalGhs.get(item.saleId) ?? 0) + Number(item.lineTotalGhs),
      );
    }

    // 4. Aggregate by product
    const productMap = new Map<string, Record<string, unknown>>();

    for (const item of saleItems) {
      const fxRate = item.sale.fxRecords[0]
        ? Number(item.sale.fxRecords[0].exchangeRate)
        : 0;
      const lineTotal = Number(item.lineTotalGhs);
      const qty = Number(item.quantity);
      const revenueGbp = calcRevenueGbp(lineTotal, fxRate);

      // Actual revenue: prorate the sale's confirmed GBP by this item's GHS share.
      // Falls back to estimated when no conversion record exists for the sale.
      const saleGbpActual = saleActualGbp.get(item.saleId);
      const totalGhsForSale = saleTotalGhs.get(item.saleId) ?? lineTotal;
      const revenueGbpActual =
        saleGbpActual !== undefined && totalGhsForSale > 0
          ? (lineTotal / totalGhsForSale) * saleGbpActual
          : revenueGbp;

      const purchaseUnitCost = Number(
        item.batch?.sourcePurchaseItem?.unitCostGbp ?? 0,
      );
      const shipAlloc = productShipmentCost.get(item.productId);
      const landedCost = calcLandedCostPerUnit(
        purchaseUnitCost,
        shipAlloc?.totalCost ?? 0,
        shipAlloc?.totalUnits ?? 0,
      );
      const grossProfit = calcGrossProfitGbp(revenueGbp, qty, landedCost);
      const grossProfitActual = calcGrossProfitGbp(
        revenueGbpActual,
        qty,
        landedCost,
      );

      if (!productMap.has(item.productId)) {
        productMap.set(item.productId, {
          product: item.product.name,
          sku: item.product.sku,
          unitsSold: 0,
          revenueGhs: 0,
          revenueGbp: 0,
          revenueGbpActual: 0,
          purchaseCostGbp: 0,
          shippingCostGbp: 0,
          landedCostGbp: 0,
          grossProfitGbp: 0,
          grossProfitGbpActual: 0,
          marginPct: 0,
          marginPctActual: 0,
        });
      }

      const row = productMap.get(item.productId)!;
      row.unitsSold = (row.unitsSold as number) + qty;
      row.revenueGhs = (row.revenueGhs as number) + lineTotal;
      row.revenueGbp = (row.revenueGbp as number) + revenueGbp;
      row.revenueGbpActual =
        (row.revenueGbpActual as number) + revenueGbpActual;
      row.purchaseCostGbp =
        (row.purchaseCostGbp as number) + qty * purchaseUnitCost;
      row.shippingCostGbp =
        (row.shippingCostGbp as number) +
        (shipAlloc && shipAlloc.totalUnits > 0
          ? (qty / shipAlloc.totalUnits) * shipAlloc.totalCost
          : 0);
      row.landedCostGbp = (row.landedCostGbp as number) + qty * landedCost;
      row.grossProfitGbp = (row.grossProfitGbp as number) + grossProfit;
      row.grossProfitGbpActual =
        (row.grossProfitGbpActual as number) + grossProfitActual;
    }

    // Compute margin %
    for (const row of productMap.values()) {
      row.marginPct = calcMarginPct(
        row.grossProfitGbp as number,
        row.revenueGbp as number,
      );
      row.marginPctActual = calcMarginPct(
        row.grossProfitGbpActual as number,
        row.revenueGbpActual as number,
      );
    }

    return Array.from(productMap.values());
  },

  summary(rows) {
    const totalRevGbp = rows.reduce((s, r) => s + (r.revenueGbp as number), 0);
    const totalRevGbpActual = rows.reduce(
      (s, r) => s + (r.revenueGbpActual as number),
      0,
    );
    const totalProfit = rows.reduce(
      (s, r) => s + (r.grossProfitGbp as number),
      0,
    );
    const totalProfitActual = rows.reduce(
      (s, r) => s + (r.grossProfitGbpActual as number),
      0,
    );
    const avgMargin =
      totalRevGbp > 0 ? calcMarginPct(totalProfit, totalRevGbp) : 0;
    const avgMarginActual =
      totalRevGbpActual > 0
        ? calcMarginPct(totalProfitActual, totalRevGbpActual)
        : 0;
    return {
      'Est. Revenue GBP': totalRevGbp.toFixed(2),
      'Actual Revenue GBP': totalRevGbpActual.toFixed(2),
      'FX Slippage GBP': (totalRevGbpActual - totalRevGbp).toFixed(2),
      'Est. Gross Profit GBP': totalProfit.toFixed(2),
      'Actual Gross Profit GBP': totalProfitActual.toFixed(2),
      'Est. Margin %': avgMargin.toFixed(2),
      'Actual Margin %': avgMarginActual.toFixed(2),
    };
  },
};
