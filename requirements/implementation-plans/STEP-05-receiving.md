# STEP-05: Goods Receiving Workflow

## Goal
The Ghana receiving workflow: confirm arrival, record actual quantities received vs expected, flag damaged and lost items, transfer stock into Ghana inventory via the movement engine, and lock the transit time. After this step the UK→transit→Ghana inventory cycle is complete and transit times become reportable.

## Prerequisites
- STEP-00, STEP-01, STEP-03 (inventory engine), STEP-04 (shipments must exist)

## Reference Documents
- `requirements/grocery_export_prd.md` — section 6.8 (Receiving Goods in Ghana)
- `requirements/grocery_export_database_schema.md` — tables: `receiving_records`, `receiving_items`
- `requirements/grocery_export_screen_map_user_flows.md` — sections 4.8, 5.5

---

## Key Decisions

### Partial Receiving
A shipment can be partially received — submit partial quantities and save without marking the shipment fully received. Full receipt is triggered by `POST /receiving/:id/submit`. Until submitted, Ghana stock is not updated.

### Discrepancy Tracking
For each `receiving_item`, the system records:
- `expected_quantity` (from `shipment_items.quantity`)
- `received_quantity` (entered by Ghana staff)
- `damaged_quantity`
- `lost_quantity`

If `received_quantity < expected_quantity`, the difference is automatically categorised as lost unless `damaged_quantity` or `lost_quantity` is specified explicitly.

### Inventory Movements on Submit
For each `receiving_item`, on submit, call `InventoryService.recordMovement()`:
- Type `receive`: from shipment virtual location → Ghana Warehouse, quantity = `received_quantity`
- Type `damage_out`: from shipment virtual location, quantity = `damaged_quantity` (if > 0)
- Type `loss_out`: from shipment virtual location, quantity = `lost_quantity` (if > 0)

All movements happen inside a single `$transaction`.

### Locking Transit Time
On submit, if `received_date` is provided and `shipment.actual_arrival_date` is null, set `actual_arrival_date` on the shipment and update status to `received`. Transit time = `actual_arrival_date - dispatch_date` in days.

---

## Backend Files to Create

### `backend/src/modules/receiving/receiving.module.ts`
Imports `PrismaModule`, `AuditModule`, `InventoryModule`, `ShipmentsModule`.

### `backend/src/modules/receiving/receiving.service.ts`
- `getQueue()` — list shipments with status `in_transit`, `dispatched`, or `arrived` that have no completed receiving record. Ordered by expected arrival date.
- `findAll(query)` — paginated list of all receiving records
- `findById(id)` — includes items with shipment item details and product info
- `create(shipmentId, dto, userId)` — creates `receiving_records` header + `receiving_items` rows. Pre-fills `expected_quantity` from `shipment_items`. Status: `partial`.
- `update(id, dto, userId)` — update quantities on existing `receiving_items` while status is `partial`
- `submit(id, userId)` — validates all items are accounted for. Inside `$transaction`:
  1. For each item with `received_quantity > 0`: `recordMovement({ type: 'receive', from: shipmentLocation, to: GhanaWarehouse, quantity: received_quantity })`
  2. For each item with `damaged_quantity > 0`: `recordMovement({ type: 'damage_out', from: shipmentLocation, quantity: damaged_quantity })`
  3. For each item with `lost_quantity > 0`: `recordMovement({ type: 'loss_out', from: shipmentLocation, quantity: lost_quantity })`
  4. Set `receiving_records.status = 'completed'`
  5. Update `shipments.actual_arrival_date` and `shipments.status = 'received'`
  6. Write audit log

### `backend/src/modules/receiving/receiving.controller.ts`
```
GET   /api/v1/receiving             @Roles('admin','operations','warehouse','finance','viewer') — history list
GET   /api/v1/receiving/queue       @Roles('admin','operations','warehouse') — pending receiving
POST  /api/v1/receiving             @Roles('admin','operations','warehouse') + @RequirePermission('shipments.receive')
GET   /api/v1/receiving/:id         @Roles('admin','operations','warehouse','finance','viewer')
PATCH /api/v1/receiving/:id         @Roles('admin','operations','warehouse')
POST  /api/v1/receiving/:id/submit  @Roles('admin','operations','warehouse') + @RequirePermission('shipments.receive')
```

### `backend/src/modules/receiving/dto/create-receiving.dto.ts`
Fields: `shipmentId`, `receivedLocationId` (defaults to Ghana Warehouse), `receivedDate`, `notes?`, `items: CreateReceivingItemDto[]`.

### `backend/src/modules/receiving/dto/create-receiving-item.dto.ts`
Fields: `shipmentItemId`, `productId`, `receivedQuantity`, `damagedQuantity?`, `lostQuantity?`, `notes?`.

### `backend/src/modules/receiving/dto/update-receiving.dto.ts`
Fields: `receivedDate?`, `notes?`, `items?: UpdateReceivingItemDto[]` (array with `id`, `receivedQuantity`, `damagedQuantity?`, `lostQuantity?`).

---

## Unit Tests to Write

### `backend/src/modules/receiving/receiving.service.spec.ts`
- `create()` pre-fills `expected_quantity` from the shipment item's quantity
- `update()` updates item quantities while status is `partial`
- `update()` throws `ConflictException` when the receiving record is already `completed`
- `submit()` calls `InventoryService.recordMovement({ type: 'receive', from: shipmentLocation, to: GhanaWarehouse })` for each item where `received_quantity > 0`
- `submit()` calls `InventoryService.recordMovement({ type: 'damage_out' })` for each item where `damaged_quantity > 0`
- `submit()` calls `InventoryService.recordMovement({ type: 'loss_out' })` for each item where `lost_quantity > 0`
- `submit()` sets `receiving_records.status = 'completed'` inside the transaction
- `submit()` sets `shipment.actual_arrival_date` and `shipment.status = 'received'` atomically
- `submit()` does **not** call `recordMovement()` when called with `received_quantity = 0` for all items (partial save)
- `getQueue()` returns only shipments with status `in_transit`, `dispatched`, or `arrived` that have no completed receiving record

---

## Frontend Files to Create

### `mobile/src/components/ReceivingLineItem.tsx`
Mobile-optimised per-product card for the receiving workflow:
- Product name and expected quantity at top
- Three numeric stepper inputs stacked: Received / Damaged / Lost
- Steppers have large tap targets (+/- buttons) plus direct numeric input
- Highlights in red if received + damaged + lost < expected (shortage warning)
- Notes field (collapsible)

### `mobile/src/app/(app)/receiving/index.tsx`
Receiving Queue Screen:
- Sections: "Pending Receipt" (in_transit/dispatched shipments) and "Recent Receipts"
- Pending cards show shipment reference, carrier, expected arrival date, item count
- Overdue arrivals highlighted in red
- Tap → `receiving/[shipmentId]`

### `mobile/src/app/(app)/receiving/[shipmentId].tsx`
Receive Shipment Screen:
- Shipment header summary (reference, carrier, expected vs actual arrival date input)
- Per-item cards using `ReceivingLineItem` component
- Running totals: expected vs received quantities
- Discrepancy banner if totals don't match
- "Save Progress" button (partial save — does not move stock)
- "Confirm Receipt" button — shows confirmation dialog, then submits
- Designed for one-handed phone use with large inputs

### `mobile/src/app/(app)/receiving/history.tsx`
Receiving History Screen:
- `FlashList` of completed receiving records
- Each row: shipment reference, received date, item count, discrepancy count
- Filter by date range

### `mobile/src/lib/api/receiving.api.ts`
```typescript
export const receivingApi = {
  getQueue: () => client.get('/receiving/queue'),
  list: (params) => client.get('/receiving', { params }),
  get: (id) => client.get(`/receiving/${id}`),
  create: (data) => client.post('/receiving', data),
  update: (id, data) => client.patch(`/receiving/${id}`, data),
  submit: (id) => client.post(`/receiving/${id}/submit`),
};
```

---

## Implementation Steps

1. Create `ReceivingModule` and wire into `app.module.ts`
2. Implement `ReceivingService.getQueue()` — test it returns dispatched/in-transit shipments
3. Implement `ReceivingService.create()` — test pre-filling of expected quantities from shipment items
4. Implement `ReceivingService.update()` — test partial quantity updates
5. Write unit tests for `ReceivingService.submit()` first — this is the most critical method. Cover:
   - Confirm Ghana inventory increases by `received_quantity`
   - Confirm shipment virtual location decreases by total of received + damaged + lost
   - Confirm `actual_arrival_date` is set on the shipment
   - Confirm shipment status becomes `received`
   - Confirm `damage_out` and `loss_out` movements are created for non-zero quantities
6. Implement `ReceivingController`
7. Build `ReceivingLineItem` component — test on simulator with large/small screens
8. Build Receiving Queue screen
9. Build Receive Shipment screen with line items
10. Run `npm test` — all receiving unit tests must pass before building frontend
11. Test full flow: dispatch shipment in STEP-04 → queue shows it → receive it → Ghana stock increases

## Navigation Update

Update `mobile/src/app/(app)/_layout.tsx` — add the Receiving tab after the Shipments entry:

```tsx
<Tabs.Screen
  name="receiving"
  options={{
    title: 'Receiving',
    tabBarIcon: ({ color, size }) => (
      <TabIcon name="download-outline" color={color} size={size} />
    ),
  }}
/>
```

After this step the tab bar reads: **Home · Suppliers · Products · Inventory · Purchasing · Shipments · Receiving**

---

## Acceptance Criteria
- Tapping the Receiving tab from any other tab navigates to the Receiving Queue screen
- Submitting a receiving record atomically creates all movement records and updates shipment status in one transaction
- Ghana `inventory_balances` shows the received quantity after submit
- UK/transit `inventory_balances` is reduced by the full shipped quantity (received + damaged + lost)
- Damaged and lost quantities create separate `damage_out` and `loss_out` movement records
- `shipment.actual_arrival_date` is set and `transit_days` can be calculated as `actual_arrival_date - dispatch_date`
- Partial save does NOT move stock — only `submit` triggers inventory movements
- Receiving queue correctly shows only shipments awaiting receipt
- Receive Shipment screen is comfortable to use one-handed on a phone
- `npm test` passes — `submit()` is fully unit-tested including the partial-save no-movement guarantee
