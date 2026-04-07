# STEP-08: Invoices

## Goal
Invoice generation (from a sale or manual), server-side PDF rendering, invoice lifecycle management (draft → sent → paid), and invoice screens. Also establishes the shared `PdfService` and `StorageService` utilities that receipts (STEP-06) and reports (STEP-10) both depend on. Note: `ReceiptsService` in STEP-06 already needed PDF/storage — implement the shared utilities here and backfill receipts to use them.

## Prerequisites
- STEP-00, STEP-01, STEP-06 (customers + sales exist)

## Reference Documents
- `requirements/grocery_export_prd.md` — section 6.11 (Invoices and Receipts)
- `requirements/grocery_export_database_schema.md` — tables: `invoices`, `invoice_items`, `receipts`
- `requirements/grocery_export_screen_map_user_flows.md` — sections 4.13, 5.8

---

## Key Decisions

### PDF Generation
PDFs are rendered server-side using `pdfkit`. This keeps PDF logic off the device and ensures consistent output regardless of platform. The PDF is:
1. Generated in memory as a Buffer
2. Uploaded to S3 via `StorageService`
3. S3 key stored in `invoices.pdf_url` / `receipts.pdf_url`
4. On download request, a signed S3 URL is returned (1-hour expiry)

### Invoice vs Receipt
- **Receipt**: auto-generated when a POS sale completes. Always linked to a sale. Simple layout.
- **Invoice**: created manually by finance staff or generated from a sale for wholesale customers. More formal layout with due date, tax, business details.

### From-Sale Invoice
`POST /invoices` accepts an optional `saleId`. If provided, the service auto-populates line items from the sale. The invoice is linked to both the customer and the sale.

### Shared Utilities
If `StorageService` was already stubbed in STEP-02 for product images, replace/extend it here with the full implementation. `PdfService` is new — it provides:
- `renderInvoice(invoice, items, businessProfile) → Buffer`
- `renderReceipt(sale, items, businessProfile) → Buffer`

---

## Backend Files to Create

### `backend/src/common/services/pdf.service.ts`
Uses `pdfkit`. Methods:
- `renderInvoice(data: InvoicePdfData): Promise<Buffer>` — full invoice layout with business logo, header, line items table, totals, payment instructions
- `renderReceipt(data: ReceiptPdfData): Promise<Buffer>` — compact receipt layout with store details, items, total, payment method

### `backend/src/common/services/storage.service.ts`
(Extend from stub in STEP-02)
- `uploadFile(key: string, buffer: Buffer, contentType: string): Promise<void>`
- `getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>`
- `deleteFile(key: string): Promise<void>`

### `backend/src/modules/storage/storage.module.ts`
Global module providing `StorageService` and `PdfService`.

### `backend/src/modules/invoices/invoices.module.ts`
Imports `PrismaModule`, `AuditModule`, `StorageModule`, `CustomersModule`.

### `backend/src/modules/invoices/invoices.service.ts`
- `findAll(query)` — paginated, filter by status/customer/date/overdue flag
- `findById(id)` — includes items, customer, linked sale, pdf_url
- `create(dto, userId)` — if `saleId` provided, populate items from sale. Generate PDF. Upload to S3. Save `invoices` + `invoice_items` rows. Audit log.
- `update(id, dto, userId)` — only allowed in `draft` status. Regenerate PDF on significant changes.
- `markPaid(id, userId)` — set status to `paid`. Audit log.
- `getPdfUrl(id)` — return signed URL from S3
- `getOverdueInvoices()` — utility for alerts engine (STEP-11)

### `backend/src/modules/invoices/invoices.controller.ts`
```
GET   /api/v1/invoices              @Roles('admin','finance','operations','viewer')
POST  /api/v1/invoices              @Roles('admin','finance')
GET   /api/v1/invoices/:id          @Roles('admin','finance','operations','viewer')
PATCH /api/v1/invoices/:id          @Roles('admin','finance')
POST  /api/v1/invoices/:id/mark-paid @Roles('admin','finance')
GET   /api/v1/invoices/:id/pdf      @Roles('admin','finance','operations','viewer')
```

### `backend/src/modules/invoices/dto/create-invoice.dto.ts`
Fields: `customerId`, `saleId?`, `invoiceDate`, `dueDate`, `currencyCode` (GHS or GBP), `shippingTotal?`, `taxTotal?`, `notes?`, `items: CreateInvoiceItemDto[]`.

### `backend/src/modules/invoices/dto/create-invoice-item.dto.ts`
Fields: `productId?`, `description`, `quantity`, `unitPrice`, `discountAmount?`.

### `backend/src/modules/invoices/dto/update-invoice.dto.ts`
`PartialType(CreateInvoiceDto)`.

### `backend/src/modules/invoices/dto/invoice-query.dto.ts`
Extends `PaginationDto`. Fields: `status?`, `customerId?`, `dateFrom?`, `dateTo?`, `overdue?` (boolean — where `due_date < now` and `status != 'paid'`).

---

## Unit Tests to Write

### `backend/src/common/services/pdf.service.spec.ts`
- `renderInvoice()` returns a `Buffer` with length > 0
- `renderInvoice()` output begins with the PDF magic bytes (`%PDF`)
- `renderReceipt()` returns a `Buffer` with length > 0
- `renderReceipt()` output begins with the PDF magic bytes (`%PDF`)

### `backend/src/modules/invoices/invoices.service.spec.ts`
- `create()` with a `saleId` auto-populates `invoice_items` from the sale's line items
- `create()` without a `saleId` uses the items provided in the DTO
- `create()` calls `PdfService.renderInvoice()` and `StorageService.uploadFile()`
- `create()` saves the S3 key into `invoices.pdf_url`
- `markPaid()` sets `status = 'paid'` and writes an audit log entry
- `getPdfUrl()` calls `StorageService.getSignedUrl()` with the stored key and returns the result
- `getOverdueInvoices()` returns only invoices where `due_date < now` and `status != 'paid'`

---

## Frontend Files to Create

### `mobile/src/components/InvoiceStatusBadge.tsx`
Maps status to colour:
- `draft` → grey
- `sent` → blue
- `paid` → green
- `overdue` → red
- `cancelled` → dark grey/strikethrough

### `mobile/src/app/(app)/invoices/index.tsx`
Invoice List Screen:
- `FlashList` of invoice rows: invoice number, customer name, date, total, status badge
- Filter tabs: All / Draft / Sent / Paid / Overdue
- Filter by customer (search picker), date range
- FAB → `invoices/new`

### `mobile/src/app/(app)/invoices/new.tsx`
Create Invoice Screen:
- Customer picker (search + create new inline)
- "Generate from Sale" option — opens sale selector, auto-populates items
- Invoice date + due date pickers
- Currency picker (GHS / GBP)
- Line items section: product picker or free-text description, quantity, unit price, discount
- Shipping and tax totals
- Notes
- Total summary footer
- Save as Draft / Generate & Preview buttons

### `mobile/src/app/(app)/invoices/[id].tsx`
Invoice Detail Screen:
- Invoice number, dates, status badge
- Customer details section
- Line items table (product/description, qty, unit price, discount, line total)
- Totals breakdown (subtotal, discount, shipping, tax, total)
- Payment status (outstanding/paid)
- PDF section: Preview button (opens signed URL in browser/PDF viewer), Download button
- Action buttons: Mark Paid, Send (stub in MVP — shows "coming soon")

### `mobile/src/app/(app)/receipts/index.tsx`
Receipt Archive Screen:
- `FlashList` of receipts: receipt number, date, sale total, linked sale ID
- Search by receipt number
- Tap → opens PDF signed URL

### `mobile/src/lib/api/invoices.api.ts`
```typescript
export const invoicesApi = {
  list: (params) => client.get('/invoices', { params }),
  get: (id) => client.get(`/invoices/${id}`),
  create: (data) => client.post('/invoices', data),
  update: (id, data) => client.patch(`/invoices/${id}`, data),
  markPaid: (id) => client.post(`/invoices/${id}/mark-paid`),
  getPdfUrl: (id) => client.get(`/invoices/${id}/pdf`),
};
```

### `mobile/src/lib/api/receipts.api.ts`
```typescript
export const receiptsApi = {
  list: (params) => client.get('/receipts', { params }),
  get: (id) => client.get(`/receipts/${id}`),
  getPdfUrl: (id) => client.get(`/receipts/${id}/pdf`),
};
```

---

## Implementation Steps

1. Write unit tests for `PdfService.renderInvoice()` and `renderReceipt()` first, then implement until both pass
2. Implement `PdfService.renderReceipt()` — update `ReceiptsService` from STEP-06 to use this method
3. Implement (or extend) `StorageService` — test upload and signed URL generation with real S3 or MinIO
4. Create `InvoicesModule` — service first, controller after
5. Implement `InvoicesService.create()` — test both the manual and from-sale paths
6. Implement `InvoicesService.getPdfUrl()` — verify signed URL works in a browser
7. Implement `InvoicesController`
8. Build `InvoiceStatusBadge` component
9. Build Invoice List screen
10. Build Create Invoice screen — test the "Generate from Sale" flow
11. Build Invoice Detail screen — verify PDF preview opens
12. Build Receipt Archive screen
13. Run `npm test` — all PDF service and invoices unit tests must pass
14. End-to-end test: create a wholesale customer → complete a sale → generate invoice from sale → download PDF

## Acceptance Criteria
- `POST /invoices` with a `saleId` generates an invoice pre-populated with the sale's line items
- PDF is uploaded to S3 and accessible via signed URL
- `GET /invoices/:id/pdf` returns a signed URL that opens the PDF correctly
- Overdue filter shows invoices where due date has passed and status is not paid
- Invoice Detail screen displays the correct totals and PDF preview link
- Receipt Archive shows all receipts from completed sales (STEP-06)
- Marking an invoice paid updates its status and writes to the audit log
- `npm test` passes — PDF rendering, from-sale item population, and overdue filter all have unit test coverage
