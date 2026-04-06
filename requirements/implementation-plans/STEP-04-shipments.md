# STEP-04: Shipment Lifecycle and Shipping Costs

## Goal
Full shipment lifecycle: draft creation, inventory allocation (stock moves to `allocated` state), dispatch (stock moves to `in_transit`), cost capture, status history, and a mobile-optimised detail screen with quick action buttons. After this step goods can be moved from UK inventory into a tracked shipment.

## Prerequisites
- STEP-00, STEP-01, STEP-02, STEP-03 (inventory movement engine must exist)

## Reference Documents
- `requirements/grocery_export_prd.md` — sections 6.6 (Shipment Tracking), 6.7 (Shipping Costs)
- `requirements/grocery_export_database_schema.md` — tables: `shipments`, `shipment_items`, `shipment_status_history`, `shipment_costs`
- `requirements/grocery_export_screen_map_user_flows.md` — sections 4.7, 5.4

---

## Key Decisions

### Stock State Transitions
- **Allocate** (`POST /shipments/:id/items`): calls `InventoryService.recordMovement({ type: 'allocate_shipment' })`. This decrements `quantity_available` but NOT `quantity_on_hand` — the stock is reserved but still physically in the UK.
- **Dispatch** (`POST /shipments/:id/dispatch`): calls `InventoryService.recordMovement({ type: 'dispatch', from: UkWarehouse, to: shipmentLocation })`. This decrements `quantity_on_hand` from UK and moves it to an in-transit virtual location.
- Each shipment gets its own virtual `location` record of type `shipment` — this is created when the shipment is created.

### Shipment Location
When a shipment is created, a `locations` row is inserted automatically with `location_type: 'shipment'` and `name` = the shipment reference. This gives inventory movements a specific `to_location_id` during transit.

### Dispatch Validation
Cannot dispatch if status is not `draft` or `packed`. Cannot dispatch if `dispatch_date` is in the future (warn, don't block). Cannot add items after dispatch.

### Cost Allocation
Shipping costs are stored in `shipment_costs` but **not** allocated to individual items in this step. The landed cost calculation using quantity-based allocation is done at reporting time in STEP-09/10. Store `allocated_shipping_cost_gbp` on `shipment_items` as an optional field for later denormalisation.

---

## Backend Files to Create

### `backend/src/modules/shipments/shipments.module.ts`
Imports `PrismaModule`, `AuditModule`, `InventoryModule`, `LocationsModule`.

### `backend/src/modules/shipments/shipments.service.ts`
- `findAll(query)` — paginated, filter by status/carrier/date
- `findById(id)` — includes items (with products), costs, status history, origin/destination locations
- `create(dto, userId)` — creates shipment record + creates a virtual shipment location + inserts initial `shipment_status_history` row (status: `draft`) + audit log
- `update(id, dto, userId)` — only allowed in `draft`/`packed` status
- `addItem(shipmentId, dto, userId)` — validates product has sufficient stock in UK; calls `InventoryService.recordMovement({ type: 'allocate_shipment' })`; creates `shipment_items` row. Wraps in `$transaction`.
- `removeItem(shipmentId, itemId, userId)` — reverses the allocation movement; deletes `shipment_items` row. Only in `draft`/`packed`. `$transaction`.
- `dispatch(id, userId)` — validates status is `draft` or `packed`. For each item: calls `InventoryService.recordMovement({ type: 'dispatch', from: UkWarehouse, to: shipmentLocation })`. Updates shipment status to `dispatched`. Inserts `shipment_status_history` row. `$transaction`. Audit log.
- `addCost(shipmentId, dto, userId)` — inserts `shipment_costs` row. Audit log.
- `getCosts(shipmentId)` — returns all costs for shipment with total
- `getStatusHistory(shipmentId)` — ordered by timestamp

### `backend/src/modules/shipments/shipments.controller.ts`
```
GET    /api/v1/shipments                              @Roles('admin','operations','warehouse','finance','viewer')
POST   /api/v1/shipments                              @Roles('admin','operations')
GET    /api/v1/shipments/:id                          @Roles('admin','operations','warehouse','finance','viewer')
PATCH  /api/v1/shipments/:id                          @Roles('admin','operations')
POST   /api/v1/shipments/:id/items                    @Roles('admin','operations','warehouse')
DELETE /api/v1/shipments/:id/items/:itemId            @Roles('admin','operations')
POST   /api/v1/shipments/:id/dispatch                 @Roles('admin','operations') + @RequirePermission('shipments.dispatch')
POST   /api/v1/shipments/:id/costs                    @Roles('admin','operations','finance')
GET    /api/v1/shipments/:id/costs                    @Roles('admin','operations','finance','viewer')
GET    /api/v1/shipments/:id/status-history           @Roles('admin','operations','finance','viewer')
```

### `backend/src/modules/shipments/dto/create-shipment.dto.ts`
Fields: `shipmentReference`, `shipmentName?`, `originLocationId`, `destinationLocationId`, `carrierName`, `trackingNumber?`, `packedDate?`, `dispatchDate`, `expectedArrivalDate`, `notes?`.

### `backend/src/modules/shipments/dto/update-shipment.dto.ts`
`PartialType(CreateShipmentDto)`.

### `backend/src/modules/shipments/dto/add-shipment-item.dto.ts`
Fields: `productId`, `quantity`, `batchId?`, `sourcePurchaseItemId?`, `notes?`.

### `backend/src/modules/shipments/dto/create-shipment-cost.dto.ts`
Fields: `costType` (enum: freight/customs/transport/insurance/packaging/handling/other), `amountGbp`, `description?`, `vendorName?`, `costDate`.

### `backend/src/modules/shipments/dto/shipment-query.dto.ts`
Extends `PaginationDto`. Fields: `status?`, `carrierName?`, `dateFrom?`, `dateTo?`, `search?` (by reference/name).

---

## Frontend Files to Create

### `mobile/components/ShipmentStatusBadge.tsx`
Reusable badge component. Maps status to colour:
- `draft` → grey
- `packed` → blue
- `dispatched` / `in_transit` → amber
- `delayed` → red
- `arrived` / `received` → green
- `closed` → dark grey
- `cancelled` → red/strikethrough

### `mobile/components/InventoryPicker.tsx`
Reusable product picker for selecting items from UK inventory:
- Search + scan barcode
- Shows product name, SKU, and available UK quantity
- Quantity input field
- Returns `{ productId, quantity }` to parent
- Used in Create Shipment and (later) Purchase screens

### `mobile/app/(app)/shipments/index.tsx`
Shipment List Screen:
- `FlashList` of shipment cards: reference, carrier, status badge, dispatch date, expected arrival, item count
- Status filter tabs: All / In Transit / Delayed / Received
- Search by reference
- FAB → `shipments/new`

### `mobile/app/(app)/shipments/new.tsx`
Create Shipment Screen:
- Shipment reference, name, carrier, tracking number
- Origin / Destination location pickers (dropdown)
- Date pickers: packed, dispatch, expected arrival
- Items section: uses `InventoryPicker` component — shows running item list with quantities
- Notes
- Save as Draft / Dispatch Now buttons

### `mobile/app/(app)/shipments/[id].tsx`
Shipment Detail Screen:
- Header: reference, status badge, carrier, tracking number
- Dates row: packed → dispatch → expected → actual arrival (with transit days)
- **Quick action bar**: Mark Dispatched / Add Costs / Mark Arrived / Open Receiving (contextual — shows based on status)
- Items tab: `FlashList` of items with quantities
- Costs tab: list of cost entries with type icons and GBP amounts; total at bottom
- Timeline tab: status history in reverse chronological order
- Profitability summary section (placeholder until STEP-09)

### `mobile/app/(app)/shipments/[id]/costs.tsx`
Shipment Cost Entry Screen:
- Cost type picker (freight, customs, transport, etc.)
- Amount GBP (numeric input)
- Date picker
- Vendor name
- Description
- Save button — appends to costs list

### `mobile/app/(app)/shipments/[id]/status.tsx`
Shipment Status Update Screen (lightweight mobile-only):
- Current status display
- "Mark as Dispatched" or "Mark as Arrived" button (contextual)
- Confirmation dialog with optional notes
- Designed for one-thumb operation in a warehouse

### `mobile/lib/api/shipments.api.ts`
```typescript
export const shipmentsApi = {
  list: (params) => client.get('/shipments', { params }),
  get: (id) => client.get(`/shipments/${id}`),
  create: (data) => client.post('/shipments', data),
  update: (id, data) => client.patch(`/shipments/${id}`, data),
  addItem: (id, data) => client.post(`/shipments/${id}/items`, data),
  removeItem: (id, itemId) => client.delete(`/shipments/${id}/items/${itemId}`),
  dispatch: (id) => client.post(`/shipments/${id}/dispatch`),
  addCost: (id, data) => client.post(`/shipments/${id}/costs`, data),
  getCosts: (id) => client.get(`/shipments/${id}/costs`),
  getStatusHistory: (id) => client.get(`/shipments/${id}/status-history`),
};
```

### `mobile/store/shipments.store.ts`
```typescript
interface ShipmentsState {
  activeShipments: Shipment[];
  delayedCount: number;
  setActiveShipments: (shipments: Shipment[]) => void;
}
```

---

## Implementation Steps

1. Create `ShipmentsModule` — wire into `app.module.ts`
2. Implement `ShipmentsService.create()` — test that it also creates a virtual location row
3. Implement `ShipmentsService.addItem()` — test that allocation reduces `quantity_available` in UK but not `quantity_on_hand`
4. Implement `ShipmentsService.dispatch()` — test that dispatch transfers `quantity_on_hand` from UK to shipment location
5. Implement `ShipmentsService.removeItem()` — test rollback of allocation
6. Implement cost methods (`addCost`, `getCosts`)
7. Implement `ShipmentsController`
8. Test via Swagger the full sequence: create → add items → dispatch → verify UK quantity reduced
9. Build `ShipmentStatusBadge` and `InventoryPicker` components
10. Build Shipment List screen
11. Build Create Shipment screen with item allocation
12. Build Shipment Detail screen with quick action bar
13. Build Cost Entry screen
14. Build Status Update screen (for quick mobile updates)
15. Test end-to-end: create shipment on device, allocate items, dispatch, verify inventory changes

## Acceptance Criteria
- Allocating an item to a shipment reduces `quantity_available` (not `quantity_on_hand`) in UK inventory
- Dispatching a shipment atomically moves `quantity_on_hand` from UK location to the shipment's virtual location
- Dispatching records a `shipment_status_history` entry
- Cannot add items to a dispatched shipment (returns 409)
- Costs are listed with a running total on the shipment detail
- Shipment Detail quick action buttons show/hide correctly based on status
- Status Update screen works with one tap on a real device
