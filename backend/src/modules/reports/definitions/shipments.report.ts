import { ReportDefinition } from '../types';
import { ReportQueryDto } from '../dto/report-query.dto';
import { PrismaService } from '../../../prisma/prisma.service';

export const ShipmentsReport: ReportDefinition = {
  title: 'Shipment Performance Report',
  columns: [
    { header: 'Reference', key: 'reference' },
    { header: 'Carrier', key: 'carrier' },
    { header: 'Dispatch Date', key: 'dispatchDate' },
    { header: 'Expected Arrival', key: 'expectedArrival' },
    { header: 'Actual Arrival', key: 'actualArrival' },
    { header: 'Transit Days', key: 'transitDays' },
    { header: 'Status', key: 'status' },
    { header: 'Item Count', key: 'itemCount' },
    { header: 'Total Shipping Cost GBP', key: 'totalShippingCostGbp', format: (v) => Number(v).toFixed(2) },
  ],

  async query(params: ReportQueryDto, prisma: PrismaService) {
    const dateWhere: Record<string, unknown> = {};
    if (params.dateFrom) dateWhere.gte = new Date(params.dateFrom);
    if (params.dateTo) dateWhere.lte = new Date(params.dateTo);

    const shipments = await prisma.shipment.findMany({
      where:
        Object.keys(dateWhere).length > 0 ? { dispatchDate: dateWhere } : undefined,
      include: { costs: true, items: true },
      orderBy: { dispatchDate: 'desc' },
    });

    return shipments.map((s) => {
      const totalCost = s.costs.reduce((sum, c) => sum + Number(c.amountGbp), 0);
      let transitDays = '';
      if (s.dispatchDate && s.actualArrivalDate) {
        const diff = Math.round(
          (s.actualArrivalDate.getTime() - s.dispatchDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        transitDays = String(diff);
      }
      return {
        reference: s.shipmentReference,
        carrier: s.carrierName ?? '',
        dispatchDate: s.dispatchDate?.toISOString().split('T')[0] ?? '',
        expectedArrival: s.expectedArrivalDate?.toISOString().split('T')[0] ?? '',
        actualArrival: s.actualArrivalDate?.toISOString().split('T')[0] ?? '',
        transitDays,
        status: s.status,
        itemCount: s.items.length,
        totalShippingCostGbp: totalCost,
      };
    });
  },

  summary(rows) {
    const total = rows.reduce((s, r) => s + (r.totalShippingCostGbp as number), 0);
    const avgDays =
      rows
        .filter((r) => r.transitDays !== '')
        .reduce((s, r) => s + Number(r.transitDays), 0) /
      Math.max(1, rows.filter((r) => r.transitDays !== '').length);
    return {
      'Total Shipments': rows.length,
      'Total Shipping Cost GBP': total.toFixed(2),
      'Avg Transit Days': avgDays.toFixed(1),
    };
  },
};
