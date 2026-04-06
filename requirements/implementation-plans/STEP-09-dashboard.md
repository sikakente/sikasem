# STEP-09: Dashboard

## Goal
Build the aggregated KPI dashboard — the primary daily screen for the business owner. Backend aggregation queries covering all business dimensions, mobile-first KPI card layout, sparkline charts, and drill-through to detail screens built in previous steps. After this step the owner can open the app and understand business performance at a glance.

## Prerequisites
- STEP-00, STEP-01, STEP-03 (inventory data), STEP-04 (shipments), STEP-05 (receiving/transit times), STEP-06 (sales/POS), STEP-07 (FX)

## Reference Documents
- `requirements/grocery_export_prd.md` — section 6.13 (Dashboard)
- `requirements/grocery_export_ai_design_brief.md` — section 11 (Dashboard Design)
- `requirements/grocery_export_screen_map_user_flows.md` — section 4.2, 5.9

---

## Key Decisions

### Query Strategy
Dashboard queries are read-heavy aggregations. In MVP use direct Prisma queries (no materialized views). If performance degrades with data volume, the queries can be migrated to PostgreSQL views or a caching layer later. Keep each aggregation in a separate private method — easy to move to a view later.

### Landing Cost for Profitability
Gross profit on the dashboard uses a simplified landed cost calculation:
- **Landed cost per unit** = `purchase_unit_cost_gbp + (total_shipment_costs_gbp / total_units_in_shipment)`
- **Gross profit per sale** = `(sale_unit_price_ghs / fx_rate_at_sale) - landed_cost_gbp`

This is an estimate — exact per-unit allocation is a STEP-10 reports concern. The dashboard shows "estimated gross profit" clearly labelled.

### Date Range Filtering
All dashboard endpoints accept `dateFrom` and `dateTo` query params. Default: current month for sales/revenue metrics, all-time for inventory/stock metrics.

### Mobile Layout Priority
The `GET /dashboard/summary` endpoint returns **all** top-level KPIs in a single response to minimise network requests on mobile. Individual endpoints (`/revenue`, `/shipments`, etc.) are for drilldown screens.

---

## Backend Files to Create

### `backend/src/modules/dashboard/dashboard.module.ts`
Imports `PrismaModule`.

### `backend/src/modules/dashboard/dto/dashboard-query.dto.ts`
```typescript
export class DashboardQueryDto {
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
  @IsOptional() @IsString() locationId?: string;
  @IsOptional() @IsString() categoryId?: string;
}
```

### `backend/src/modules/dashboard/dashboard.service.ts`
Private aggregation methods (each returns a typed object):

- `getRevenueSummary(query)`:
  ```
  { todayGhs, thisMonthGhs, lastMonthGhs, monthOverMonthChange, thisMonthGbpEstimate }
  ```

- `getProfitSummary(query)`:
  ```
  { estimatedGrossProfit, estimatedGrossProfitMargin, estimatedNetProfitAfterShipping }
  ```

- `getInventorySummary()`:
  ```
  { totalStockValueGbp, lowStockCount, outOfStockCount, ukStockCount, ghanaStockCount }
  ```

- `getShipmentSummary(query)`:
  ```
  { inTransitCount, delayedCount, avgTransitDays, avgTransitTrend, shippingCostThisMonthGbp }
  ```

- `getFxSummary(query)`:
  ```
  { realisedFxGainLoss, unrealisedGhsBalance, avgSaleRate, avgPurchaseRate }
  ```

- `getTopProducts(query)`:
  ```
  { bestSelling: Product[], slowMoving: Product[], highMargin: Product[] }
  ```

- `getActiveAlerts()` — count by severity, top 5 open alerts

- `getTopRisks()` — top 3 open risk records

- `getTopOpportunities()` — top 3 open opportunity records

Public method:
- `getSummary(query)` — calls all private methods in parallel (`Promise.all`) and returns combined object

### `backend/src/modules/dashboard/dashboard.controller.ts`
```
GET /api/v1/dashboard/summary      @Roles('admin','operations','finance','viewer')
GET /api/v1/dashboard/revenue      @Roles('admin','operations','finance','viewer')
GET /api/v1/dashboard/shipments    @Roles('admin','operations','finance','viewer')
GET /api/v1/dashboard/fx           @Roles('admin','finance','viewer')
GET /api/v1/dashboard/top-products @Roles('admin','operations','finance','viewer')
GET /api/v1/dashboard/risks        @Roles('admin','operations','finance','viewer')
```

---

## Frontend Files to Create

### `mobile/components/KpiCard.tsx`
```typescript
interface KpiCardProps {
  label: string;
  value: string;
  subValue?: string;         // e.g. "vs last month"
  trend?: 'up' | 'down' | 'neutral';
  trendPercent?: number;
  onPress?: () => void;
  color?: 'default' | 'warning' | 'danger' | 'success';
}
```
Tappable card that navigates to a drilldown when `onPress` is provided.

### `mobile/components/MiniChart.tsx`
Thin wrapper around `react-native-svg` (or `victory-native`). Renders a small sparkline bar or line chart. Props: `data: number[]`, `type: 'bar' | 'line'`, `color`, `height` (default 40px). Designed to fit inside a KpiCard.

### `mobile/components/RiskPanel.tsx`
```typescript
interface RiskPanelProps {
  risks: Risk[];
  onPress: (risk: Risk) => void;
}
```
Compact list of up to 3 risk cards, each showing: icon, title, severity badge, recommendation snippet.

### `mobile/components/OpportunityPanel.tsx`
Same structure as `RiskPanel` but for opportunities. Shows: icon, title, priority, estimated benefit.

### `mobile/app/(app)/dashboard/index.tsx`
Main Dashboard Screen:

Mobile layout (stacked):
1. Date range filter chips (Today / This Week / This Month / Custom)
2. Revenue + Profit KPI cards row
3. Inventory health KPI cards row (stock value, low stock count)
4. Shipment KPI cards row (in transit, delayed, avg transit)
5. FX impact card
6. Best-selling products mini-list (top 3)
7. `RiskPanel` (top 3 risks)
8. `OpportunityPanel` (top 3 opportunities)
9. Active alerts count card → taps to Alerts screen

Desktop/tablet layout (side-by-side panels).

Pull to refresh. Each section has a loading skeleton while data loads.

### `mobile/app/(app)/dashboard/revenue.tsx`
Revenue Trend Drilldown:
- Monthly revenue bar chart (last 6 months)
- GHS and GBP equivalent columns
- Day-by-day breakdown table for selected month

### `mobile/app/(app)/dashboard/shipments.tsx`
Shipment Status Drilldown:
- Status distribution pie/donut chart
- Average transit time trend line chart
- Delayed shipments list with links

### `mobile/app/(app)/dashboard/fx.tsx`
FX Impact Detail Drilldown:
- Three-panel layout: Purchase / Sale / Conversion rates over time
- Gain/loss by month chart
- Unrealised GHS balance

### `mobile/app/(app)/dashboard/products.tsx`
Product Profitability Drilldown:
- Best selling by quantity
- Best selling by revenue
- Highest margin products
- Slowest moving products

### `mobile/store/dashboard.store.ts`
```typescript
interface DashboardState {
  summary: DashboardSummary | null;
  lastFetched: Date | null;
  setSummary: (summary: DashboardSummary) => void;
}
```
Cached locally so reopening the app shows stale data instantly while fresh data loads.

### `mobile/lib/api/dashboard.api.ts`
```typescript
export const dashboardApi = {
  getSummary: (params) => client.get('/dashboard/summary', { params }),
  getRevenue: (params) => client.get('/dashboard/revenue', { params }),
  getShipments: (params) => client.get('/dashboard/shipments', { params }),
  getFx: (params) => client.get('/dashboard/fx', { params }),
  getTopProducts: (params) => client.get('/dashboard/top-products', { params }),
  getRisks: () => client.get('/dashboard/risks'),
};
```

---

## Implementation Steps

1. Create `DashboardModule` and register in `app.module.ts`
2. Implement each private aggregation method one at a time, testing with Swagger after each
3. Implement `getSummary()` using `Promise.all` — verify all sub-queries run in parallel
4. Test performance: `GET /dashboard/summary` should return in <500ms with typical data volume
5. Build `KpiCard` component — test with static data on simulator
6. Build `MiniChart` component — test sparkline renders correctly
7. Build `RiskPanel` and `OpportunityPanel` (will show empty until STEP-11)
8. Build Main Dashboard screen — wire up all sections, test loading skeletons
9. Build Revenue Trend drilldown screen
10. Build Shipment Status drilldown
11. Build FX Impact drilldown (reuses FX components from STEP-07)
12. Build Product Profitability drilldown
13. Test on a real device with data from previous steps

## Acceptance Criteria
- `GET /dashboard/summary` returns in <500ms and includes all KPI sections
- Revenue figures match the sum of `sales.total_ghs` for the selected period
- Low stock count matches products where `inventory_balances.quantity_available < products.minimum_stock_threshold`
- Delayed shipments count matches shipments where `expected_arrival_date < today` and `actual_arrival_date` is null
- Dashboard renders correctly on a small phone screen (375px wide) without horizontal overflow
- KPI cards are tappable and navigate to the correct drilldown screens
- Pull to refresh updates all sections simultaneously
- Stale data renders from store cache while fresh data loads in background
