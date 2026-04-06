# STEP-02: Suppliers and Product Catalogue

## Goal
Build the supplier CRUD and product catalogue API, including fast barcode lookup and multi-barcode support. Implement corresponding mobile screens with barcode scanning via camera. Also bootstrap the `AuditService` which is used by every subsequent module. After this step staff can create products, assign barcodes, and link products to the shops/suppliers they are sourced from.

## Prerequisites
- STEP-00 (scaffolding)
- STEP-01 (auth guards and decorators available)

## Reference Documents
- `requirements/grocery_export_prd.md` — sections 6.2 (Product) and 6.3 (Supplier)
- `requirements/grocery_export_database_schema.md` — tables: `suppliers`, `products`, `product_categories`, `product_barcodes`, `product_supplier_map`
- `requirements/grocery_export_screen_map_user_flows.md` — sections 4.3 and 4.4

---

## Key Decisions
- Barcode lookup (`GET /products/barcode/:barcode`) must be fast — indexed column, returns in <100ms
- A product has one primary barcode on `products.barcode` plus optional extras in `product_barcodes`
- `product_supplier_map` is a convenience table — products can be sourced from many suppliers through purchases
- Product images are uploaded to S3; `image_url` stores the S3 key (not a full URL — generate signed URLs on read)
- `AuditService.log()` is a fire-and-forget write — never throw if audit fails
- All list endpoints are paginated using the shared `PaginationDto`

---

## Backend Files to Create

### `backend/src/modules/audit/audit.module.ts`
Global module. Exports `AuditService`.

### `backend/src/modules/audit/audit.service.ts`
```typescript
async log(params: {
  userId: string;
  actionType: 'create' | 'update' | 'delete' | 'void' | 'refund' | 'adjust';
  entityType: string;
  entityId: string;
  beforeJson?: object;
  afterJson?: object;
  notes?: string;
}): Promise<void>
```
Writes to `audit_logs`. Wrapped in try/catch — never throws.

### `backend/src/modules/suppliers/suppliers.module.ts`
Imports `PrismaModule`, `AuditModule`.

### `backend/src/modules/suppliers/suppliers.controller.ts`
```
GET    /api/v1/suppliers                  @Roles('admin','operations','finance','viewer')
POST   /api/v1/suppliers                  @Roles('admin','operations')
GET    /api/v1/suppliers/:id              @Roles('admin','operations','finance','viewer')
PATCH  /api/v1/suppliers/:id              @Roles('admin','operations')
DELETE /api/v1/suppliers/:id              @Roles('admin')          — soft delete (is_active=false)
GET    /api/v1/suppliers/:id/products     @Roles('admin','operations','finance','viewer')
GET    /api/v1/suppliers/:id/spend        @Roles('admin','finance')
```

### `backend/src/modules/suppliers/suppliers.service.ts`
- `findAll(query)` — paginated, search by name, filter by country/is_active
- `findById(id)` — throws `NotFoundException` if not found
- `create(dto, userId)` — write audit log
- `update(id, dto, userId)` — write audit log with before/after
- `deactivate(id, userId)` — set `is_active: false`
- `getProductsBySupplier(supplierId)` — query `product_supplier_map` + `purchase_order_items`
- `getSpendSummary(supplierId, dateRange)` — sum `purchase_order_items.total_cost_gbp` grouped by month

### `backend/src/modules/suppliers/dto/create-supplier.dto.ts`
Fields: `name`, `supplierType` (enum: shop/wholesaler/importer/other), `contactName?`, `phone?`, `email?`, `addressLine1?`, `city?`, `country`, `currencyCode?`, `notes?`.

### `backend/src/modules/suppliers/dto/update-supplier.dto.ts`
`PartialType(CreateSupplierDto)`.

### `backend/src/modules/suppliers/dto/supplier-query.dto.ts`
Extends `PaginationDto`. Adds: `search?`, `country?`, `isActive?` (boolean).

### `backend/src/modules/products/products.module.ts`
Imports `PrismaModule`, `AuditModule`, `StorageModule` (for image upload).

### `backend/src/modules/products/products.controller.ts`
```
GET    /api/v1/products                   @Roles('admin','operations','warehouse','finance','viewer')
POST   /api/v1/products                   @Roles('admin','operations')
GET    /api/v1/products/barcode/:barcode  @Roles('admin','operations','warehouse','pos_cashier') — fastest endpoint, no pagination
GET    /api/v1/products/categories        — list all categories
POST   /api/v1/products/categories        @Roles('admin')
GET    /api/v1/products/:id               @Roles('admin','operations','warehouse','finance','viewer')
PATCH  /api/v1/products/:id               @Roles('admin','operations')
GET    /api/v1/products/:id/stock         @Roles('admin','operations','warehouse','finance','viewer')
GET    /api/v1/products/:id/history       @Roles('admin','operations','finance')
```

### `backend/src/modules/products/products.service.ts`
- `findAll(query)` — paginated, search by name/sku/barcode (OR across all three), filter by category/is_active/stock state
- `findByBarcode(barcode)` — check `products.barcode` first, then `product_barcodes.barcode`. Return full product. Throw `NotFoundException` if not found.
- `findById(id)` — includes category, barcodes, supplier map
- `create(dto, userId)` — create product + optional extra barcodes in `product_barcodes` + audit log
- `update(id, dto, userId)` — partial update + audit log
- `getStockByLocation(productId)` — query `inventory_balances` grouped by location
- `getHistory(productId)` — return recent purchases, shipment items, sale items for this product
- `getCategories()` — list `product_categories`
- `createCategory(dto)` — create `product_category`

### `backend/src/modules/products/dto/create-product.dto.ts`
Fields: `name`, `sku`, `barcode`, `categoryId`, `brand?`, `description?`, `unitType`, `defaultCostPriceGbp?`, `defaultSellingPriceGhs?`, `minimumStockThreshold`, `expiryTrackingEnabled`, `isActive`, `additionalBarcodes?: string[]`.

### `backend/src/modules/products/dto/update-product.dto.ts`
`PartialType(CreateProductDto)`.

### `backend/src/modules/products/dto/product-query.dto.ts`
Extends `PaginationDto`. Adds: `search?`, `categoryId?`, `isActive?`, `lowStock?` (boolean — filter where quantity_on_hand < minimum_stock_threshold).

### `backend/src/common/services/storage.service.ts`
- `uploadFile(key: string, buffer: Buffer, contentType: string)` — `PutObjectCommand` to S3
- `getSignedUrl(key: string)` — `GetObjectCommand` with 1-hour expiry
- `deleteFile(key: string)`

### `backend/src/modules/storage/storage.module.ts`
Provides and exports `StorageService`. Global module.

---

## Unit Tests to Write

### `backend/src/modules/audit/audit.service.spec.ts`
- `log()` writes a record to `audit_logs` with the correct fields
- `log()` does **not** throw when the DB write fails — it swallows the error silently
- `log()` sets `beforeJson` and `afterJson` correctly when both are provided

### `backend/src/modules/suppliers/suppliers.service.spec.ts`
- `findAll()` returns paginated results respecting `page` and `limit`
- `findAll()` filters by `search` against the `name` field
- `findById()` throws `NotFoundException` for an unknown ID
- `create()` calls `AuditService.log()` with `actionType: 'create'`
- `update()` calls `AuditService.log()` with correct `beforeJson` and `afterJson`
- `deactivate()` sets `isActive: false` without hard-deleting the record

### `backend/src/modules/products/products.service.spec.ts`
- `findByBarcode()` resolves when the barcode matches `products.barcode`
- `findByBarcode()` resolves when the barcode matches a row in `product_barcodes`
- `findByBarcode()` throws `NotFoundException` when neither table has a match
- `create()` creates additional barcode rows in `product_barcodes` when `additionalBarcodes` is provided
- `findAll()` with `search` filters across name, SKU, and barcode (OR logic)

---

## Frontend Files to Create

### `mobile/components/BarcodeScanner.tsx`
Reusable component. Uses `expo-camera` with barcode scanning enabled.
- Renders a camera view with an overlay rectangle in the center
- `onScanned(barcode: string)` callback prop — called once then pauses scanning (re-activate manually)
- Permission request handled internally
- Works as a modal or inline depending on `mode` prop

### `mobile/app/(app)/suppliers/index.tsx`
Supplier List Screen:
- `FlashList` of supplier cards (name, type, city, active badge)
- Search bar at top (debounced, 300ms)
- Filter by country, active/inactive
- FAB (floating action button) → `suppliers/new`
- Pull to refresh

### `mobile/app/(app)/suppliers/new.tsx`
Add Supplier Screen:
- Form: name, type picker, contact name, phone, email, address, country, notes
- Save button — calls `POST /suppliers`, navigates back on success

### `mobile/app/(app)/suppliers/[id].tsx`
Supplier Detail Screen:
- Header: name, type, location, contact info
- Products sourced section (FlashList of product chips)
- Recent purchases section
- Spend summary (monthly totals)
- Edit button → `suppliers/[id]/edit`

### `mobile/app/(app)/suppliers/[id]/edit.tsx`
Edit Supplier Screen:
- Pre-filled form from supplier data
- Save → `PATCH /suppliers/:id`

### `mobile/app/(app)/products/index.tsx`
Product List Screen:
- Search bar with barcode scan icon button (opens `BarcodeScanner` modal)
- `FlashList` of product cards (image thumbnail, name, SKU, stock badge)
- Filter chips: category, in-stock/low-stock/out-of-stock
- FAB → `products/new`
- On barcode scanned: call `GET /products/barcode/:barcode`, navigate to `products/[id]` on found, show "Product not found — add it?" prompt on 404

### `mobile/app/(app)/products/new.tsx`
Add Product Screen:
- Grouped form sections: Basic Info, Pricing, Stock Settings, Image
- Barcode field has camera scan button inline
- Category picker (loads from `GET /products/categories`)
- Unit type picker
- Expiry tracking toggle
- Image picker (expo-image-picker) → upload to backend which stores on S3
- Save → `POST /products`

### `mobile/app/(app)/products/[id].tsx`
Product Detail Screen:
- Product image, name, SKU, barcode, category
- Stock by location cards (UK / In Transit / Ghana)
- Low stock warning banner if below threshold
- Recent purchases tab
- Recent shipments tab
- Recent sales tab
- Suppliers used section
- Edit button

### `mobile/app/(app)/products/[id]/edit.tsx`
Edit Product Screen:
- Pre-filled form, same structure as Add Product

### `mobile/lib/api/suppliers.api.ts`
```typescript
export const suppliersApi = {
  list: (params) => client.get('/suppliers', { params }),
  get: (id) => client.get(`/suppliers/${id}`),
  create: (data) => client.post('/suppliers', data),
  update: (id, data) => client.patch(`/suppliers/${id}`, data),
  getProducts: (id) => client.get(`/suppliers/${id}/products`),
  getSpend: (id, params) => client.get(`/suppliers/${id}/spend`, { params }),
};
```

### `mobile/lib/api/products.api.ts`
```typescript
export const productsApi = {
  list: (params) => client.get('/products', { params }),
  get: (id) => client.get(`/products/${id}`),
  getByBarcode: (barcode) => client.get(`/products/barcode/${barcode}`),
  create: (data) => client.post('/products', data),
  update: (id, data) => client.patch(`/products/${id}`, data),
  getStock: (id) => client.get(`/products/${id}/stock`),
  getHistory: (id) => client.get(`/products/${id}/history`),
  getCategories: () => client.get('/products/categories'),
  createCategory: (data) => client.post('/products/categories', data),
};
```

---

## Implementation Steps

1. Create `AuditModule` and `AuditService.log()` — write unit tests first, then implement
2. Create `StorageModule` and `StorageService` — test upload/download with a local MinIO instance or real S3
3. Create `SuppliersModule` — service first, then controller, then register in `app.module.ts`
4. Seed a few test suppliers, confirm `GET /suppliers` returns paginated results
5. Create `ProductsModule` — categories first, then products service, then controller
6. Confirm `GET /products/barcode/:barcode` returns in under 100ms with a direct Postgres query
7. Build `BarcodeScanner` component on mobile — confirm camera permission prompt and scan callback work
8. Build Supplier List and Add Supplier screens — confirm create + list roundtrip
9. Build Product List screen with barcode scan shortcut
10. Build Add Product screen — confirm form saves and product appears in list
11. Build Product Detail screen — confirm stock by location and history tabs load
12. Run `npm test` — all unit tests must pass before proceeding
13. Test end-to-end: scan barcode on device → opens correct product detail screen

## Acceptance Criteria
- `GET /suppliers` returns paginated suppliers with search working
- `GET /products/barcode/:barcode` returns the product in <100ms
- Creating a product with multiple barcodes saves all of them; any barcode resolves back to the product
- Barcode scanner on device opens camera, scans, and navigates to the correct product or shows a not-found prompt
- Product detail shows correct stock by location (will be zero until STEP-03)
- Audit log has entries for every create/update action
- Image upload works: product image appears on the product detail screen
- `npm test` passes with all audit, suppliers, and products unit tests green
