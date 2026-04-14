import { ReportDefinition } from '../types';
import { ReportQueryDto } from '../dto/report-query.dto';
import { PrismaService } from '../../../prisma/prisma.service';

export const ShippingCostsReport: ReportDefinition = {
  title: 'Shipping Cost Report',
  columns: [
    { header: 'Shipment', key: 'shipment' },
    { header: 'Cost Type', key: 'costType' },
    { header: 'Amount GBP', key: 'amountGbp', format: (v) => Number(v).toFixed(2) },
    { header: 'Vendor', key: 'vendor' },
    { header: 'Date', key: 'date' },
  ],

  async query(params: ReportQueryDto, prisma: PrismaService) {
    const dateWhere: Record<string, unknown> = {};
    if (params.dateFrom) dateWhere.gte = new Date(params.dateFrom);
    if (params.dateTo) dateWhere.lte = new Date(params.dateTo);

    const costs = await prisma.shipmentCost.findMany({
      where: Object.keys(dateWhere).length > 0 ? { costDate: dateWhere } : undefined,
      include: { shipment: true },
      orderBy: { costDate: 'desc' },
    });

    return costs.map((c) => ({
      shipment: c.shipment.shipmentReference,
      costType: c.costType,
      amountGbp: Number(c.amountGbp),
      vendor: c.vendorName ?? '',
      date: c.costDate.toISOString().split('T')[0],
    }));
  },

  summary(rows) {
    const byType = rows.reduce<Record<string, number>>((acc, r) => {
      const t = r.costType as string;
      acc[t] = (acc[t] ?? 0) + (r.amountGbp as number);
      return acc;
    }, {});
    const result: Record<string, unknown> = {
      'Total Cost GBP': rows.reduce((s, r) => s + (r.amountGbp as number), 0).toFixed(2),
    };
    for (const [type, amt] of Object.entries(byType)) {
      result[`${type} GBP`] = amt.toFixed(2);
    }
    return result;
  },
};
