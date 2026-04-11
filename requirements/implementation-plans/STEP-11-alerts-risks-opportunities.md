# STEP-11: Alerts, Risks, and Opportunities Engine

## Goal
Implement the rule-based detection engine that continuously monitors business data and surfaces actionable alerts, risk records, and opportunity records. Build the frontend screens for viewing and acting on them. After this step the risk/opportunity panels on the Dashboard (STEP-09) become fully functional.

## Prerequisites
- STEP-00, STEP-01, STEP-03 (inventory), STEP-04 (shipments), STEP-06 (sales), STEP-07 (FX), STEP-09 (dashboard — the panels become functional)

## Reference Documents
- `requirements/grocery_export_prd.md` — sections 6.15 (Risk Detection), 6.16 (Opportunities), 6.17 (Alerts)
- `requirements/grocery_export_ai_design_brief.md` — sections 13 (Risk Engine), 14 (Opportunity Engine)
- `requirements/grocery_export_database_schema.md` — tables: `alerts`, `risk_records`, `opportunity_records`
- `requirements/grocery_export_screen_map_user_flows.md` — section 4.15

---

## Key Decisions

### Detection Architecture
Three separate scheduled jobs — one each for alerts, risks, and opportunities — run independently via `@nestjs/schedule` using `@Cron`. Each job:
1. Runs its rule functions in parallel using `Promise.allSettled` (one failing rule doesn't block others)
2. Each rule function is a self-contained async function that queries the DB and writes records if conditions are met
3. Rules are idempotent: before creating a new record, check if an open record of the same type for the same entity already exists — if so, skip or update rather than duplicate

### Schedule Timing
- Alerts job: every 30 minutes
- Risks job: once per hour
- Opportunities job: once per hour
In development, provide a manual trigger endpoint `POST /admin/run-detection` (admin only) for testing without waiting.

### Alert Deduplication
Before inserting an alert, query for any existing `open` alert with the same `alert_type` + `related_entity_type` + `related_entity_id`. If found, skip. If resolved/dismissed and condition re-occurs, create a new alert.

### Email Notifications
Alerts of severity `high` or `critical` trigger an email notification via AWS SES to users with roles `admin` and `operations`. Use the existing `@aws-sdk/client-ses` setup from the auth module. Keep email sends outside the main transaction — fire-and-forget.

---

## Backend Files to Create

### `backend/src/modules/alerts/alert-rules/low-stock.rule.ts`
Query: products where `inventory_balances.quantity_available <= products.minimum_stock_threshold` and `minimum_stock_threshold > 0`. For each: create/skip `alert` with `alert_type: 'low_stock'`, severity based on how far below threshold (high if 0, medium otherwise).

### `backend/src/modules/alerts/alert-rules/shipment-delay.rule.ts`
Query: shipments where `expected_arrival_date < today` and `actual_arrival_date IS NULL` and `status NOT IN ('received','closed','cancelled')`. For each: create/skip alert with `alert_type: 'delay'`, severity `high` if >7 days overdue, `medium` otherwise.

### `backend/src/modules/alerts/alert-rules/fx-loss.rule.ts`
Query: compute rolling 30-day FX gain/loss from `fx_records`. If total loss exceeds a configurable threshold (default: GBP 500), create alert with `alert_type: 'fx_loss'`, severity `high`.

### `backend/src/modules/alerts/alert-rules/expiry-risk.rule.ts`
Query: `inventory_batches` where `expiry_date IS NOT NULL` and `expiry_date < now + 30 days` and `remaining_quantity > 0`. For each: create alert with `alert_type: 'expiry_risk'`.

### `backend/src/modules/alerts/alerts.service.ts`
- `runAlertDetection()` — runs all 4 rule functions in `Promise.allSettled`
- `findAll(query)` — paginated, filter by severity/type/status
- `findById(id)`
- `acknowledge(id, userId)` — set status to `acknowledged`, record user and timestamp
- `resolve(id, userId)` — set status to `resolved`
- `dismiss(id, userId)` — set status to `dismissed`
- `createOrSkip(params)` — deduplication helper
- `sendEmailNotification(alert)` — SES send for high/critical alerts

### `backend/src/modules/alerts/alerts.module.ts`
Imports `PrismaModule`, `ScheduleModule` (already registered globally). Exports `AlertsService`.

### `backend/src/modules/alerts/alerts.controller.ts`
```
GET  /api/v1/alerts               @Roles('admin','operations','finance','viewer')
GET  /api/v1/alerts/:id           @Roles('admin','operations','finance','viewer')
POST /api/v1/alerts/:id/acknowledge @Roles('admin','operations','finance')
POST /api/v1/alerts/:id/resolve   @Roles('admin','operations','finance')
POST /api/v1/alerts/:id/dismiss   @Roles('admin','operations')
```

### `backend/src/modules/alerts/dto/alert-query.dto.ts`
Extends `PaginationDto`. Fields: `severity?`, `alertType?`, `status?`.

### Risk Rule Functions:

#### `backend/src/modules/risks/risk-rules/stockout-risk.rule.ts`
Products with zero available stock AND high recent sell-through (sold >50% of stock in last 30 days). Creates `risk_records` with `risk_type: 'stockout'`.

#### `backend/src/modules/risks/risk-rules/shipment-delay-pattern.rule.ts`
Carrier or route where >30% of last 10 shipments were delayed by >3 days. Creates `risk_type: 'shipment_delay'`.

#### `backend/src/modules/risks/risk-rules/margin-compression.rule.ts`
Products where gross margin has dropped >10 percentage points over the last 60 days vs the prior 60 days. Creates `risk_type: 'margin_drop'`.

#### `backend/src/modules/risks/risk-rules/supplier-concentration.rule.ts`
Any single supplier accounts for >60% of total purchase spend in the last 90 days. Creates `risk_type: 'supplier_concentration'`.

### `backend/src/modules/risks/risks.service.ts`
- `runRiskDetection()` — runs all 4 risk rules
- `findAll(query)`
- `findById(id)`
- `updateStatus(id, status, userId)` — open/monitoring/closed

### `backend/src/modules/risks/risks.module.ts`
### `backend/src/modules/risks/risks.controller.ts`
```
GET   /api/v1/risks               @Roles('admin','operations','finance','viewer')
GET   /api/v1/risks/:id           @Roles('admin','operations','finance','viewer')
PATCH /api/v1/risks/:id/status    @Roles('admin','operations','finance')
```

### Opportunity Rule Functions:

#### `backend/src/modules/opportunities/opportunity-rules/restock.rule.ts`
Products with high sell-through (sold >70% of stock in last 30 days) and low current stock. Creates `opportunity_type: 'restock'` with recommended reorder quantity.

#### `backend/src/modules/opportunities/opportunity-rules/margin-rich.rule.ts`
Products with gross margin >40% that have not been restocked in 60 days. Creates `opportunity_type: 'repricing'` (or restock opportunity).

#### `backend/src/modules/opportunities/opportunity-rules/supplier-switch.rule.ts`
Products where a cheaper supplier exists (other supplier has lower average cost for same product via `product_supplier_map`). Creates `opportunity_type: 'supplier_switch'` with estimated saving.

#### `backend/src/modules/opportunities/opportunity-rules/shipment-consolidation.rule.ts`
Multiple draft shipments with the same destination and carrier within a 7-day window. Creates `opportunity_type: 'consolidate_shipment'` with estimated cost saving.

### `backend/src/modules/opportunities/opportunities.service.ts`
- `runOpportunityDetection()`
- `findAll(query)`
- `findById(id)`
- `updateStatus(id, status, userId)` — open/acted_on/dismissed

### `backend/src/modules/opportunities/opportunities.module.ts`
### `backend/src/modules/opportunities/opportunities.controller.ts`
```
GET   /api/v1/opportunities               @Roles('admin','operations','finance','viewer')
GET   /api/v1/opportunities/:id           @Roles('admin','operations','finance','viewer')
PATCH /api/v1/opportunities/:id/status    @Roles('admin','operations')
```

### `backend/src/modules/admin/admin.controller.ts` (dev only)
```
POST /api/v1/admin/run-detection   @Roles('admin') — triggers all detection jobs manually
```
Gate behind `NODE_ENV !== 'production'` check.

---

## Unit Tests to Write

### `backend/src/modules/alerts/alerts.service.spec.ts`
- `createOrSkip()` creates an alert when no open alert with the same `alert_type + entity` exists
- `createOrSkip()` skips (returns without inserting) when an open alert for the same `alert_type + entity` already exists
- `createOrSkip()` creates a new alert when a previous alert for the same entity was `resolved` (not a duplicate)
- `runAlertDetection()` continues running remaining rules even when one rule throws an error (via `Promise.allSettled`)
- `acknowledge()` sets `status = 'acknowledged'`, `acknowledged_by`, and `acknowledged_at`
- `resolve()` sets `status = 'resolved'`
- `dismiss()` sets `status = 'dismissed'`

### `backend/src/modules/alerts/alert-rules/low-stock.rule.spec.ts`
- Creates an alert for a product where `quantity_available <= minimum_stock_threshold`
- Does **not** create an alert for a product where `quantity_available > minimum_stock_threshold`
- Sets severity to `high` when `quantity_available = 0`, `medium` otherwise

### `backend/src/modules/alerts/alert-rules/shipment-delay.rule.spec.ts`
- Creates an alert for a shipment where `expected_arrival_date < today` and `actual_arrival_date IS NULL`
- Does **not** create an alert for received or closed shipments
- Sets severity to `high` when overdue by >7 days, `medium` otherwise

### `backend/src/modules/risks/risk-rules/stockout-risk.rule.spec.ts`
- Creates a `risk_records` row for a product with zero available stock AND high recent sell-through
- Does **not** create a duplicate if an open record already exists for the same product

### `backend/src/modules/opportunities/opportunity-rules/restock.rule.spec.ts`
- Creates an opportunity record for a product that sold >70% of stock in the last 30 days and has low current stock
- Recommended reorder quantity is included in the record

---

## Frontend Files to Create

### `mobile/src/app/(app)/alerts/index.tsx`
Alerts List Screen:
- Filter bar: All / High / Medium / Low (severity tabs)
- Secondary filter: alert type chips
- `FlashList` of alert cards: severity badge (colour-coded), title, message snippet, time ago, entity link
- Swipe actions: Acknowledge (right swipe) / Dismiss (left swipe)
- Tap card → opens a bottom sheet with full message, linked entity, and Resolve/Acknowledge/Dismiss buttons

### `mobile/src/app/(app)/alerts/risks/[id].tsx`
Risk Detail Screen:
- Risk type badge
- Summary paragraph
- Affected entity link (product / supplier / shipment — navigates to that screen)
- Recommendation text
- Detected at date
- Status picker: Open / Monitoring / Closed
- Risk score (if present)

### `mobile/src/app/(app)/alerts/opportunities/index.tsx`
Opportunities Screen:
- `FlashList` of opportunity cards: type icon, title, priority badge, estimated benefit (if available), recommended action snippet
- Tap card → bottom sheet with full details and "Mark as Acted On" / "Dismiss" buttons
- Filter by type

### `mobile/src/lib/api/alerts.api.ts`
```typescript
export const alertsApi = {
  list: (params) => client.get('/alerts', { params }),
  get: (id) => client.get(`/alerts/${id}`),
  acknowledge: (id) => client.post(`/alerts/${id}/acknowledge`),
  resolve: (id) => client.post(`/alerts/${id}/resolve`),
  dismiss: (id) => client.post(`/alerts/${id}/dismiss`),
};
```

### `mobile/src/lib/api/risks.api.ts`
### `mobile/src/lib/api/opportunities.api.ts`

---

## Implementation Steps

1. Create `AlertsModule` — write unit tests for `createOrSkip()` deduplication first, then implement
2. Implement low-stock rule — test by setting a product's threshold above its current stock
3. Implement shipment-delay rule — test by creating a shipment with a past expected arrival date
4. Implement FX-loss and expiry-risk rules
5. Wire `@Cron('*/30 * * * *')` decorator on `runAlertDetection()` — confirm it runs on schedule
6. Implement `AlertsController`
7. Create `RisksModule` — implement all 4 risk rules one at a time
8. Create `OpportunitiesModule` — implement all 4 opportunity rules
9. Implement admin manual-trigger endpoint — use it to test all rules without waiting for cron
10. Verify Dashboard `getRisks()` and `getTopOpportunities()` now return real data from these tables
11. Build Alerts List screen with swipe actions
12. Build Risk Detail screen
13. Build Opportunities screen
14. Run `npm test` — all alert deduplication, rule, and detection unit tests must pass
15. Test email notification for high-severity alert via SES in a staging environment

## Navigation Update

Update `mobile/src/app/(app)/_layout.tsx` — add the Alerts tab after the Reports entry:

```tsx
<Tabs.Screen
  name="alerts"
  options={{
    title: 'Alerts',
    tabBarIcon: ({ color, size }) => (
      <TabIcon name="notifications-outline" color={color} size={size} />
    ),
  }}
/>
```

After this step the tab bar reads: **Dashboard · Suppliers · Products · Inventory · Purchasing · Shipments · Receiving · POS · Sales · FX · Invoices · Reports · Alerts**

---

## Acceptance Criteria
- Tapping the Alerts tab navigates to the Alerts List screen
- Low-stock alert is created when a product's available quantity drops below its threshold
- Shipment-delay alert is created for shipments past their expected arrival date
- Alert deduplication: running the job twice for the same condition creates only one open alert
- Resolving an alert that re-occurs creates a new alert (not a duplicate of the resolved one)
- `GET /dashboard/risks` now returns live data from `risk_records`
- Risk Detail screen shows a link to the affected entity that navigates to it
- All detection rules are idempotent — safe to run multiple times without data corruption
- `npm test` passes — deduplication, low-stock rule, delay rule, and `Promise.allSettled` fault-tolerance are all unit-tested
