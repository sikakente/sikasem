# STEP-03: Purchasing and Inventory Movement Engine

## Goal
Implement purchase order creation and confirmation, the central inventory movement engine (the single most critical shared service — every subsequent module that moves stock calls it), and inventory visibility screens. After this step the first full end-to-end flow is live: supplier → purchase → UK inventory.

## Prerequisites
- STEP-00, STEP-01, STEP-02

## Reference Documents
- `requirements/grocery_export_prd.md` — sections 6.4 (Purchasing), 6.5 (Inventory), 6.10 (FX Tracking at purchase point)
- `requirements/grocery_export_database_schema.md` — tables: `purchase_orders`, `purchase_order_items`, `locations`, `inventory_batches`, `inventory_movements`, `inventory_balances`, `fx_records`
- `requirements/grocery_export_ai_design_brief.md` — sections 5 (Data Modelling), 6 (Cost Logic)
- `requirements/grocery_export_screen_map_user_flows.md` — sections 4.5, 4.6

---

## Key Decisions

### Inventory Movement Engine
`InventoryService.recordMovement()` is the **only** way stock changes. Every other service (purchasing, shipments, receiving, sales) calls this method. It:
1. Inserts a row into `inventory_movements`
2. Updates `inventory_balances` for the affected product + location using an `upsert`
3. Both happen inside a Prisma `$transaction`

`inventory_balances` is a **read-optimised snapshot** — updated transactionally alongside every movement. Never compute stock by summing movements at query time for the main views (only for auditing/reconciliation).

### Negative Stock Guard
`recordMovement()` checks `inventory_balances.quantity_available` before any deduction. If the result would go negative, it throws `ConflictException` unless the caller holds the `inventory.override_negative` permission. The permission check is passed in as a parameter (the service does not check the HTTP request directly — this keeps it testable).

### FX Record at Purchase
When a purchase is confirmed, `AuthService.login` is NOT involved — the purchasing service creates the `fx_records` row directly. The FX rate and GHS equivalent are entered by the user on the form.

### Locations Seeding
Two default locations are seeded: `UK Warehouse` and `Ghana Warehouse`. The Prisma seed file from STEP-01 should be extended to include these.

### Inventory Batches
`inventory_batches` is **optional** in MVP — implement the movement engine to reference `batch_id` as nullable. This keeps the option open for STEP-04 (shipments) to use batch tracking without requiring it now.

---

## Backend Files to Create

### `backend/src/modules/locations/locations.module.ts`
Global module. Exports `LocationsService`.

### `backend/src/modules/locations/locations.service.ts`
- `findAll()` — list all active locations
- `findById(id)` — throws `NotFoundException` if not found
- `findByType(type)` — e.g. `'UK warehouse'` or `'Ghana warehouse'`
- `getUkWarehouse()` — convenience method, returns the seeded UK location
- `getGhanaWarehouse()` — convenience method, returns the seeded Ghana location

### `backend/src/modules/inventory/inventory.module.ts`
Imports `PrismaModule`, `AuditModule`, `LocationsModule`. Exports `InventoryService`.

### `backend/src/modules/inventory/inventory.service.ts`
Core method:
```typescript
async recordMovement(params: {
  productId: string;
  movementType: InventoryMovementType;
  quantity: number;           // always positive — direction implied by movementType
  fromLocationId?: string;
  toLocationId?: string;
  referenceType: string;
  referenceId: string;
  movementDate?: Date;
  notes?: string;
  createdBy: string;
  batchId?: string;
  allowNegative?: boolean;    // caller passes this — guard checked here
}, tx?: Prisma.TransactionClient): Promise<InventoryMovement>
```

Logic:
1. If movement reduces stock (sale_out, allocate_shipment, dispatch, damage_out, loss_out, adjust_out), check `inventory_balances.quantity_available >= quantity`. If not and `allowNegative` is false, throw `ConflictException('Insufficient stock')`.
2. Insert `inventory_movements` row.
3. Upsert `inventory_balances` for the relevant location(s):
   - `from_location`: decrement `quantity_on_hand` and `quantity_available`
   - `to_location`: increment `quantity_on_hand` and `quantity_available`
   - For allocation movements: decrement `quantity_available` but not `quantity_on_hand` (it's reserved)
4. If a `tx` (transaction client) is passed, use it — otherwise open a new `$transaction`.
5. Return the created movement record.

Other methods:
- `getBalances(query)` — paginated inventory balances joined with products and locations. Supports `locationId`, `productId`, `lowStock`, `search`.
- `getMovements(query)` — paginated movements with filters: `productId`, `locationId`, `movementType`, `dateFrom`, `dateTo`
- `createAdjustment(dto, userId)` — wraps `recordMovement` with type `adjust_in` or `adjust_out`; writes audit log
- `getProductStock(productId)` — returns balances for a product across all locations

### `backend/src/modules/inventory/dto/inventory-query.dto.ts`
Extends `PaginationDto`. Fields: `locationId?`, `productId?`, `search?`, `lowStock?`, `movementType?`, `dateFrom?`, `dateTo?`.

### `backend/src/modules/inventory/dto/create-adjustment.dto.ts`
Fields: `productId`, `locationId`, `adjustmentType` (enum: add/remove), `quantity`, `reason`, `notes?`.

### `backend/src/modules/inventory/inventory.controller.ts`
```
GET  /api/v1/inventory                      @Roles('admin','operations','warehouse','finance','viewer')
GET  /api/v1/inventory/movements            @Roles('admin','operations','warehouse','finance')
POST /api/v1/inventory/adjustments          @Roles('admin','operations','warehouse') + @RequirePermission('inventory.adjust')
GET  /api/v1/inventory/product/:id          @Roles('admin','operations','warehouse','finance','viewer')
```

### `backend/src/modules/purchasing/purchasing.module.ts`
Imports `PrismaModule`, `AuditModule`, `InventoryModule`.

### `backend/src/modules/purchasing/purchasing.service.ts`
- `findAll(query)` — paginated, filter by supplier/date/status
- `findById(id)` — includes items, supplier, FX records
- `create(dto, userId)` — create `purchase_orders` + `purchase_order_items`. Status: `draft`.
- `update(id, dto, userId)` — only for `draft` status. Audit log.
- `confirm(id, userId)` — transitions status to `confirmed`. Inside `$transaction`:
  1. For each `purchase_order_item`:
     a. Call `InventoryService.recordMovement({ type: 'purchase_in', toLocation: UkWarehouse, ... }, tx)`
     b. Create `fx_records` row with `event_type: 'purchase'`, linked to `purchase_order_item`
  2. Update `purchase_orders.status` to `confirmed`
  3. Write audit log
  Returns the confirmed purchase order.

### `backend/src/modules/purchasing/dto/create-purchase.dto.ts`
Fields: `supplierId`, `purchaseDate`, `notes?`, `items: CreatePurchaseItemDto[]`.

### `backend/src/modules/purchasing/dto/create-purchase-item.dto.ts`
Fields: `productId`, `quantity`, `unitCostGbp`, `totalCostGbp`, `fxRatePurchase`, `totalCostGhsEquivalent`, `expiryDate?`, `batchReference?`, `notes?`.

### `backend/src/modules/purchasing/dto/update-purchase.dto.ts`
`PartialType(CreatePurchaseDto)`.

### `backend/src/modules/purchasing/dto/purchase-query.dto.ts`
Extends `PaginationDto`. Fields: `supplierId?`, `productId?`, `status?`, `dateFrom?`, `dateTo?`.

### `backend/src/modules/purchasing/purchasing.controller.ts`
```
GET   /api/v1/purchases           @Roles('admin','operations','finance','viewer')
POST  /api/v1/purchases           @Roles('admin','operations')
GET   /api/v1/purchases/:id       @Roles('admin','operations','finance','viewer')
PATCH /api/v1/purchases/:id       @Roles('admin','operations')
POST  /api/v1/purchases/:id/confirm  @Roles('admin','operations')
```

---

## Unit Tests to Write

### `backend/src/modules/inventory/inventory.service.spec.ts`
- `recordMovement()` inserts a row into `inventory_movements` with correct fields
- `recordMovement()` upserts `inventory_balances` for the target location inside the same transaction
- `recordMovement()` throws `ConflictException('Insufficient stock')` when deducting more than `quantity_available` and `allowNegative` is `false`
- `recordMovement()` allows deduction below zero when `allowNegative` is `true`
- `recordMovement({ type: 'allocate_shipment' })` decrements `quantity_available` but **not** `quantity_on_hand`
- `recordMovement({ type: 'purchase_in' })` increments both `quantity_on_hand` and `quantity_available`
- If the optional `tx` (transaction client) is passed, the method uses it instead of opening a new `$transaction`
- `createAdjustment()` calls `AuditService.log()` with the correct adjustment details

### `backend/src/modules/purchasing/purchasing.service.spec.ts`
- `confirm()` calls `InventoryService.recordMovement()` once per purchase order item with `type: 'purchase_in'`
- `confirm()` creates an `fx_records` row for each item with `event_type: 'purchase'`
- `confirm()` updates `purchase_orders.status` to `confirmed`
- `confirm()` rolls back the entire transaction if any step fails (Prisma `$transaction` atomicity)
- `confirm()` throws `ConflictException` when called on an already-confirmed order

---

## Frontend Files to Create

### `mobile/src/app/(app)/purchasing/index.tsx`
Purchase Order List Screen:
- `FlashList` of purchase cards (supplier name, date, item count, total GBP, status badge)
- Filter by supplier (picker), status, date range
- FAB → `purchasing/new`
- Pull to refresh

### `mobile/src/app/(app)/purchasing/new.tsx`
Create Purchase Screen:
- Supplier picker (search dropdown)
- Purchase date picker
- Line items section: add item button opens product search/scan modal
  - For each item: product name (auto-filled), quantity, unit cost GBP (auto-fills total), FX rate, GHS equivalent (auto-calculated = total × rate)
  - Swipe to delete line item
- Notes field
- Total GBP summary footer
- Save as Draft / Confirm Purchase buttons

### `mobile/src/app/(app)/purchasing/[id].tsx`
Purchase Detail Screen:
- Supplier, date, status badge
- Items table: product, quantity, unit cost, total GBP, FX rate, GHS equivalent
- GBP total and GHS total at bottom
- Confirm button (if status is draft)
- Linked inventory batches section (shows UK stock increased after confirm)

### `mobile/src/app/(app)/inventory/index.tsx`
Inventory Overview Screen:
- Summary cards: total UK stock value, total Ghana stock value, low stock count
- `FlashList` of inventory balance rows (product name, location chips, quantity)
- Search bar
- Filter: location picker, low stock toggle, category
- Tap row → `inventory/product/[id]`

### `mobile/src/app/(app)/inventory/movements.tsx`
Inventory Movement History Screen:
- `FlashList` of movement rows: date, product, movement type badge, quantity, from/to locations, reference
- Filter by movement type, product, location, date range

### `mobile/src/app/(app)/inventory/adjustment.tsx`
Inventory Adjustment Screen:
- Product search/scan picker
- Location picker
- Type toggle (Add / Remove)
- Quantity input (numeric, large tap target)
- Reason text input
- Notes
- Submit button

### `mobile/src/app/(app)/inventory/product/[id].tsx`
Stock by Product Detail Screen:
- Product header (name, SKU, barcode)
- Balance cards per location (on hand, allocated, available)
- Movement timeline (recent movements in chronological order)
- Related purchases section
- Related shipments section
- Related sales section

### `mobile/src/lib/api/purchasing.api.ts`
```typescript
export const purchasingApi = {
  list: (params) => client.get('/purchases', { params }),
  get: (id) => client.get(`/purchases/${id}`),
  create: (data) => client.post('/purchases', data),
  update: (id, data) => client.patch(`/purchases/${id}`, data),
  confirm: (id) => client.post(`/purchases/${id}/confirm`),
};
```

### `mobile/src/lib/api/inventory.api.ts`
```typescript
export const inventoryApi = {
  list: (params) => client.get('/inventory', { params }),
  getMovements: (params) => client.get('/inventory/movements', { params }),
  createAdjustment: (data) => client.post('/inventory/adjustments', data),
  getProductStock: (productId) => client.get(`/inventory/product/${productId}`),
};
```

### `mobile/src/store/inventory.store.ts`
Zustand slice:
```typescript
interface InventoryState {
  balances: InventoryBalance[];
  lowStockCount: number;
  setBalances: (balances: InventoryBalance[]) => void;
}
```
Used by the dashboard (STEP-09) to show low stock count without a separate API call.

---

## Implementation Steps

1. Extend `prisma/seed.ts` with UK Warehouse and Ghana Warehouse locations
2. Create `LocationsModule` and `LocationsService` — test `getUkWarehouse()` and `getGhanaWarehouse()`
3. Implement `InventoryService.recordMovement()` — write unit tests **first** (TDD), then implement until all tests pass
4. Implement `InventoryService.getBalances()` and `getMovements()`
5. Implement `InventoryController`
6. Confirm `GET /inventory` returns empty balances before any purchases
7. Implement `PurchasingService.create()` and `PurchasingService.confirm()`
8. Test `confirm()` via Swagger: verify `inventory_movements` row is inserted, `inventory_balances` is updated, `fx_records` row is created
9. Implement `PurchasingController`
10. Build Purchase List and Create Purchase screens on mobile
11. Test full purchase flow on device: create draft → confirm → inventory increases in UK
12. Build Inventory Overview and Movement History screens
13. Build Inventory Adjustment screen — test that adjustment writes to audit log
14. Build Stock by Product Detail screen
15. Run `npm test` — all inventory and purchasing unit tests must pass

## Acceptance Criteria
- `POST /purchases` creates a draft purchase
- `POST /purchases/:id/confirm` atomically increases UK inventory, creates a movement record, and creates an FX record — if any part fails, nothing is committed
- `GET /inventory` shows the correct on-hand quantity per product per location after confirmation
- `POST /inventory/adjustments` writes to `inventory_movements` and updates balances; entry appears in `audit_logs`
- Negative stock guard rejects a deduction that would go below zero (unless override permission present)
- Create Purchase screen correctly auto-calculates GHS equivalent when FX rate is entered
- Full purchase flow works end-to-end on the Expo simulator
- `npm test` passes — `InventoryService.recordMovement()` has thorough unit test coverage including the negative-stock guard and the allocation vs dispatch balance logic
