# Comprehensive Bug Fix & UI/UX Improvement Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all verified bugs across backend and mobile, add error states to mobile list screens, improve accessibility, and polish UI/UX consistency.

**Architecture:** Four severity-based phases. Phase 1 fixes critical data-loss and auth bugs. Phase 2 adds validation DTOs and error states. Phase 3 polishes UI/UX consistency. Phase 4 adds code quality helpers.

**Tech Stack:** NestJS (TypeScript, Prisma), Expo React Native (TypeScript, Zustand, Expo Router)

---

## Phase 1: Critical Fixes

### Task 1: Fix `req.user.id` → `req.user.sub` in all backend controllers

The JWT strategy at `backend/src/modules/auth/strategies/jwt.strategy.ts:22-24` returns `{ sub, email, roles }`. Ten controllers incorrectly reference `req.user.id` (which is `undefined`), breaking audit logging and userId-dependent logic.

**Files:**
- Modify: `backend/src/modules/customers/customers.controller.ts`
- Modify: `backend/src/modules/fx/fx.controller.ts`
- Modify: `backend/src/modules/invoices/invoices.controller.ts`
- Modify: `backend/src/modules/purchasing/purchasing.controller.ts`
- Modify: `backend/src/modules/receiving/receiving.controller.ts`
- Modify: `backend/src/modules/sales/sales.controller.ts`
- Modify: `backend/src/modules/shipments/shipments.controller.ts`

- [ ] **Step 1: Fix customers.controller.ts**

Change lines 37 and 53 from `{ user: { id: string } }` to `{ user: { sub: string } }` and lines 39/55 from `req.user.id` to `req.user.sub`:

```typescript
// Line 37: in create()
@Request() req: { user: { sub: string } },
) {
    return this.customersService.create(dto, req.user.sub);

// Line 53: in update()
@Request() req: { user: { sub: string } },
) {
    return this.customersService.update(id, dto, req.user.sub);
```

- [ ] **Step 2: Fix fx.controller.ts**

Change line 57 type and line 59 access:

```typescript
// Line 57: in createConversion()
@Request() req: { user: { sub: string } },
) {
    return this.fxService.createConversion(dto, req.user.sub);
```

- [ ] **Step 3: Fix invoices.controller.ts**

Change lines 36, 52, 59 types and lines 38, 54, 60 accesses:

```typescript
// Line 36: in create()
@Request() req: { user: { sub: string } },
) {
    return this.invoicesService.create(dto, req.user.sub);

// Line 52: in update()
@Request() req: { user: { sub: string } },
) {
    return this.invoicesService.update(id, dto, req.user.sub);

// Line 59: in markPaid()
markPaid(@Param('id') id: string, @Request() req: { user: { sub: string } }) {
    return this.invoicesService.markPaid(id, req.user.sub);
```

- [ ] **Step 4: Fix purchasing.controller.ts**

Change lines 37, 53, 60 types and lines 39, 55, 61 accesses:

```typescript
// Line 37: in create()
@Request() req: { user: { sub: string } },
) {
    return this.purchasingService.create(dto, req.user.sub);

// Line 53: in update()
@Request() req: { user: { sub: string } },
) {
    return this.purchasingService.update(id, dto, req.user.sub);

// Line 60: in confirm()
confirm(@Param('id') id: string, @Request() req: { user: { sub: string } }) {
    return this.purchasingService.confirm(id, req.user.sub);
```

- [ ] **Step 5: Fix receiving.controller.ts**

Change lines 47, 63, 72 types and lines 49, 65, 73 accesses:

```typescript
// Line 47: in create()
@Request() req: { user: { sub: string } },
) {
    return this.receivingService.create(dto, req.user.sub);

// Line 63: in update()
@Request() req: { user: { sub: string } },
) {
    return this.receivingService.update(id, dto, req.user.sub);

// Line 72: in submit()
submit(@Param('id') id: string, @Request() req: { user: { sub: string } }) {
    return this.receivingService.submit(id, req.user.sub);
```

- [ ] **Step 6: Fix sales.controller.ts**

Change lines 37, 55 types and lines 38, 57 accesses:

```typescript
// Line 37: in create()
@Request() req: { user: { sub: string } },
) {
    return this.salesService.create(dto, req.user.sub);

// Line 55: in void()
@Request() req: { user: { sub: string } },
) {
    return this.salesService.void(id, dto, req.user.sub);
```

- [ ] **Step 7: Fix shipments.controller.ts**

Change lines 41, 57, 67, 77, 86, 95 types and lines 43, 59, 69, 79, 87, 97 accesses:

```typescript
// Line 41: in create()
@Request() req: { user: { sub: string } },
) {
    return this.shipmentsService.create(dto, req.user.sub);

// Line 57: in update()
@Request() req: { user: { sub: string } },
) {
    return this.shipmentsService.update(id, dto, req.user.sub);

// Line 67: in addItem()
@Request() req: { user: { sub: string } },
) {
    return this.shipmentsService.addItem(id, dto, req.user.sub);

// Line 77: in removeItem()
@Request() req: { user: { sub: string } },
) {
    return this.shipmentsService.removeItem(id, itemId, req.user.sub);

// Line 86: in dispatch()
dispatch(@Param('id') id: string, @Request() req: { user: { sub: string } }) {
    return this.shipmentsService.dispatch(id, req.user.sub);

// Line 95: in addCost()
@Request() req: { user: { sub: string } },
) {
    return this.shipmentsService.addCost(id, dto, req.user.sub);
```

- [ ] **Step 8: Run backend lint to verify no issues**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 9: Commit**

```bash
git add backend/src/modules/customers/customers.controller.ts \
  backend/src/modules/fx/fx.controller.ts \
  backend/src/modules/invoices/invoices.controller.ts \
  backend/src/modules/purchasing/purchasing.controller.ts \
  backend/src/modules/receiving/receiving.controller.ts \
  backend/src/modules/sales/sales.controller.ts \
  backend/src/modules/shipments/shipments.controller.ts
git commit -m "fix(backend): use req.user.sub instead of req.user.id across all controllers

JWT payload uses 'sub' for userId. Ten controllers incorrectly used
'id', passing undefined to services and breaking audit logging."
```

---

### Task 2: Fix FX rate calculation in sales report

**Files:**
- Modify: `backend/src/modules/reports/definitions/sales.report.ts:58`

- [ ] **Step 1: Fix the calculation**

At line 58, change multiplication to division:

```typescript
// Before:
const gbpEquivalent = fxRate > 0 ? totalGhs * fxRate : 0;

// After:
const gbpEquivalent = fxRate > 0 ? totalGhs / fxRate : 0;
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/reports/definitions/sales.report.ts
git commit -m "fix(backend): correct FX rate direction in sales report

exchangeRate is GHS-per-GBP. Must divide totalGhs by rate to get GBP,
not multiply. Was inflating GBP values by ~225x."
```

---

### Task 3: Fix empty userId in risks and opportunities controllers

**Files:**
- Modify: `backend/src/modules/risks/risks.controller.ts`
- Modify: `backend/src/modules/opportunities/opportunities.controller.ts`

- [ ] **Step 1: Fix risks.controller.ts**

Add `Request` to the import and `@Request()` parameter to `updateStatus()`:

```typescript
import { Body, Controller, Get, Param, Patch, Query, Request } from '@nestjs/common';
```

Change the `updateStatus` method (lines 28-31):

```typescript
@Patch(':id/status')
@Roles('admin', 'operations', 'finance')
updateStatus(
  @Param('id') id: string,
  @Body() body: UpdateRiskStatusDto,
  @Request() req: { user: { sub: string } },
) {
  return this.risksService.updateStatus(id, body.status, req.user.sub);
}
```

- [ ] **Step 2: Fix opportunities.controller.ts**

Add `Request` to the import and `@Request()` parameter:

```typescript
import { Body, Controller, Get, Param, Patch, Query, Request } from '@nestjs/common';
```

Change the `updateStatus` method (lines 29-34):

```typescript
@Patch(':id/status')
@Roles('admin', 'operations')
updateStatus(
  @Param('id') id: string,
  @Body() body: UpdateOpportunityStatusDto,
  @Request() req: { user: { sub: string } },
) {
  return this.opportunitiesService.updateStatus(id, body.status, req.user.sub);
}
```

- [ ] **Step 3: Run type check**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/risks/risks.controller.ts \
  backend/src/modules/opportunities/opportunities.controller.ts
git commit -m "fix(backend): pass actual userId in risks/opportunities controllers

Was hardcoding empty string as userId, breaking audit trail."
```

---

### Task 4: Fix mobile API unwrapping in invoices, sales, customers screens

**Files:**
- Modify: `mobile/src/app/(app)/invoices/index.tsx:48`
- Modify: `mobile/src/app/(app)/sales/index.tsx:45`
- Modify: `mobile/src/app/(app)/customers/index.tsx:40`

- [ ] **Step 1: Fix invoices/index.tsx**

Line 48 — change:
```typescript
// Before:
setInvoices((res.data as any).data?.data ?? []);

// After:
setInvoices((res.data as any).data ?? []);
```

- [ ] **Step 2: Fix sales/index.tsx**

Line 45 — change:
```typescript
// Before:
setSales((res.data as any).data?.data ?? []);

// After:
setSales((res.data as any).data ?? []);
```

- [ ] **Step 3: Fix customers/index.tsx**

Line 40 — change:
```typescript
// Before:
setCustomers((res.data as any).data?.data ?? []);

// After:
setCustomers((res.data as any).data ?? []);
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/app/\(app\)/invoices/index.tsx \
  mobile/src/app/\(app\)/sales/index.tsx \
  mobile/src/app/\(app\)/customers/index.tsx
git commit -m "fix(mobile): correct API response unwrapping in invoices, sales, customers

These screens used .data?.data which accessed .data on the payload
array (returning undefined). Lists were always empty."
```

---

### Task 5: Add error states to mobile list screens

Replace silent error catching with visible error feedback on 6 screens.

**Files:**
- Modify: `mobile/src/app/(app)/invoices/index.tsx`
- Modify: `mobile/src/app/(app)/sales/index.tsx`
- Modify: `mobile/src/app/(app)/customers/index.tsx`
- Modify: `mobile/src/app/(app)/products/index.tsx`
- Modify: `mobile/src/app/(app)/shipments/index.tsx`
- Modify: `mobile/src/app/(app)/pos/index.tsx`

- [ ] **Step 1: Add error state to invoices/index.tsx**

Add error state after line 39:
```typescript
const [error, setError] = useState<string | null>(null);
```

In the `load` function, update the try/catch (lines 42-54):
```typescript
const load = useCallback(async (filterIndex: number) => {
  try {
    setError(null);
    const f = STATUS_FILTERS[filterIndex];
    const params: Record<string, unknown> = {};
    if (f.value) params.status = f.value;
    if (f.overdue) params.overdue = true;
    const res = await invoicesApi.list(params);
    setInvoices((res.data as any).data ?? []);
  } catch {
    setError('Failed to load invoices. Tap to retry.');
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, []);
```

Add error display before the FlatList in the render (after the loading check, inside the else branch). Replace the existing ternary with:
```tsx
{loading ? (
  <ActivityIndicator style={styles.loader} color="#2563eb" />
) : error ? (
  <TouchableOpacity style={styles.errorBanner} onPress={() => { setLoading(true); load(activeFilter); }}>
    <Text style={styles.errorText}>{error}</Text>
  </TouchableOpacity>
) : (
  <FlatList ... />
)}
```

Add styles:
```typescript
errorBanner: {
  backgroundColor: '#fee2e2',
  padding: 16,
  margin: 16,
  borderRadius: 10,
  alignItems: 'center',
},
errorText: { color: '#dc2626', fontSize: 14, textAlign: 'center' },
```

- [ ] **Step 2: Add error state to sales/index.tsx**

Add error state after line 40:
```typescript
const [error, setError] = useState<string | null>(null);
```

Update the load function (lines 42-51):
```typescript
const load = useCallback(async (status?: string) => {
  try {
    setError(null);
    const res = await salesApi.list({ status, limit: 50 });
    setSales((res.data as any).data ?? []);
  } catch {
    setError('Failed to load sales. Tap to retry.');
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, []);
```

Add the same error display pattern and styles as invoices. The retry calls `load(statusFilter)`.

- [ ] **Step 3: Add error state to customers/index.tsx**

Add error state after line 34:
```typescript
const [error, setError] = useState<string | null>(null);
```

Update the load function (lines 37-46):
```typescript
const load = useCallback(async (searchVal = '') => {
  try {
    setError(null);
    const res = await customersApi.list({ search: searchVal || undefined });
    setCustomers((res.data as any).data ?? []);
  } catch {
    setError('Failed to load customers. Tap to retry.');
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, []);
```

Add same error display and styles. Retry calls `load(search)`.

- [ ] **Step 4: Add error state to products/index.tsx**

Add error state after line 31:
```typescript
const [error, setError] = useState<string | null>(null);
```

Update the load function (lines 34-42):
```typescript
const load = useCallback(async (searchVal = '') => {
  try {
    setError(null);
    const res = await productsApi.list({ search: searchVal || undefined });
    setProducts((res.data as any)?.data?.products ?? (res.data as any)?.data ?? []);
  } catch {
    setError('Failed to load products. Tap to retry.');
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, []);
```

Add same error display and styles. Retry calls `load(search)`.

- [ ] **Step 5: Add error state to shipments/index.tsx**

Add error state after line 41:
```typescript
const [error, setError] = useState<string | null>(null);
```

Update the load function (lines 43-55):
```typescript
const load = useCallback(async (searchVal = '', status?: string) => {
  try {
    setError(null);
    const res = await shipmentsApi.list({
      search: searchVal || undefined,
      status,
    });
    setShipments((res.data as any).data ?? []);
  } catch {
    setError('Failed to load shipments. Tap to retry.');
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, []);
```

Add same error display and styles. Retry calls `load(search, statusFilter)`.

- [ ] **Step 6: Add error state to pos/index.tsx**

In the `handleSearch` callback, update the catch block (line 43):
```typescript
} catch {
  setSearchResults([]);
}
```

This is a search autocomplete — showing an error banner would be disruptive. Instead, clear results silently but don't change the main error state. The POS screen doesn't have a primary load function, so this is the appropriate fix.

- [ ] **Step 7: Commit**

```bash
git add mobile/src/app/\(app\)/invoices/index.tsx \
  mobile/src/app/\(app\)/sales/index.tsx \
  mobile/src/app/\(app\)/customers/index.tsx \
  mobile/src/app/\(app\)/products/index.tsx \
  mobile/src/app/\(app\)/shipments/index.tsx \
  mobile/src/app/\(app\)/pos/index.tsx
git commit -m "fix(mobile): add error states to list screens instead of silent failures

Users now see 'Failed to load...' with tap-to-retry instead of empty
lists when API calls fail."
```

---

## Phase 2: High Priority Fixes

### Task 6: Create proper DTOs for risks and opportunities controllers

**Files:**
- Create: `backend/src/modules/risks/dto/update-risk-status.dto.ts`
- Create: `backend/src/modules/opportunities/dto/update-opportunity-status.dto.ts`
- Modify: `backend/src/modules/risks/risks.controller.ts`
- Modify: `backend/src/modules/opportunities/opportunities.controller.ts`

- [ ] **Step 1: Create update-risk-status.dto.ts**

```typescript
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateRiskStatusDto {
  @IsString()
  @IsNotEmpty()
  status!: string;
}
```

- [ ] **Step 2: Create update-opportunity-status.dto.ts**

```typescript
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateOpportunityStatusDto {
  @IsString()
  @IsNotEmpty()
  status!: string;
}
```

- [ ] **Step 3: Update risks.controller.ts to use the new DTO**

Remove the inline class definition (lines 7-9) and add import:
```typescript
import { UpdateRiskStatusDto } from './dto/update-risk-status.dto';
```

- [ ] **Step 4: Update opportunities.controller.ts to use the new DTO**

Remove the inline class definition (lines 7-9) and add import:
```typescript
import { UpdateOpportunityStatusDto } from './dto/update-opportunity-status.dto';
```

- [ ] **Step 5: Run type check**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/risks/dto/update-risk-status.dto.ts \
  backend/src/modules/opportunities/dto/update-opportunity-status.dto.ts \
  backend/src/modules/risks/risks.controller.ts \
  backend/src/modules/opportunities/opportunities.controller.ts
git commit -m "fix(backend): extract and validate DTOs for risks/opportunities status updates

Inline DTOs had no class-validator decorators. Status field now requires
a non-empty string."
```

---

### Task 7: Create proper DTOs for users controller role endpoints

**Files:**
- Create: `backend/src/modules/users/dto/create-role.dto.ts`
- Create: `backend/src/modules/users/dto/update-role-permissions.dto.ts`
- Modify: `backend/src/modules/users/users.controller.ts`

- [ ] **Step 1: Create create-role.dto.ts**

```typescript
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
```

- [ ] **Step 2: Create update-role-permissions.dto.ts**

```typescript
import { IsArray, IsString } from 'class-validator';

export class UpdateRolePermissionsDto {
  @IsArray()
  @IsString({ each: true })
  permissions!: string[];
}
```

- [ ] **Step 3: Update users.controller.ts to use the new DTOs**

Add imports:
```typescript
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
```

Change `createRole` method (lines 42-44):
```typescript
@Post('roles')
createRole(@Body() dto: CreateRoleDto) {
  return this.usersService.createRole(dto.name, dto.description);
}
```

Change `updateRolePermissions` method (lines 47-52):
```typescript
@Patch('roles/:id/permissions')
updateRolePermissions(
  @Param('id') id: string,
  @Body() dto: UpdateRolePermissionsDto,
) {
  return this.usersService.updateRolePermissions(id, dto.permissions);
}
```

- [ ] **Step 4: Run type check**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/users/dto/create-role.dto.ts \
  backend/src/modules/users/dto/update-role-permissions.dto.ts \
  backend/src/modules/users/users.controller.ts
git commit -m "fix(backend): add validated DTOs for user role creation and permission updates

Role name and permissions were unvalidated raw body objects."
```

---

### Task 8: Add audit log for purchase order creation

**Files:**
- Modify: `backend/src/modules/purchasing/purchasing.service.ts:74-104`

- [ ] **Step 1: Add audit log after create**

After line 104 (`return order;`), replace with:

```typescript
await this.audit.log({
  userId,
  actionType: 'purchase_order_create',
  entityType: 'purchase_order',
  entityId: order.id,
  afterJson: {
    referenceNo,
    supplierId: dto.supplierId,
    itemCount: dto.items.length,
  },
});

return order;
```

- [ ] **Step 2: Run type check**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/purchasing/purchasing.service.ts
git commit -m "fix(backend): add missing audit log for purchase order creation"
```

---

### Task 9: Add receiving quantity validation

**Files:**
- Modify: `backend/src/modules/receiving/receiving.service.ts`

- [ ] **Step 1: Add validation in submit method**

In the `submit` method, after the `record.status === 'completed'` check (after line 209) and before `virtualLocation` lookup, add:

```typescript
// Validate item quantities don't exceed shipment quantities
for (const item of record.items) {
  const received = Number(item.receivedQuantity) || 0;
  const damaged = Number(item.damagedQuantity) || 0;
  const lost = Number(item.lostQuantity) || 0;
  const expected = Number(item.expectedQuantity) || 0;
  if (received + damaged + lost > expected) {
    throw new BadRequestException(
      `Item ${item.productId}: total received (${received}) + damaged (${damaged}) + lost (${lost}) exceeds expected (${expected})`,
    );
  }
}
```

Add `BadRequestException` to the import from `@nestjs/common` at the top of the file.

- [ ] **Step 2: Run type check**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/receiving/receiving.service.ts
git commit -m "fix(backend): validate receiving quantities don't exceed expected

Prevents receiving more items than shipped, which would corrupt
inventory balances."
```

---

### Task 10: Increase POS stepper touch targets and add accessibility

**Files:**
- Modify: `mobile/src/app/(app)/pos/index.tsx`

- [ ] **Step 1: Increase touch targets**

Change `stepBtn` style (lines 241-246) from width/height 32 to 44:

```typescript
stepBtn: {
  width: 44,
  height: 44,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#f3f4f6',
},
```

- [ ] **Step 2: Add accessibility labels to stepper buttons**

On the decrement button (line 77-81):
```tsx
<TouchableOpacity
  style={styles.stepBtn}
  onPress={() => store.updateQuantity(item.productId, item.quantity - 1)}
  accessibilityLabel={`Decrease ${item.productName} quantity`}
  accessibilityRole="button"
>
```

On the increment button (line 84-88):
```tsx
<TouchableOpacity
  style={styles.stepBtn}
  onPress={() => store.updateQuantity(item.productId, item.quantity + 1)}
  accessibilityLabel={`Increase ${item.productName} quantity`}
  accessibilityRole="button"
>
```

On the remove button (line 92-96):
```tsx
<TouchableOpacity
  style={styles.removeBtn}
  onPress={() => store.removeItem(item.productId)}
  accessibilityLabel={`Remove ${item.productName} from cart`}
  accessibilityRole="button"
>
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/app/\(app\)/pos/index.tsx
git commit -m "fix(mobile): increase POS stepper touch targets to 44px and add accessibility labels

Touch targets were 32x32, below the 44x44 minimum. Added
accessibilityLabel and accessibilityRole to stepper and remove buttons."
```

---

### Task 11: Add accessibility labels to FABs across screens

**Files:**
- Modify: `mobile/src/app/(app)/invoices/index.tsx`
- Modify: `mobile/src/app/(app)/customers/index.tsx`
- Modify: `mobile/src/app/(app)/products/index.tsx`
- Modify: `mobile/src/app/(app)/shipments/index.tsx`

Note: `inventory/index.tsx` already has accessibility props on its FAB.

- [ ] **Step 1: Add to invoices FAB**

At line 113:
```tsx
<TouchableOpacity
  style={styles.fab}
  onPress={() => router.push('/(app)/invoices/new')}
  accessibilityLabel="Create new invoice"
  accessibilityRole="button"
>
```

- [ ] **Step 2: Add to customers FAB**

At line 114:
```tsx
<TouchableOpacity
  style={styles.fab}
  onPress={() => router.push('/(app)/customers/new')}
  accessibilityLabel="Add new customer"
  accessibilityRole="button"
>
```

- [ ] **Step 3: Add to products FAB**

At line 129:
```tsx
<TouchableOpacity
  style={styles.fab}
  onPress={() => router.push('/(app)/products/new')}
  accessibilityLabel="Add new product"
  accessibilityRole="button"
>
```

- [ ] **Step 4: Add to shipments FAB**

At line 144:
```tsx
<TouchableOpacity
  style={styles.fab}
  onPress={() => router.push('/(app)/shipments/new')}
  accessibilityLabel="Create new shipment"
  accessibilityRole="button"
>
```

- [ ] **Step 5: Commit**

```bash
git add mobile/src/app/\(app\)/invoices/index.tsx \
  mobile/src/app/\(app\)/customers/index.tsx \
  mobile/src/app/\(app\)/products/index.tsx \
  mobile/src/app/\(app\)/shipments/index.tsx
git commit -m "fix(mobile): add accessibility labels to FABs across list screens"
```

---

## Phase 3: Medium Priority — UI/UX Polish

### Task 12: Add `@ApiBearerAuth()` to missing controllers

**Files:**
- Modify: `backend/src/modules/alerts/alerts.controller.ts`
- Modify: `backend/src/modules/risks/risks.controller.ts`
- Modify: `backend/src/modules/opportunities/opportunities.controller.ts`

- [ ] **Step 1: Add to alerts.controller.ts**

Add import and decorator:
```typescript
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('alerts')
@ApiBearerAuth()
@Controller('alerts')
```

Note: Currently only imports `ApiTags`. Need to add `ApiBearerAuth` to the import.

- [ ] **Step 2: Add to risks.controller.ts**

Add import and decorator:
```typescript
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('risks')
@ApiBearerAuth()
@Controller('risks')
```

- [ ] **Step 3: Add to opportunities.controller.ts**

Add import and decorator:
```typescript
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('opportunities')
@ApiBearerAuth()
@Controller('opportunities')
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/alerts/alerts.controller.ts \
  backend/src/modules/risks/risks.controller.ts \
  backend/src/modules/opportunities/opportunities.controller.ts
git commit -m "fix(backend): add @ApiBearerAuth() to alerts, risks, opportunities controllers

Swagger docs now correctly indicate these endpoints require auth."
```

---

### Task 13: Create shared date formatting utility

**Files:**
- Create: `mobile/src/lib/utils/date.ts`
- Modify: `mobile/src/app/(app)/invoices/index.tsx`
- Modify: `mobile/src/app/(app)/sales/index.tsx`
- Modify: `mobile/src/app/(app)/shipments/index.tsx`

- [ ] **Step 1: Create date utility**

Create `mobile/src/lib/utils/date.ts`:

```typescript
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
```

- [ ] **Step 2: Use in invoices/index.tsx**

Add import:
```typescript
import { formatDate } from '../../../lib/utils/date';
```

Change line 74:
```typescript
// Before:
<Text style={styles.cardMeta}>Due {new Date(item.dueDate).toLocaleDateString()}</Text>

// After:
<Text style={styles.cardMeta}>Due {formatDate(item.dueDate)}</Text>
```

- [ ] **Step 3: Use in sales/index.tsx**

Add import:
```typescript
import { formatDate } from '../../../lib/utils/date';
```

Change line 80:
```typescript
// Before:
{new Date(item.saleDatetime).toLocaleDateString()} ·{' '}

// After:
{formatDate(item.saleDatetime)} ·{' '}
```

- [ ] **Step 4: Use in shipments/index.tsx**

Add import:
```typescript
import { formatDate } from '../../../lib/utils/date';
```

Change line 90:
```typescript
// Before:
Dispatched {new Date(item.dispatchDate).toLocaleDateString()}

// After:
Dispatched {formatDate(item.dispatchDate)}
```

Change line 95:
```typescript
// Before:
ETA {new Date(item.expectedArrivalDate).toLocaleDateString()}

// After:
ETA {formatDate(item.expectedArrivalDate)}
```

- [ ] **Step 5: Commit**

```bash
git add mobile/src/lib/utils/date.ts \
  mobile/src/app/\(app\)/invoices/index.tsx \
  mobile/src/app/\(app\)/sales/index.tsx \
  mobile/src/app/\(app\)/shipments/index.tsx
git commit -m "refactor(mobile): add shared formatDate utility and use across list screens

Standardizes date display as 'Apr 17, 2026' format across all screens."
```

---

### Task 14: Improve inventory adjustment form validation UX

**Files:**
- Modify: `mobile/src/app/(app)/inventory/adjustment.tsx`

- [ ] **Step 1: Clear error when user edits quantity**

Find the quantity TextInput's `onChangeText` handler and add `setError(null)`:

```typescript
onChangeText={(val) => {
  setQuantity(val);
  setError(null);
}}
```

Do the same for the reason TextInput:
```typescript
onChangeText={(val) => {
  setReason(val);
  setError(null);
}}
```

- [ ] **Step 2: Add auto-select feedback**

After the location auto-selection logic (where `if (locs.length === 1) setSelectedLocation(locs[0])` appears), the UI should indicate this was auto-selected. This can be done in the render by checking `locationOptions.length === 1`:

In the location picker section, add a hint text when only one location exists:
```tsx
{locationOptions.length === 1 && (
  <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
    Only one location available — auto-selected.
  </Text>
)}
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/app/\(app\)/inventory/adjustment.tsx
git commit -m "fix(mobile): improve inventory adjustment form validation UX

Clear errors when user edits fields. Show hint when location is
auto-selected."
```

---

## Phase 4: Low Priority — Code Quality

### Task 15: Create shared API unwrap helper

**Files:**
- Create: `mobile/src/lib/api/unwrap.ts`

- [ ] **Step 1: Create the helper**

```typescript
/**
 * Unwrap the backend response envelope.
 * Backend wraps all responses as { data: payload, meta: { timestamp } }.
 * Axios adds its own .data wrapper. This helper extracts the payload.
 */
export function unwrap<T = unknown>(res: { data: unknown }): T {
  return (res.data as any)?.data as T;
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/lib/api/unwrap.ts
git commit -m "refactor(mobile): add shared unwrap helper for API response envelope

Standardizes (res.data as any).data pattern into a typed helper."
```

---

### Task 16: Add FX rate validation in POS payment screen

**Files:**
- Modify: `mobile/src/app/(app)/pos/payment.tsx`

- [ ] **Step 1: Add validation before sale completion**

In `handleCompleteSale` (after line 56 `setError(null)`), add:

```typescript
const parsedRate = parseFloat(fxRate);
if (!parsedRate || parsedRate <= 0) {
  setError('FX rate must be a positive number.');
  setLoading(false);
  return;
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/app/\(app\)/pos/payment.tsx
git commit -m "fix(mobile): validate FX rate is positive before completing POS sale

Prevents negative or zero FX rates from corrupting GBP calculations."
```

---

## Verification

### Task 17: Final verification

- [ ] **Step 1: Run backend type check**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run backend lint**

Run: `cd backend && npm run lint`
Expected: No errors (or only pre-existing warnings)

- [ ] **Step 3: Run backend tests**

Run: `cd backend && npm test`
Expected: All tests pass

- [ ] **Step 4: Run mobile lint**

Run: `cd mobile && npm run lint`
Expected: No errors (or only pre-existing warnings)
