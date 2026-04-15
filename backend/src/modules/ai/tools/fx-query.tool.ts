import { PrismaService } from '../../../prisma/prisma.service';

export const fxTool = {
  name: 'get_fx_summary',
  description: 'Get FX rates, gain/loss, and repatriation summary',
  input_schema: {
    type: 'object' as const,
    properties: {
      dateFrom: { type: 'string', description: 'Start date (ISO 8601)' },
      dateTo: { type: 'string', description: 'End date (ISO 8601)' },
    },
  },
};

export async function fxQueryTool(
  prisma: PrismaService,
  input: { dateFrom?: string; dateTo?: string },
): Promise<object> {
  const dateFilter: Record<string, unknown> = {};
  if (input.dateFrom) dateFilter.gte = new Date(input.dateFrom);
  if (input.dateTo) dateFilter.lte = new Date(input.dateTo);

  const fxWhere =
    Object.keys(dateFilter).length > 0 ? { eventDatetime: dateFilter } : {};
  const convWhere =
    Object.keys(dateFilter).length > 0 ? { conversionDate: dateFilter } : {};

  const [fxRecords, conversions] = await Promise.all([
    prisma.fxRecord.findMany({
      where: fxWhere,
      orderBy: { eventDatetime: 'desc' },
      take: 50,
    }),
    prisma.cashConversion.findMany({
      where: convWhere,
      orderBy: { conversionDate: 'desc' },
      take: 20,
    }),
  ]);

  const ghsToGbpRecords = fxRecords.filter(
    (r) => r.fromCurrency === 'GHS' && r.toCurrency === 'GBP',
  );
  const gbpToGhsRecords = fxRecords.filter(
    (r) => r.fromCurrency === 'GBP' && r.toCurrency === 'GHS',
  );

  const avgGhsToGbpRate =
    ghsToGbpRecords.length > 0
      ? ghsToGbpRecords.reduce((sum, r) => sum + Number(r.exchangeRate), 0) /
        ghsToGbpRecords.length
      : null;

  const totalRepatriated = conversions
    .filter((c) => c.sourceCurrency === 'GHS')
    .reduce((sum, c) => sum + Number(c.destinationAmount), 0);

  const totalFeesGbp = conversions.reduce(
    (sum, c) => sum + Number(c.feesGbp ?? 0),
    0,
  );

  return {
    fxRecordCount: fxRecords.length,
    avgGhsToGbpRate: avgGhsToGbpRate ? avgGhsToGbpRate.toFixed(6) : null,
    conversions: conversions.map((c) => ({
      reference: c.conversionReference,
      date: c.conversionDate,
      from: `${c.sourceAmount} ${c.sourceCurrency}`,
      to: `${c.destinationAmount} ${c.destinationCurrency}`,
      rate: Number(c.exchangeRate).toFixed(6),
      feesGbp: Number(c.feesGbp ?? 0).toFixed(2),
    })),
    totalRepatriatedGbp: totalRepatriated.toFixed(2),
    totalFeesGbp: totalFeesGbp.toFixed(2),
    recentRates: fxRecords.slice(0, 5).map((r) => ({
      eventType: r.eventType,
      from: r.fromCurrency,
      to: r.toCurrency,
      rate: Number(r.exchangeRate).toFixed(6),
      date: r.eventDatetime,
    })),
  };
}
