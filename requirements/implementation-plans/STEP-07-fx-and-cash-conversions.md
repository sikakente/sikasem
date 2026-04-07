# STEP-07: FX Tracking and Cash Conversions

## Goal
Surface the FX event data already written by purchasing (STEP-03) and sales (STEP-06), add the cash conversion (GHS → GBP repatriation) workflow, and build the FX overview screen showing the full three-point FX story and gain/loss analysis. After this step the business owner can see the true GBP impact of every transaction.

## Prerequisites
- STEP-00, STEP-01, STEP-03 (purchase FX records), STEP-06 (sale FX records)

## Reference Documents
- `requirements/grocery_export_prd.md` — section 6.10 (FX Tracking at 3 points)
- `requirements/grocery_export_database_schema.md` — tables: `fx_records`, `cash_conversions`, `cash_conversion_sale_links`
- `requirements/grocery_export_ai_design_brief.md` — section 6 (Cost and Profitability Logic, Repatriation Layer)
- `requirements/grocery_export_screen_map_user_flows.md` — section 4.11

---

## Key Decisions

### Three FX Points
1. **Purchase** — written by `PurchasingService.confirm()` in STEP-03. `from_currency: GBP`, `to_currency: GHS`.
2. **Sale** — written by `SalesService.create()` in STEP-06. `from_currency: GHS`, `to_currency: GBP`.
3. **Conversion** — written by `FxService.createConversion()` in this step. The actual bank conversion of GHS cash proceeds back to GBP.

### FX Gain/Loss Calculation
- **Expected GBP from sale**: `sale_total_ghs / fx_rate_at_sale`
- **Actual GBP received**: `cash_conversion.destination_amount`
- **FX gain/loss per conversion**: `actual_gbp_received - expected_gbp`

The summary endpoint calculates this across periods, shipments, and products.

### Rate Direction Convention
All `fx_records` store rate as `GBP per 1 GHS` (i.e., `exchange_rate = 0.065` means 1 GHS = 0.065 GBP). This convention must be applied consistently by every service that writes to `fx_records`. Document this in the code as a constant.

### Cash Conversion ↔ Sales Linking
`cash_conversion_sale_links` is optional — the conversion does not need to be linked to specific sales in MVP. If `sale_id` is null, the conversion is treated as a pool-level conversion for the period.

---

## Backend Files to Create

### `backend/src/modules/fx/fx.module.ts`
Imports `PrismaModule`. Exports `FxService` (needed by purchasing and sales modules for reading FX data).

### `backend/src/modules/fx/fx.service.ts`
- `findAll(query)` — paginated FX records, filter by `event_type` (purchase/sale/conversion), date range
- `findById(id)` — single FX record with linked entity details
- `createConversion(dto, userId)` — creates `cash_conversions` row + creates `fx_records` row with `event_type: 'conversion'` + optionally creates `cash_conversion_sale_links` rows + writes audit log. `$transaction`.
- `findConversions(query)` — paginated conversions
- `findConversionById(id)` — with linked sales
- `getSummary(query)` — complex aggregation:
  ```
  {
    purchaseFx: { totalGbpSpent, totalGhsEquivalent, avgRate },
    saleFx: { totalGhsSales, totalExpectedGbp, avgRate },
    conversionFx: { totalGhsConverted, totalGbpReceived, avgRate, fees },
    realisedFxGainLoss: totalGbpReceived - totalExpectedGbp,
    unrealisedGhsBalance: totalGhsSales - totalGhsConverted,
    periodBreakdown: [{ month, purchaseFx, saleFx, conversionFx, gainLoss }]
  }
  ```
  All values filterable by `dateFrom`, `dateTo`.
- `getLatestSaleRate()` — returns the most recent `fx_records.exchange_rate` where `event_type = 'sale'`. Used by POS to pre-populate the FX rate field.

### `backend/src/modules/fx/fx.controller.ts`
```
GET  /api/v1/fx               @Roles('admin','finance','operations','viewer')
GET  /api/v1/fx/summary       @Roles('admin','finance','viewer')
GET  /api/v1/fx/latest-rate   @Roles('admin','finance','operations','pos_cashier')
GET  /api/v1/fx/:id           @Roles('admin','finance','viewer')
POST /api/v1/fx/conversions   @Roles('admin','finance') + @RequirePermission('fx.convert')
GET  /api/v1/fx/conversions   @Roles('admin','finance','viewer')
GET  /api/v1/fx/conversions/:id @Roles('admin','finance','viewer')
```

### `backend/src/modules/fx/dto/create-conversion.dto.ts`
Fields: `conversionDate`, `sourceAmountGhs`, `exchangeRate`, `destinationAmountGbp`, `feesGbp?`, `notes?`, `saleLinks?: { saleId: string, amountGhsAllocated: number }[]`.

### `backend/src/modules/fx/dto/fx-query.dto.ts`
Extends `PaginationDto`. Fields: `eventType?`, `dateFrom?`, `dateTo?`.

---

## Unit Tests to Write

### `backend/src/modules/fx/fx.service.spec.ts`
- `createConversion()` creates both a `cash_conversions` row and an `fx_records` row with `event_type: 'conversion'`
- `createConversion()` inside a `$transaction` rolls back both rows if either insert fails
- `getSummary()` calculates `realisedFxGainLoss` correctly: `totalGbpReceived - totalExpectedGbpFromSales`
- `getSummary()` `unrealisedGhsBalance` equals `totalGhsSales - totalGhsConverted`
- `getSummary()` scopes results to the provided `dateFrom`/`dateTo` range
- `getSummary()` returns a `periodBreakdown` array with one entry per calendar month in range
- `getLatestSaleRate()` returns the `exchange_rate` from the most recent `fx_records` row where `event_type = 'sale'`
- All FX rates written by this service follow the GBP-per-GHS convention (rate < 1 for typical values)

---

## Frontend Files to Create

### `mobile/src/components/FxSummaryCard.tsx`
Reusable card showing a single FX metric:
- Label (e.g. "Purchase FX", "Sale FX", "Conversion")
- Rate display
- Source and target amounts
- Gain/loss indicator (green positive, red negative)

### `mobile/src/app/(app)/fx/index.tsx`
FX Overview Screen:
- Date range filter at top (default: current month)
- Three summary cards: Purchase FX / Sale FX / Conversion FX
- Realised GBP outcome card (prominent — this is the bottom line)
- FX gain/loss trend chart (monthly bar chart)
- Unrealised GHS balance card (GHS sales not yet converted to GBP)
- "Record Conversion" FAB → `fx/conversion/new`

### `mobile/src/app/(app)/fx/[id].tsx`
FX Event Detail Screen:
- Event type badge (Purchase / Sale / Conversion)
- Source transaction link (tappable → navigates to purchase/sale/conversion detail)
- Currencies, rate, source amount, target amount
- Timestamp
- Notes

### `mobile/src/app/(app)/fx/conversion/new.tsx`
Cash Conversion Screen:
- Conversion date picker
- Source amount GHS (numeric input)
- Exchange rate (numeric input with 6 decimal places)
- GBP received (numeric input — auto-calculates from rate × amount but editable)
- Fees GBP
- Notes
- Optional: link to specific sales (multi-select from recent unlinked sales)
- Save button

### `mobile/src/app/(app)/fx/conversions/index.tsx`
Cash Conversion List Screen:
- `FlashList` of conversion records: date, GHS converted, rate, GBP received, fees, net GBP
- Filter by date range
- Running total at top: total GBP repatriated

### `mobile/src/lib/api/fx.api.ts`
```typescript
export const fxApi = {
  list: (params) => client.get('/fx', { params }),
  getSummary: (params) => client.get('/fx/summary', { params }),
  getLatestRate: () => client.get('/fx/latest-rate'),
  get: (id) => client.get(`/fx/${id}`),
  createConversion: (data) => client.post('/fx/conversions', data),
  listConversions: (params) => client.get('/fx/conversions', { params }),
  getConversion: (id) => client.get(`/fx/conversions/${id}`),
};
```

---

## Implementation Steps

1. Create `FxModule` and register in `app.module.ts`
2. Verify `fx_records` already has data from STEP-03 (purchase) and STEP-06 (sale) — run a direct DB query to confirm
3. Implement `FxService.findAll()` and `findById()` — test basic list/read endpoints
4. Implement `FxService.createConversion()` — test creates both `cash_conversions` and `fx_records` rows
5. Write unit tests for `FxService.getSummary()` first — cover purchase total, sale total, conversion total, gain/loss, and unrealised balance. Implement until all pass.
6. Implement `FxService.getLatestSaleRate()` — update `SalesService` (STEP-06) to use this as a default FX rate in the sale creation response
7. Build `FxSummaryCard` component
8. Build FX Overview screen — verify summary cards show correct values based on test data
9. Build FX Event Detail screen with navigation to linked purchase/sale
10. Build Cash Conversion screen — test form validation and record creation
11. Build Conversions List screen
12. Update POS Payment screen (STEP-06) to pre-populate FX rate from `GET /fx/latest-rate`
13. Run `npm test` — all FX unit tests must pass

## Acceptance Criteria
- `GET /fx/summary` returns accurate purchase/sale/conversion totals based on existing records
- FX gain/loss calculation is correct: `actualGbpReceived - expectedGbpFromSales`
- Creating a cash conversion creates both a `cash_conversions` row and an `fx_records` row with `event_type: 'conversion'`
- FX Overview screen shows correct totals and gain/loss for the selected date range
- FX Event Detail screen correctly links back to the source transaction (purchase or sale)
- POS Payment screen pre-populates the FX rate from the most recent sale rate
- Rate direction is consistent: all rates stored as GBP-per-GHS throughout
- `npm test` passes — `getSummary()` gain/loss and period-breakdown logic are unit-tested with known input values
