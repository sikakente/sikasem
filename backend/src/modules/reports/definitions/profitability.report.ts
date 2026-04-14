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

export function calcRevenueGbp(lineTotalGhs: number, fxRateGbpPerGhs: number): number {
  return lineTotalGhs * fxRateGbpPerGhs;
}

export function calcGrossProfitGbp(
  revenueGbp: number,
  quantity: number,
  landedCostPerUnitGbp: number,
): number {
  return revenueGbp - quantity * landedCostPerUnitGbp;
}

export function calcMarginPct(grossProfitGbp: number, revenueGbp: number): number {
  if (revenueGbp === 0) return 0;
  return Math.round((grossProfitGbp / revenueGbp) * 10000) / 100;
}

export const ProfitabilityReport: ReportDefinition = {
  title: 'Profitability Report',
  columns: [
    { header: 'Product', key: 'product' },
    { header: 'SKU', key: 'sku' },
    { header: 'Units Sold', key: 'unitsSold', format: (v) => Number(v).toFixed(2) },
    { header: 'Revenue GHS', key: 'revenueGhs', format: (v) => Number(v).toFixed(2) },
    { header: 'Revenue GBP', key: 'revenueGbp', format: (v) => Number(v).toFixed(2) },
    { header: 'Purchase Cost GBP', key: 'purchaseCostGbp', format: (v) => Number(v).toFixed(2) },
    { header: 'Shipping Cost Alloc. GBP', key: 'shippingCostGbp', format: (v) => Number(v).toFixed(2) },
    { header: 'Landed Cost GBP', key: 'landedCostGbp', format: (v) => Number(v).toFixed(2) },
    { header: 'Gross Profit GBP', key: 'grossProfitGbp', format: (v) => Number(v).toFixed(2) },
    { header: 'Margin %', key: 'marginPct', format: (v) => Number(v).toFixed(2) },
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
          ...(Object.keys(dateWhere).length > 0 ? { saleDatetime: dateWhere } : {}),
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
    const productShipmentCost = new Map<string, { totalCost: number; totalUnits: number }>();
    for (const si of shipmentItems) {
      const entry = productShipmentCost.get(si.productId) ?? { totalCost: 0, totalUnits: 0 };
      const shipmentTotalCost = si.shipment.costs.reduce((s, c) => s + Number(c.amountGbp), 0);
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

    // 3. Aggregate by product
    const productMap = new Map<string, Record<string, unknown>>();

    for (const item of saleItems) {
      const fxRate = item.sale.fxRecords[0]
        ? Number(item.sale.fxRecords[0].exchangeRate)
        : 0;
      const lineTotal = Number(item.lineTotalGhs);
      const qty = Number(item.quantity);
      const revenueGbp = calcRevenueGbp(lineTotal, fxRate);
      const purchaseUnitCost = Number(item.batch?.sourcePurchaseItem?.unitCostGbp ?? 0);
      const shipAlloc = productShipmentCost.get(item.productId);
      const landedCost = calcLandedCostPerUnit(
        purchaseUnitCost,
        shipAlloc?.totalCost ?? 0,
        shipAlloc?.totalUnits ?? 0,
      );
      const grossProfit = calcGrossProfitGbp(revenueGbp, qty, landedCost);

      if (!productMap.has(item.productId)) {
        productMap.set(item.productId, {
          product: item.product.name,
          sku: item.product.sku,
          unitsSold: 0,
          revenueGhs: 0,
          revenueGbp: 0,
          purchaseCostGbp: 0,
          shippingCostGbp: 0,
          landedCostGbp: 0,
          grossProfitGbp: 0,
          marginPct: 0,
        });
      }

      const row = productMap.get(item.productId)!;
      row.unitsSold = (row.unitsSold as number) + qty;
      row.revenueGhs = (row.revenueGhs as number) + lineTotal;
      row.revenueGbp = (row.revenueGbp as number) + revenueGbp;
      row.purchaseCostGbp = (row.purchaseCostGbp as number) + qty * purchaseUnitCost;
      row.shippingCostGbp =
        (row.shippingCostGbp as number) +
        (shipAlloc && shipAlloc.totalUnits > 0
          ? (qty / shipAlloc.totalUnits) * shipAlloc.totalCost
          : 0);
      row.landedCostGbp = (row.landedCostGbp as number) + qty * landedCost;
      row.grossProfitGbp = (row.grossProfitGbp as number) + grossProfit;
    }

    // Compute margin %
    for (const row of productMap.values()) {
      row.marginPct = calcMarginPct(row.grossProfitGbp as number, row.revenueGbp as number);
    }

    return Array.from(productMap.values());
  },

  summary(rows) {
    const totalRevGbp = rows.reduce((s, r) => s + (r.revenueGbp as number), 0);
    const totalProfit = rows.reduce((s, r) => s + (r.grossProfitGbp as number), 0);
    const avgMargin = totalRevGbp > 0 ? calcMarginPct(totalProfit, totalRevGbp) : 0;
    return {
      'Total Revenue GBP': totalRevGbp.toFixed(2),
      'Total Gross Profit GBP': totalProfit.toFixed(2),
      'Overall Margin %': avgMargin.toFixed(2),
    };
  },
};
