# STEP-06: POS and Sales

## Goal
The Ghana point-of-sale workflow: barcode-first cart building, payment capture (including split payments), sale completion (stock deduction + FX record + auto-generated receipt), void/refund flows, sales history, and customer management. After this step the business can sell stock in Ghana and generate receipts.

## Prerequisites
- STEP-00, STEP-01, STEP-02 (products + barcode lookup), STEP-03 (inventory engine), STEP-05 (Ghana stock must exist)

## Reference Documents
- `requirements/grocery_export_prd.md` — sections 6.9 (POS), 6.10 (FX at sale), 6.11 (Receipts), 6.12 (Customers)
- `requirements/grocery_export_database_schema.md` — tables: `sales`, `sale_items`, `sale_payments`, `receipts`, `customers`
- `requirements/grocery_export_screen_map_user_flows.md` — sections 4.9, 4.10, 4.12, 5.6

---

## Key Decisions

### POS is Ghana-only
Sales only deduct from the Ghana Warehouse (or Ghana Shop) location. The POS screen should not be accessible to staff who only have UK access.

### FX at Sale
When a sale is completed, the FX rate at time of sale must be recorded. On the POS screen, the current GBP/GHS rate is either:
- Entered manually by the cashier (MVP), or
- Pre-populated from the most recent `fx_records` entry of type `sale` (convenience default)

The cashier can override it. The `fx_records` row is created automatically on sale completion.

### Receipt Generation
Receipts are generated server-side as PDFs using `pdfkit`. The PDF is stored on S3 and the `pdf_url` is saved on the `receipts` row. The mobile app opens the PDF URL (signed S3 URL) for printing or sharing. Receipt auto-creation uses the shared `PdfService` from STEP-08's `storage.service.ts` — implement that utility now (it's needed here) even though full invoice support comes in STEP-08.

### Void vs Refund
- **Void**: sale never happened. Only allowed before end-of-day or with explicit admin permission. Reverses all inventory movements.
- **Refund**: items returned after sale. Creates new `adjust_in` inventory movements for returned items. Creates a negative sale or a separate refund record.

For MVP: implement void only. Mark refund as a stub returning 501.

### Sale Transaction Atomicity
The sale completion (`POST /sales`) must be a single `$transaction`:
1. Check Ghana stock is sufficient for all items
2. Create `sales` record
3. Create all `sale_items`
4. Create all `sale_payments`
5. For each sale item: call `InventoryService.recordMovement({ type: 'sale_out', from: GhanaWarehouse })`
6. Create `fx_records` row (`event_type: 'sale'`)
7. Create `receipts` row (generate PDF in background — don't block the transaction)

---

## Backend Files to Create

### `backend/src/modules/customers/customers.module.ts`
Imports `PrismaModule`, `AuditModule`. Exports `CustomersService`.

### `backend/src/modules/customers/customers.service.ts`
- `findAll(query)` — paginated, search by name/phone/email, filter by type
- `findById(id)` — includes recent sales summary
- `create(dto, userId)`
- `update(id, dto, userId)`
- `getSalesHistory(customerId, query)` — paginated sales for this customer
- `getInvoices(customerId)` — (stub for STEP-08)

### `backend/src/modules/customers/customers.controller.ts`
```
GET   /api/v1/customers               @Roles('admin','operations','finance','pos_cashier','viewer')
POST  /api/v1/customers               @Roles('admin','operations','pos_cashier')
GET   /api/v1/customers/:id           @Roles('admin','operations','finance','pos_cashier','viewer')
PATCH /api/v1/customers/:id           @Roles('admin','operations')
GET   /api/v1/customers/:id/sales     @Roles('admin','operations','finance','viewer')
GET   /api/v1/customers/:id/invoices  @Roles('admin','finance','viewer')
```

### `backend/src/modules/customers/dto/create-customer.dto.ts`
Fields: `customerType` (enum: retail/wholesale), `fullName`, `phone?`, `email?`, `address?`, `notes?`.

### `backend/src/modules/sales/sales.module.ts`
Imports `PrismaModule`, `AuditModule`, `InventoryModule`, `CustomersModule`.

### `backend/src/modules/sales/sales.service.ts`
- `findAll(query)` — paginated, filter by date/cashier/location/customer/payment method/status
- `findById(id)` — includes items, payments, receipt link, FX record
- `create(dto, userId)` — see atomicity note above. Returns completed sale with receipt
- `void(id, dto, userId)` — `$transaction`: set `sales.status = 'voided'`, for each item call `InventoryService.recordMovement({ type: 'return_in', to: GhanaWarehouse, quantity: item.quantity })`, write audit log. Only allowed if status is `completed`. Check `sales.void` permission.
- `refund(id, dto, userId)` — returns `501 Not Implemented` in MVP

### `backend/src/modules/sales/sales.controller.ts`
```
GET   /api/v1/sales                   @Roles('admin','operations','finance','pos_cashier','viewer')
POST  /api/v1/sales                   @Roles('admin','operations','pos_cashier')
GET   /api/v1/sales/:id               @Roles('admin','operations','finance','pos_cashier','viewer')
POST  /api/v1/sales/:id/void          @Roles('admin','operations') + @RequirePermission('sales.void')
POST  /api/v1/sales/:id/refund        @Roles('admin') + @RequirePermission('sales.refund')
```

### `backend/src/modules/sales/dto/create-sale.dto.ts`
Fields: `locationId`, `customerId?`, `currencyCode` (default GHS), `fxRateAtSale?`, `notes?`, `items: CreateSaleItemDto[]`, `payments: CreateSalePaymentDto[]`.

### `backend/src/modules/sales/dto/create-sale-item.dto.ts`
Fields: `productId`, `quantity`, `unitPriceGhs`, `discountAmountGhs?`.

### `backend/src/modules/sales/dto/create-sale-payment.dto.ts`
Fields: `paymentMethod` (enum: cash/card/mobile_money/transfer), `amountGhs`, `paymentReference?`.

### `backend/src/modules/sales/dto/void-sale.dto.ts`
Fields: `reason`.

### `backend/src/modules/sales/dto/sale-query.dto.ts`
Extends `PaginationDto`. Fields: `dateFrom?`, `dateTo?`, `soldBy?`, `locationId?`, `customerId?`, `paymentMethod?`, `status?`.

### `backend/src/modules/receipts/receipts.module.ts`
Imports `PrismaModule`, `StorageModule`. Exports `ReceiptsService`.

### `backend/src/modules/receipts/receipts.service.ts`
- `findAll(query)` — paginated
- `findById(id)` — includes sale details
- `generate(saleId, tx?)` — called internally by sales service. Builds receipt data, renders PDF with `pdfkit`, uploads to S3, creates `receipts` row. Returns receipt.
- `getPdfUrl(id)` — generates a signed S3 URL valid for 1 hour

### `backend/src/modules/receipts/receipts.controller.ts`
```
GET  /api/v1/receipts       @Roles('admin','operations','finance','pos_cashier','viewer')
GET  /api/v1/receipts/:id   @Roles('admin','operations','finance','pos_cashier','viewer')
GET  /api/v1/receipts/:id/pdf — returns { url: signedS3Url }
```

---

## Unit Tests to Write

### `backend/src/modules/sales/sales.service.spec.ts`
- `create()` calls `InventoryService.recordMovement({ type: 'sale_out' })` for each line item
- `create()` throws `ConflictException` if any item's Ghana stock is insufficient before the transaction starts
- `create()` creates an `fx_records` row with `event_type: 'sale'`
- `create()` creates a `receipts` row and triggers PDF generation
- `create()` rolls back the entire transaction if any step fails
- `void()` calls `InventoryService.recordMovement({ type: 'return_in' })` for each line item
- `void()` sets `sales.status = 'voided'` — voided sales must not appear in revenue totals
- `void()` throws `ConflictException` when the sale status is already `voided`

### `backend/src/modules/receipts/receipts.service.spec.ts`
- `generate()` returns a `receipts` record with a non-null `pdfUrl`
- `getPdfUrl()` returns a signed URL string from `StorageService`

### `mobile/store/pos.store.spec.ts` (mobile Zustand tests)
- `addItem()` increments quantity if the product is already in the cart
- `updateQuantity()` removes the item when quantity is set to 0
- `applyDiscount()` stores the discount against the correct cart item
- `clearCart()` resets all state to the initial empty values
- `subtotal()` sums `unitPriceGhs × quantity` across all items
- `total()` equals `subtotal() - sum of all discountAmountGhs`

---

## Frontend Files to Create

### `mobile/store/pos.store.ts`
Zustand cart store:
```typescript
interface CartItem {
  productId: string;
  productName: string;
  barcode: string;
  unitPriceGhs: number;
  quantity: number;
  discountAmountGhs: number;
}

interface PosState {
  cartItems: CartItem[];
  customerId: string | null;
  fxRate: number;
  addItem: (product: Product) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  applyDiscount: (productId: string, amount: number) => void;
  removeItem: (productId: string) => void;
  setCustomer: (customerId: string | null) => void;
  setFxRate: (rate: number) => void;
  clearCart: () => void;
  subtotal: () => number;  // derived
  total: () => number;     // derived (subtotal - discounts)
}
```

### `mobile/app/(app)/pos/index.tsx`
POS Main Screen — the highest-priority mobile screen in the entire app:
- Top bar: barcode scan input (auto-focuses on mount), product search field, customer selector
- Main area: product quick-add list (most recently sold products)
- Right panel (or bottom sheet on phone): cart with items, quantities, line totals
- Scan → immediately adds to cart, plays haptic feedback
- Search → shows matching products with add button
- Cart item: product name, quantity stepper (+ / -), unit price, line total, swipe to remove
- Bottom sticky bar: total GHS, "Charge" button
- Large tap targets throughout — designed for fast cashier use

### `mobile/app/(app)/pos/payment.tsx`
Payment Screen:
- Total GHS displayed prominently
- Payment method tabs: Cash / Card / Mobile Money / Bank Transfer / Split
- Amount input (pre-filled with total)
- Split payment: add multiple payment lines, each with method + amount
- Reference field (for Mobile Money / Transfer)
- Current FX rate field (pre-filled from last recorded rate, editable)
- "Complete Sale" button
- Calculates and shows GBP equivalent based on FX rate

### `mobile/app/(app)/pos/receipt.tsx`
Receipt Screen:
- Shows completed sale summary: items, quantities, prices, total, payment breakdown
- Business name and branding at top
- Receipt number and date/time
- Print button (opens share sheet via expo-sharing)
- Download PDF button
- "New Sale" button → clears cart and goes back to POS main
- "View Sale Details" link

### `mobile/app/(app)/pos/void.tsx`
Void/Refund Screen:
- Sale summary
- Reason input (required)
- "Void Sale" button with confirmation dialog
- Shows inventory impact: which items will be returned to stock

### `mobile/app/(app)/sales/index.tsx`
Sales History Screen:
- `FlashList` of sale rows: date/time, receipt number, customer (or "Walk-in"), total GHS, payment method, status badge
- Filter: date range, cashier, payment method, status
- Search by receipt number

### `mobile/app/(app)/sales/[id].tsx`
Sale Detail Screen:
- Items with quantities and prices
- Payment breakdown
- Total GHS and GBP equivalent
- FX rate at sale
- Status badge (completed/voided)
- Receipt link → opens PDF
- Void button (if permitted and status is completed)

### `mobile/app/(app)/customers/index.tsx`
Customer List Screen:
- `FlashList` of customer cards: name, phone, type badge, total spend
- Search by name/phone/email
- FAB → `customers/new`

### `mobile/app/(app)/customers/new.tsx`
Add Customer Screen:
- Form: name, type picker, phone, email, address, notes

### `mobile/app/(app)/customers/[id].tsx`
Customer Detail Screen:
- Name, contact info, customer type
- Total spend, purchase frequency
- Recent sales list
- Edit button

### `mobile/lib/api/sales.api.ts`
```typescript
export const salesApi = {
  list: (params) => client.get('/sales', { params }),
  get: (id) => client.get(`/sales/${id}`),
  create: (data) => client.post('/sales', data),
  void: (id, data) => client.post(`/sales/${id}/void`, data),
};
```

### `mobile/lib/api/customers.api.ts`
```typescript
export const customersApi = {
  list: (params) => client.get('/customers', { params }),
  get: (id) => client.get(`/customers/${id}`),
  create: (data) => client.post('/customers', data),
  update: (id, data) => client.patch(`/customers/${id}`, data),
  getSales: (id, params) => client.get(`/customers/${id}/sales`, { params }),
};
```

---

## Implementation Steps

1. Create `CustomersModule` — test CRUD
2. Create `ReceiptsModule` and `ReceiptsService.generate()` — test PDF generation and S3 upload
3. Create `SalesModule`
4. Write unit tests for `SalesService.create()` and `SalesService.void()` first — all 7 transaction steps must be covered
5. Implement `SalesService.create()` until all unit tests pass
6. Test `POST /sales` via Swagger: verify Ghana inventory decreases, FX record created, receipt PDF accessible
7. Implement `SalesService.void()` — covered by unit tests
8. Write unit tests for the POS Zustand store, then build the store until all pass
8. Build POS Main screen — test barcode scan → cart add → haptic feedback on real device
9. Build Payment screen — test split payment UI
10. Build Receipt screen — test PDF opens and can be shared
11. Build Sales History and Sale Detail screens
12. Build Customer CRUD screens
13. Test full end-to-end POS flow on device: scan items → payment → receipt

## Acceptance Criteria
- `POST /sales` atomically deducts stock, creates FX record, and generates receipt PDF in one transaction
- If any item is out of stock, the entire sale is rejected with a clear error message
- Completed sale is immediately visible in sales history
- Voiding a sale reverses the inventory movements and marks the receipt as void
- POS scan-to-cart takes <200ms from scan to cart update on device
- Receipt PDF renders correctly with all line items, totals, and business branding
- Split payment correctly records multiple payment rows summing to the sale total
- FX record is created linking back to the sale
- `npm test` passes — `SalesService.create()`, `void()`, receipt generation, and POS cart store are all unit-tested
