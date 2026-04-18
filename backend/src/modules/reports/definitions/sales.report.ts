import { ReportDefinition } from '../types';
import { ReportQueryDto } from '../dto/report-query.dto';
import { PrismaService } from '../../../prisma/prisma.service';

export const SalesReport: ReportDefinition = {
  title: 'Sales Report',
  columns: [
    { header: 'Date', key: 'date' },
    { header: 'Receipt No.', key: 'receiptNo' },
    { header: 'Customer', key: 'customer' },
    { header: 'Items', key: 'items' },
    {
      header: 'Total GHS',
      key: 'totalGhs',
      format: (v) => Number(v).toFixed(2),
    },
    { header: 'Payment Method', key: 'paymentMethod' },
    { header: 'FX Rate', key: 'fxRate', format: (v) => Number(v).toFixed(6) },
    {
      header: 'GBP Equivalent',
      key: 'gbpEquivalent',
      format: (v) => Number(v).toFixed(2),
    },
    { header: 'Status', key: 'status' },
  ],

  async query(params: ReportQueryDto, prisma: PrismaService) {
    const dateWhere: Record<string, unknown> = {};
    if (params.dateFrom) dateWhere.gte = new Date(params.dateFrom);
    if (params.dateTo) dateWhere.lte = new Date(params.dateTo);

    const limit = params.limit ?? 100;
    const page = params.page ?? 1;

    const sales = await prisma.sale.findMany({
      where: {
        ...(Object.keys(dateWhere).length > 0
          ? { saleDatetime: dateWhere }
          : {}),
        ...(params.locationId ? { locationId: params.locationId } : {}),
      },
      include: {
        customer: true,
        items: true,
        payments: true,
        fxRecords: { where: { eventType: 'sale' } },
      },
      orderBy: { saleDatetime: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return sales.map((s) => {
      const fxRate = s.fxRecords[0]?.exchangeRate
        ? Number(s.fxRecords[0].exchangeRate)
        : 0;
      const totalGhs = Number(s.totalGhs);
      const gbpEquivalent = fxRate > 0 ? totalGhs / fxRate : 0;
      const paymentMethods = [
        ...new Set(s.payments.map((p) => p.paymentMethod)),
      ].join(', ');

      return {
        date: s.saleDatetime.toISOString().split('T')[0],
        receiptNo: s.saleReference,
        customer: s.customer?.fullName ?? 'Walk-in',
        items: s.items.length,
        totalGhs,
        paymentMethod: paymentMethods,
        fxRate,
        gbpEquivalent,
        status: s.status,
      };
    });
  },

  summary(rows) {
    const totalGhs = rows.reduce((s, r) => s + (r.totalGhs as number), 0);
    const totalGbp = rows.reduce((s, r) => s + (r.gbpEquivalent as number), 0);
    const voided = rows.filter((r) => r.status === 'voided').length;
    return {
      'Total Sales': rows.length,
      'Total Revenue GHS': totalGhs.toFixed(2),
      'Total Revenue GBP Equiv.': totalGbp.toFixed(2),
      Voided: voided,
    };
  },
};
