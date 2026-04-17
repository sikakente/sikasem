# Comprehensive Bug Fix & UI/UX Improvement Spec

**Date:** 2026-04-17
**Scope:** Backend (NestJS) + Mobile (Expo React Native)
**Approach:** Four severity-based phases, each a separate commit

---

## Phase 1: Critical Fixes

### 1.1 Backend — `req.user.id` → `req.user.sub` (10 controllers)

**Problem:** JWT strategy returns `{ sub, email, roles }` but 10 controllers reference `req.user.id`, which is `undefined`. This silently breaks audit logging and any userId-dependent service logic.

**Affected controllers (all use `req.user.id`):**
- `customers.controller.ts` — lines 39, 55
- `fx.controller.ts` — line 59
- `invoices.controller.ts` — lines 38, 54, 60
- `purchasing.controller.ts` — lines 39, 55, 61
- `receiving.controller.ts` — lines 49, 65, 73
- `sales.controller.ts` — lines 38, 57
- `shipments.controller.ts` — lines 43, 59, 69, 79, 87, 97

**Fix:** Change `req.user.id` to `req.user.sub` and update type annotations from `{ user: { id: string } }` to `{ user: { sub: string } }` in all affected locations.

### 1.2 Backend — FX Rate Calculation Reversed in Sales Report

**Problem:** `backend/src/modules/reports/definitions/sales.report.ts:58` computes:
```ts
const gbpEquivalent = fxRate > 0 ? totalGhs * fxRate : 0;
```
The `exchangeRate` stored in `fx_records` represents GHS-per-GBP (confirmed by `sales.service.ts:175` where `targetAmount: totalGhs / fxRate`). Multiplying instead of dividing inflates GBP values by ~225x (for a typical rate of ~15).

**Fix:** Change to `totalGhs / fxRate`.

### 1.3 Backend — Empty userId in Risks/Opportunities Controllers

**Problem:** Both controllers hardcode empty string as userId:
- `risks.controller.ts:31` — `this.risksService.updateStatus(id, body.status, '')`
- `opportunities.controller.ts:34` — `this.opportunitiesService.updateStatus(id, body.status, '')`

**Fix:** Add `@Request() req: { user: { sub: string } }` parameter and pass `req.user.sub`.

### 1.4 Mobile — API Unwrapping Bug (3 screens)

**Problem:** The backend `ResponseInterceptor` wraps responses as `{ data: payload, meta: {...} }`. Axios adds its own `.data` wrapper. Correct unwrap: `(res.data as any).data`. But three screens do `(res.data as any).data?.data` which calls `.data` on the payload array, returning `undefined`, so lists are always empty.

**Affected screens:**
- `mobile/src/app/(app)/invoices/index.tsx:48` — `setInvoices((res.data as any).data?.data ?? [])`
- `mobile/src/app/(app)/sales/index.tsx:45` — `setSales((res.data as any).data?.data ?? [])`
- `mobile/src/app/(app)/customers/index.tsx:40` — `setCustomers((res.data as any).data?.data ?? [])`

**Fix:** Change to `(res.data as any).data ?? []` in all three.

### 1.5 Mobile — Silent Error Swallowing (6+ screens)

**Problem:** Multiple screens catch all errors silently, showing empty lists with no user feedback. Users can't distinguish between "no data" and "network error".

**Affected screens:**
- `invoices/index.tsx:49`
- `sales/index.tsx:46`
- `customers/index.tsx:41`
- `products/index.tsx:38`
- `shipments/index.tsx:50`
- `pos/index.tsx:42`

**Fix:** Add `error` state to each screen. In catch blocks, set error message. Display an error banner with retry button above or instead of the empty list.

---

## Phase 2: High Priority Fixes

### 2.1 Backend — Inline DTOs Without Validation

**Problem:** `risks.controller.ts` and `opportunities.controller.ts` define DTOs inline without class-validator decorators. Any string is accepted as a status.

**Fix:** Create proper DTO files:
- `backend/src/modules/risks/dto/update-risk-status.dto.ts` with `@IsString() @IsNotEmpty()` on status field (DB uses plain string, no enum — values include `open`, `monitoring`, `mitigated`, `resolved`).
- `backend/src/modules/opportunities/dto/update-opportunity-status.dto.ts` with `@IsString() @IsNotEmpty()` on status field (values include `open`, `evaluating`, `pursuing`, `captured`, `dismissed`).

### 2.2 Backend — Users Controller Missing DTO Validation

**Problem:** `users.controller.ts` `createRole` and `updateRolePermissions` accept raw `@Body()` objects without validation.

**Fix:** Create:
- `backend/src/modules/users/dto/create-role.dto.ts` — `name: @IsString() @IsNotEmpty() @MaxLength(50)`, `description: @IsOptional() @IsString()`
- `backend/src/modules/users/dto/update-role-permissions.dto.ts` — `permissions: @IsArray() @IsString({ each: true })`

### 2.3 Backend — Missing Audit Log for Purchase Order Creation

**Problem:** `purchasing.service.ts` `create()` method returns without calling `this.audit.log()`.

**Fix:** Add audit log after the create call, matching the pattern used in other services:
```ts
await this.audit.log({
  userId,
  actionType: 'purchase_order_create',
  entityType: 'purchase_order',
  entityId: order.id,
  afterJson: { referenceNo, itemCount: dto.items.length },
});
```

### 2.4 Backend — Receiving Quantity Validation

**Problem:** `receiving.service.ts` doesn't validate that `receivedQuantity + damagedQuantity + lostQuantity <= expectedQuantity` per item.

**Fix:** In the submit method, before processing items, add validation loop that sums quantities and throws `BadRequestException` if they exceed expected.

### 2.5 Mobile — Error States for List Screens

**Problem:** List screens show "No X found" for both empty data and load failures.

**Fix:** For each list screen (invoices, sales, customers, products, shipments, receiving):
- Add `const [error, setError] = useState<string | null>(null)` state
- In catch block: `setError('Failed to load. Tap to retry.')`
- Clear error on successful load
- Display error with retry touchable when error is set

### 2.6 Mobile — POS Touch Targets

**Problem:** POS stepper buttons are 32x32px, below the 44x44 minimum for accessible tap targets.

**Fix:** Increase `width` and `height` in POS stepper button styles from 32 to 44.

### 2.7 Mobile — Missing Accessibility Labels

**Problem:** FABs and critical buttons lack `accessibilityLabel` and `accessibilityRole` across most screens.

**Fix:** Add accessibility props to:
- All FAB buttons (`accessibilityLabel="Create new X"`, `accessibilityRole="button"`)
- POS stepper buttons (`accessibilityLabel="Increase/Decrease quantity"`)
- Filter chips (`accessibilityRole="button"`)

---

## Phase 3: Medium Priority — UI/UX Polish

### 3.1 Mobile — Consistent Loading States

**Problem:** Standalone `ActivityIndicator` components appear against transparent backgrounds on some screens.

**Fix:** Wrap loading indicators in a centered container view with `flex: 1` and the screen's background color.

### 3.2 Mobile — Form Validation UX

**Problem:** Inventory adjustment error messages persist until next submit attempt.

**Fix:** Clear error state when user modifies the relevant field (quantity input `onChangeText`, location selection, etc.).

### 3.3 Mobile — Auto-Select Location Feedback

**Problem:** When only one location exists, it's auto-selected without visual feedback. Users may not realize a selection was made.

**Fix:** Show a brief informational text: "Only one location available — auto-selected."

### 3.4 Mobile — Consistent Date Formatting

**Problem:** Screens use different date formatting approaches (`toLocaleDateString`, `toISOString().split('T')[0]`, etc.).

**Fix:** Create `mobile/src/lib/utils/date.ts` with:
```ts
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}
```
Use across all list screens.

---

## Phase 4: Low Priority — Code Quality

### 4.1 Mobile — Shared API Unwrap Helper

**Problem:** Every screen manually casts and unwraps `(res.data as any).data` differently.

**Fix:** Create `mobile/src/lib/api/unwrap.ts`:
```ts
export function unwrap<T = unknown>(res: { data: unknown }): T {
  return (res.data as any)?.data as T;
}
```
Use across screens to standardize the pattern.

### 4.2 Mobile — FX Rate Validation in POS Payment

**Problem:** POS payment screen accepts any FX rate including negative values. `parseFloat(fxRate) || 1` converts negative to a valid number.

**Fix:** Add validation: if parsed rate is <= 0, show error and don't proceed.

### 4.3 Backend — Missing `@ApiBearerAuth()` Decorators

**Problem:** Alerts, risks, and opportunities controllers lack `@ApiBearerAuth()`, making Swagger docs incomplete.

**Fix:** Add `@ApiBearerAuth()` class decorator to all three controllers.

---

## Files Modified Summary

**Backend (estimated 18 files):**
- 10 controllers: `req.user.id` → `req.user.sub`
- 1 report definition: FX rate fix
- 2 controllers: risks/opportunities userId + DTOs
- 2 new DTO files: risks, opportunities
- 2 new DTO files: users (createRole, updateRolePermissions)
- 1 service: purchasing audit log
- 1 service: receiving quantity validation

**Mobile (estimated 12 files):**
- 3 screens: API unwrapping fix
- 6+ screens: error state + error display
- 1 screen: POS touch targets + accessibility
- 6+ screens: accessibility labels
- 1 new utility: date formatting
- 1 new utility: API unwrap helper
- 1 screen: FX rate validation
- 1 screen: form validation UX
