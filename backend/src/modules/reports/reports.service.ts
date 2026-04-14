// backend/src/modules/reports/reports.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportQueryDto } from './dto/report-query.dto';
import { ReportDefinition } from './types';
import { CsvExporter } from './exporters/csv.exporter';
import { XlsxExporter } from './exporters/xlsx.exporter';
import { PdfExporter } from './exporters/pdf.exporter';
import { InventoryReport } from './definitions/inventory.report';
import { StockMovementReport } from './definitions/stock-movement.report';
import { ShipmentsReport } from './definitions/shipments.report';
import { ShippingCostsReport } from './definitions/shipping-costs.report';
import { SalesReport } from './definitions/sales.report';
import { ProfitabilityReport } from './definitions/profitability.report';
import { SupplierSpendReport } from './definitions/supplier-spend.report';
import { FxGainLossReport } from './definitions/fx-gain-loss.report';

const REPORT_MAP: Record<string, ReportDefinition> = {
  inventory: InventoryReport,
  'stock-movements': StockMovementReport,
  shipments: ShipmentsReport,
  'shipping-costs': ShippingCostsReport,
  sales: SalesReport,
  profitability: ProfitabilityReport,
  'supplier-spend': SupplierSpendReport,
  'fx-gain-loss': FxGainLossReport,
};

const REPORT_META = [
  { type: 'inventory', title: 'Inventory Report', description: 'Current stock levels by location with estimated value and status.' },
  { type: 'stock-movements', title: 'Stock Movement Report', description: 'All inventory movements with movement type, quantity, and location.' },
  { type: 'shipments', title: 'Shipment Performance Report', description: 'Shipment timeline, transit days, status, and total shipping costs.' },
  { type: 'shipping-costs', title: 'Shipping Cost Report', description: 'Granular shipment costs by type with vendor and date.' },
  { type: 'sales', title: 'Sales Report', description: 'Sales transactions with FX rate, GBP equivalent, and payment method.' },
  { type: 'profitability', title: 'Profitability Report', description: 'Per-product gross profit and margin using landed cost allocation.' },
  { type: 'supplier-spend', title: 'Supplier Spend Report', description: 'Total spend per supplier with average unit cost and last purchase date.' },
  { type: 'fx-gain-loss', title: 'FX Gain/Loss Report', description: 'Monthly FX gain/loss comparing expected GBP from sales vs actual GBP from conversions.' },
];

export type ReportResult =
  | { format: 'json'; data: Record<string, unknown>[]; summary?: Record<string, unknown>; total: number; page: number; limit: number }
  | { format: 'csv' | 'xlsx' | 'pdf'; buffer: Buffer; contentType: string; filename: string };

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  getReportTypes() {
    return REPORT_META;
  }

  async run(reportType: string, query: ReportQueryDto): Promise<ReportResult> {
    const def = REPORT_MAP[reportType];
    if (!def) throw new NotFoundException(`Unknown report type: ${reportType}`);

    const rows = await def.query(query, this.prisma);
    const format = query.format ?? 'json';

    if (format === 'csv') {
      const buffer = new CsvExporter().export(def.columns, rows);
      return { format: 'csv', buffer, contentType: 'text/csv', filename: `${reportType}.csv` };
    }

    if (format === 'xlsx') {
      const buffer = await new XlsxExporter().export(def.columns, rows, def.title);
      return {
        format: 'xlsx',
        buffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `${reportType}.xlsx`,
      };
    }

    if (format === 'pdf') {
      const summary = def.summary?.(rows);
      const buffer = await new PdfExporter().export(def.title, def.columns, rows, summary);
      return {
        format: 'pdf',
        buffer,
        contentType: 'application/pdf',
        filename: `${reportType}.pdf`,
      };
    }

    // json
    const page = query.page ?? 1;
    const limit = query.limit ?? 100;
    const paginated = rows.slice((page - 1) * limit, page * limit);
    return {
      format: 'json',
      data: paginated,
      summary: def.summary?.(rows),
      total: rows.length,
      page,
      limit,
    };
  }
}
