# STEP-10: Reports and Export

## Goal
All eight report types with accurate data, filtering, and export to CSV, XLSX, and PDF. After this step the business owner and finance team can extract any report they need and share it externally.

## Prerequisites
- STEP-00, STEP-01, STEP-03 (inventory), STEP-04 (shipments), STEP-06 (sales), STEP-07 (FX), STEP-08 (invoices, PdfService)

## Reference Documents
- `requirements/grocery_export_prd.md` — section 6.13 (Reports required)
- `requirements/grocery_export_database_schema.md` — views: `vw_product_stock_summary`, `vw_shipment_transit_summary`, `vw_supplier_spend_summary`, `vw_product_profitability`, `vw_fx_impact_summary`
- `requirements/grocery_export_screen_map_user_flows.md` — section 4.14

---

## Key Decisions

### Report Definitions
Each report type is a self-contained class that defines:
1. The SQL/Prisma query
2. The column schema (headers, field mappings, formatters)
3. The summary calculations

This structure makes it easy to add new reports and keeps the `ReportsService` thin.

### Export Flow
For JSON: return data directly in the standard paginated response.
For CSV/XLSX: generate the file in memory and stream it as a download response.
For PDF: use `PdfService.renderReport()` (new method added here), upload to S3 (optional), return download URL.

### Landed Cost in Reports
Reports that include profitability use quantity-based landed cost allocation:
```
landed_cost_per_unit = purchase_unit_cost_gbp + (total_shipment_costs_gbp / total_units_in_shipment)
```
This is computed at query time from `shipment_costs` and `shipment_items`.

### Prisma Views
The schema doc recommends materialized views. In MVP, implement these as raw SQL queries in the report definitions. Add a comment `// TODO: move to Postgres view if performance degrades`. Use `prisma.$queryRaw` for complex multi-table aggregations.

---

## Backend Files to Create

### `backend/src/modules/reports/reports.module.ts`
Imports `PrismaModule`, `StorageModule`.

### `backend/src/modules/reports/dto/report-query.dto.ts`
```typescript
export class ReportQueryDto {
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
  @IsOptional() @IsString() locationId?: string;
  @IsOptional() @IsString() supplierId?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsEnum(['json','csv','xlsx','pdf']) format?: string = 'json';
  // Pagination only applies to json format
  @IsOptional() @IsInt() @Type(() => Number) page?: number = 1;
  @IsOptional() @IsInt() @Type(() => Number) limit?: number = 100;
}
```

### `backend/src/modules/reports/exporters/csv.exporter.ts`
- `export(columns: ColumnDef[], rows: object[]): Buffer`
- Uses Node.js built-in string manipulation (no extra library needed for CSV)
- Handles escaping of commas and quotes

### `backend/src/modules/reports/exporters/xlsx.exporter.ts`
- `export(columns: ColumnDef[], rows: object[], sheetName: string): Buffer`
- Uses `exceljs`. Creates workbook, adds header row with bold styling, adds data rows.

### `backend/src/modules/reports/exporters/pdf.exporter.ts`
- `export(title: string, columns: ColumnDef[], rows: object[], summary?: object): Buffer`
- Uses `pdfkit`. Renders title, date range, table with columns and rows, summary section at bottom.

### Report Definition Files (each exports a class with `query(params)` and `columns` array):

#### `backend/src/modules/reports/definitions/inventory.report.ts`
Columns: Product, SKU, Category, UK Qty, In Transit Qty, Ghana Qty, Total Qty, Estimated Value GBP, Min Threshold, Status.
Query: joins `inventory_balances`, `products`, `locations`.

#### `backend/src/modules/reports/definitions/stock-movement.report.ts`
Columns: Date, Product, Movement Type, Quantity, From Location, To Location, Reference, User.
Query: `inventory_movements` with joins.

#### `backend/src/modules/reports/definitions/shipments.report.ts`
Columns: Reference, Carrier, Dispatch Date, Expected Arrival, Actual Arrival, Transit Days, Status, Item Count, Total Shipping Cost GBP.
Query: `shipments` with `shipment_costs` sum.

#### `backend/src/modules/reports/definitions/shipping-costs.report.ts`
Columns: Shipment, Cost Type, Amount GBP, Vendor, Date.
Summary: total by cost type.
Query: `shipment_costs` with shipment details.

#### `backend/src/modules/reports/definitions/sales.report.ts`
Columns: Date, Receipt No., Customer, Items, Total GHS, Payment Method, FX Rate, GBP Equivalent, Status.
Query: `sales` with `sale_items` count, `sale_payments`, `fx_records`.

#### `backend/src/modules/reports/definitions/profitability.report.ts`
This is the most complex report. Per-product profitability:
Columns: Product, Units Sold, Revenue GHS, Revenue GBP, Purchase Cost GBP, Shipping Cost Allocated GBP, Landed Cost GBP, Gross Profit GBP, Margin %.
Query: joins `sale_items`, `purchase_order_items`, `shipment_items`, `shipment_costs`.
Uses quantity-based landed cost allocation formula.

#### `backend/src/modules/reports/definitions/supplier-spend.report.ts`
Columns: Supplier, Products Count, Total Spend GBP, Avg Unit Cost GBP, Last Purchase Date.
Query: `purchase_order_items` grouped by supplier.

#### `backend/src/modules/reports/definitions/fx-gain-loss.report.ts`
Columns: Period, Purchase FX (avg rate, total GHS equivalent), Sale FX (avg rate, total GBP equivalent), Conversion FX (total GBP received), FX Gain/Loss GBP.
Query: `fx_records` grouped by month with `cash_conversions`.

### `backend/src/modules/reports/reports.service.ts`
- `run(reportType: string, query: ReportQueryDto, userId: string)` — dispatches to correct report definition, runs query, formats via the correct exporter based on `format` param
- `getReportTypes()` — returns list of available report types with descriptions

### `backend/src/modules/reports/reports.controller.ts`
```
GET /api/v1/reports                       @Roles('admin','finance','operations','viewer') — list report types
GET /api/v1/reports/inventory             @Roles('admin','finance','operations','viewer') + @RequirePermission('reports.export') for non-json
GET /api/v1/reports/stock-movements       @Roles('admin','finance','operations','viewer')
GET /api/v1/reports/shipments             @Roles('admin','finance','operations','viewer')
GET /api/v1/reports/shipping-costs        @Roles('admin','finance','viewer')
GET /api/v1/reports/sales                 @Roles('admin','finance','viewer')
GET /api/v1/reports/profitability         @Roles('admin','finance','viewer')
GET /api/v1/reports/supplier-spend        @Roles('admin','finance','operations','viewer')
GET /api/v1/reports/fx-gain-loss          @Roles('admin','finance','viewer')
```

For CSV/XLSX/PDF responses, set correct `Content-Type` and `Content-Disposition` headers and stream the buffer.

---

## Unit Tests to Write

### `backend/src/modules/reports/exporters/csv.exporter.spec.ts`
- `export()` produces a string with a header row matching the column definitions
- `export()` escapes cell values that contain commas (wraps in quotes)
- `export()` escapes cell values that contain double-quotes (doubles the quote character)
- `export()` returns one row per data item plus the header

### `backend/src/modules/reports/exporters/xlsx.exporter.spec.ts`
- `export()` returns a `Buffer` with XLSX magic bytes
- The resulting workbook contains a sheet with the correct name
- The first row of the sheet contains the column headers in bold

### `backend/src/modules/reports/definitions/profitability.report.spec.ts`
- Landed cost calculation: given known `purchase_unit_cost_gbp`, `shipment_costs`, and `units_in_shipment`, the computed `landed_cost_per_unit` matches the expected value
- Gross profit = `(sale_unit_price_ghs / fx_rate_at_sale) - landed_cost_gbp` for a known case
- Margin % rounds to 2 decimal places

### `backend/src/modules/reports/definitions/fx-gain-loss.report.spec.ts`
- Monthly FX gain/loss total matches `GET /fx/summary` for the same period
- Rows are ordered by month ascending

---

## Frontend Files to Create

### `mobile/src/hooks/useReportExport.ts`
```typescript
export function useReportExport() {
  const exportReport = async (reportType: string, params: ReportQueryDto, format: 'csv' | 'xlsx' | 'pdf') => {
    // Call the appropriate API endpoint with format param
    // Receive file blob / URL
    // Use expo-file-system to write to device temp directory
    // Use expo-sharing to open the share sheet
  };
  return { exportReport, isExporting };
}
```

### `mobile/src/app/(app)/reports/index.tsx`
Reports Home Screen:
- List of report cards: icon, title, description
  - Inventory Report
  - Stock Movement Report
  - Shipment Performance Report
  - Shipping Cost Report
  - Sales Report
  - Profitability Report
  - Supplier Spend Report
  - FX Gain/Loss Report
- Each card → `reports/[type]`

### `mobile/src/app/(app)/reports/[type].tsx`
Generic Report Detail Screen:
- Report title and description at top
- Filter panel (collapsible on mobile):
  - Date range picker
  - Location picker (where relevant)
  - Supplier picker (where relevant)
  - Category picker (where relevant)
- "Run Report" button → fetches JSON data
- Results section: table or list depending on report type
- Export bar at bottom: CSV / Excel / PDF buttons
  - Each triggers `useReportExport` hook
  - Shows loading spinner while export is in progress
  - On success: opens native share sheet

### `mobile/src/lib/api/reports.api.ts`
```typescript
export const reportsApi = {
  list: () => client.get('/reports'),
  run: (type: string, params: ReportQueryDto) =>
    client.get(`/reports/${type}`, { params }),
  export: (type: string, params: ReportQueryDto, format: string) =>
    client.get(`/reports/${type}`, {
      params: { ...params, format },
      responseType: 'blob',
    }),
};
```

---

## Implementation Steps

1. Create `ReportsModule` and register in `app.module.ts`
2. Write unit tests for CSV and XLSX exporters first, then implement until all pass
3. Implement PDF exporter using `pdfkit` — test table layout renders correctly
4. Implement the Inventory report definition — test `GET /reports/inventory?format=json`
5. Implement and test each remaining report definition one at a time
6. Implement `ReportsService.run()` — test dispatching to correct definition and format
7. Implement `ReportsController` — test CSV and XLSX downloads via Swagger
8. Implement `useReportExport` hook — test file download and share sheet on device
9. Build Reports Home screen
10. Build Generic Report Detail screen with filter panel
11. Test each export format on a real device (CSV opens in Numbers/Excel, PDF opens in viewer)
12. Run `npm test` — all exporter and profitability report unit tests must pass
13. Test the Profitability report with real data from previous steps — verify margin calculations match unit test expectations

## Navigation Update

Update `mobile/src/app/(app)/_layout.tsx` — add the Reports tab after the Invoices entry:

```tsx
<Tabs.Screen
  name="reports"
  options={{
    title: 'Reports',
    tabBarIcon: ({ color, size }) => (
      <TabIcon name="bar-chart-outline" color={color} size={size} />
    ),
  }}
/>
```

After this step the tab bar reads: **Dashboard · Suppliers · Products · Inventory · Purchasing · Shipments · Receiving · POS · Sales · FX · Invoices · Reports**

---

## Acceptance Criteria
- Tapping the Reports tab navigates to the Reports Home screen
- All 8 report types return data matching the underlying database records
- CSV, XLSX, and PDF exports download correctly on the device
- Profitability report landed cost calculation is correct for a known test case
- FX gain/loss report matches the totals from `GET /fx/summary` (STEP-07)
- Reports respond in <2 seconds for typical data volumes
- Date range filters correctly scope results
- Export share sheet opens on device allowing user to save or share the file
- `npm test` passes — CSV escaping, XLSX buffer validity, profitability landed cost, and FX gain/loss consistency are all unit-tested
