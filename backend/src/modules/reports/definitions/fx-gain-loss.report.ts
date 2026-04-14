import { ReportDefinition } from '../types';
import { ReportQueryDto } from '../dto/report-query.dto';
import { PrismaService } from '../../../prisma/prisma.service';

interface FxEventRow {
  eventType: string;
  sourceAmount: number;
  targetAmount: number;
  eventDatetime: Date;
}

interface ConversionRow {
  conversionDate: Date;
  destinationAmount: number;
}

// Exported for unit testing
export function groupFxByMonth(
  fxRecords: FxEventRow[],
  conversions: ConversionRow[],
): Array<{ month: string; expectedGbp: number; actualGbp: number; gainLossGbp: number }> {
  const monthMap = new Map<string, { expectedGbp: number; actualGbp: number }>();

  for (const rec of fxRecords) {
    if (rec.eventType !== 'sale') continue;
    const month = rec.eventDatetime.toISOString().slice(0, 7);
    const entry = monthMap.get(month) ?? { expectedGbp: 0, actualGbp: 0 };
    entry.expectedGbp += rec.targetAmount;
    monthMap.set(month, entry);
  }

  for (const conv of conversions) {
    const month = conv.conversionDate.toISOString().slice(0, 7);
    const entry = monthMap.get(month) ?? { expectedGbp: 0, actualGbp: 0 };
    entry.actualGbp += conv.destinationAmount;
    monthMap.set(month, entry);
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { expectedGbp, actualGbp }]) => ({
      month,
      expectedGbp,
      actualGbp,
      gainLossGbp: actualGbp - expectedGbp,
    }));
}

export const FxGainLossReport: ReportDefinition = {
  title: 'FX Gain/Loss Report',
  columns: [
    { header: 'Month', key: 'month' },
    { header: 'Purchase FX Avg Rate', key: 'purchaseAvgRate', format: (v) => Number(v).toFixed(6) },
    { header: 'Purchase GHS Equiv.', key: 'purchaseGhsEquiv', format: (v) => Number(v).toFixed(2) },
    { header: 'Sale FX Avg Rate', key: 'saleAvgRate', format: (v) => Number(v).toFixed(6) },
    { header: 'Sale GBP Expected', key: 'saleGbpExpected', format: (v) => Number(v).toFixed(2) },
    { header: 'Conversion GBP Received', key: 'convGbpReceived', format: (v) => Number(v).toFixed(2) },
    { header: 'FX Gain/Loss GBP', key: 'gainLossGbp', format: (v) => Number(v).toFixed(2) },
  ],

  async query(params: ReportQueryDto, prisma: PrismaService) {
    const dateWhere: Record<string, unknown> = {};
    if (params.dateFrom) dateWhere.gte = new Date(params.dateFrom);
    if (params.dateTo) dateWhere.lte = new Date(params.dateTo);

    const [fxRecords, conversions] = await Promise.all([
      prisma.fxRecord.findMany({
        where: Object.keys(dateWhere).length > 0 ? { eventDatetime: dateWhere } : undefined,
        orderBy: { eventDatetime: 'asc' },
      }),
      prisma.cashConversion.findMany({
        where:
          Object.keys(dateWhere).length > 0 ? { conversionDate: dateWhere } : undefined,
        orderBy: { conversionDate: 'asc' },
      }),
    ]);

    // Build monthly aggregates per event type
    const monthlyData = new Map<
      string,
      {
        purchaseRates: number[];
        purchaseGhsEquiv: number;
        saleRates: number[];
        saleGbpExpected: number;
        convGbpReceived: number;
      }
    >();

    const getOrInit = (month: string) => {
      if (!monthlyData.has(month)) {
        monthlyData.set(month, {
          purchaseRates: [],
          purchaseGhsEquiv: 0,
          saleRates: [],
          saleGbpExpected: 0,
          convGbpReceived: 0,
        });
      }
      return monthlyData.get(month)!;
    };

    for (const rec of fxRecords) {
      const month = rec.eventDatetime.toISOString().slice(0, 7);
      const entry = getOrInit(month);
      const rate = Number(rec.exchangeRate);
      if (rec.eventType === 'purchase') {
        entry.purchaseRates.push(rate);
        entry.purchaseGhsEquiv += Number(rec.targetAmount);
      } else if (rec.eventType === 'sale') {
        entry.saleRates.push(rate);
        entry.saleGbpExpected += Number(rec.targetAmount);
      }
    }

    for (const conv of conversions) {
      const month = conv.conversionDate.toISOString().slice(0, 7);
      const entry = getOrInit(month);
      entry.convGbpReceived += Number(conv.destinationAmount);
    }

    return Array.from(monthlyData.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, d]) => {
        const purchaseAvgRate =
          d.purchaseRates.length > 0
            ? d.purchaseRates.reduce((s, r) => s + r, 0) / d.purchaseRates.length
            : 0;
        const saleAvgRate =
          d.saleRates.length > 0
            ? d.saleRates.reduce((s, r) => s + r, 0) / d.saleRates.length
            : 0;
        return {
          month,
          purchaseAvgRate,
          purchaseGhsEquiv: d.purchaseGhsEquiv,
          saleAvgRate,
          saleGbpExpected: d.saleGbpExpected,
          convGbpReceived: d.convGbpReceived,
          gainLossGbp: d.convGbpReceived - d.saleGbpExpected,
        };
      });
  },

  summary(rows) {
    const totalGainLoss = rows.reduce((s, r) => s + (r.gainLossGbp as number), 0);
    return {
      'Total FX Gain/Loss GBP': totalGainLoss.toFixed(2),
    };
  },
};
