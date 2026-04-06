# STEP-13: Settings, Admin, Audit Logs, and App Navigation Shell

## Goal
Complete the application: persistent navigation shell with role-based tab visibility, Settings screens, User Management screens, Audit Log viewer, and Business Profile configuration. After this step the app is a fully navigable, production-ready product with every screen connected.

## Prerequisites
- All prior steps (STEP-00 through STEP-12)

## Reference Documents
- `requirements/grocery_export_prd.md` — sections 6.1 (Auth/Roles), 6.18 (Audit Logs)
- `requirements/grocery_export_backend_spec.md` — section 4.19 (Audit Module), section 4.2 (Users/Roles)
- `requirements/grocery_export_screen_map_user_flows.md` — section 4.17

---

## Key Decisions

### Navigation Structure
Expo Router uses a file-based layout. The app shell uses a **bottom tab bar** on phone and a **drawer/sidebar** on tablet. Tabs are filtered by role — a `pos_cashier` only sees POS, Sales, and Settings. A viewer sees Dashboard and Reports only.

Tab bar items (phone):
1. Dashboard (all roles except pos_cashier)
2. POS (pos_cashier, admin, operations)
3. Inventory (admin, operations, warehouse)
4. Shipments (admin, operations, warehouse)
5. More → opens a full-screen menu with remaining modules

The "More" screen shows a grid of module cards (Products, Suppliers, Purchasing, Receiving, Sales, Customers, FX, Invoices, Receipts, Reports, Alerts, AI Assistant, Settings). Visibility is gated per role.

### Quick Actions Floating Bar
A floating quick-action bar on the home screen (Dashboard) provides 1-tap access to the 6 most common operational actions regardless of which tab is active:
- Scan Product
- New Purchase
- New Shipment
- Receive Goods
- Start Sale
- Ask AI

### Business Profile
The `business_profiles` table is not in the current schema — it is a simple key-value settings store. Use a single JSON config stored in a `settings` table (key: `business_profile`, value: JSONB). Simpler than a dedicated table for MVP.

### Audit Log Viewer
Admin-only. Read-only. Displays `audit_logs` with filters. Does not allow editing or deletion of audit entries — they are immutable.

---

## Backend Files to Create

### `backend/src/modules/audit/audit.controller.ts`
(The `AuditService` was built in STEP-02. Only the controller is new.)
```
GET /api/v1/audit-logs   @Roles('admin')
```
Returns paginated audit logs. Filter by `entityType`, `actionType`, `userId`, `dateFrom`, `dateTo`.

### `backend/src/modules/audit/dto/audit-query.dto.ts`
Extends `PaginationDto`. Fields: `entityType?`, `actionType?`, `userId?`, `dateFrom?`, `dateTo?`.

### `backend/src/modules/locations/locations.controller.ts`
(The `LocationsService` was built in STEP-03. Only the controller is new.)
```
GET   /api/v1/locations        @Roles('admin','operations','warehouse','viewer')
POST  /api/v1/locations        @Roles('admin')
PATCH /api/v1/locations/:id    @Roles('admin')
```

### `backend/src/modules/locations/dto/create-location.dto.ts`
Fields: `name`, `locationType` (enum: UK_warehouse/Ghana_warehouse/Ghana_shop/shipment), `country`, `city?`, `address?`, `isActive`.

### `backend/src/modules/settings/settings.module.ts`
New module. Provides a simple key-value settings store backed by a `settings` table (key VARCHAR PK, value JSONB).

Add `settings` table to Prisma schema:
```prisma
model Setting {
  key       String   @id
  value     Json
  updatedAt DateTime @updatedAt
  updatedBy String?
}
```
Run migration: `npx prisma migrate dev --name add_settings_table`.

### `backend/src/modules/settings/settings.service.ts`
- `get(key: string): Promise<any>` — returns parsed JSONB value or null
- `set(key: string, value: object, userId: string): Promise<void>` — upsert + audit log
- `getBusinessProfile()` — `get('business_profile')`
- `setBusinessProfile(dto, userId)` — `set('business_profile', dto, userId)`

### `backend/src/modules/settings/settings.controller.ts`
```
GET   /api/v1/settings/business-profile    @Roles('admin','finance','viewer')
PATCH /api/v1/settings/business-profile    @Roles('admin')
GET   /api/v1/settings/notifications       @Roles('admin')
PATCH /api/v1/settings/notifications       @Roles('admin')
```

### `backend/src/modules/settings/dto/business-profile.dto.ts`
Fields: `businessName`, `contactEmail`, `contactPhone`, `addressLine1`, `addressLine2?`, `city`, `country`, `logoUrl?`, `receiptFooter?`, `invoiceFooter?`, `taxNumber?`.

### `backend/src/modules/settings/dto/notification-settings.dto.ts`
Fields: `alertEmailEnabled` (boolean), `alertEmailRecipients` (string[]), `lowStockThresholdOverride?` (number), `fxLossThresholdGbp?` (number).

---

## Unit Tests to Write

### `backend/src/modules/settings/settings.service.spec.ts`
- `get()` returns `null` for a key that does not exist in the `settings` table
- `set()` upserts a value — calling it twice with the same key updates the existing row
- `getBusinessProfile()` delegates to `get('business_profile')`
- `setBusinessProfile()` delegates to `set('business_profile', dto, userId)` and writes an audit log

### `mobile/hooks/usePermissions.spec.ts` (mobile Jest tests)
- `hasRole('admin')` returns `true` for a user with `roles: ['admin']`
- `hasRole('finance')` returns `false` for a user with `roles: ['warehouse']`
- `canAccess('reports')` returns `true` for `finance` role
- `canAccess('reports')` returns `false` for `pos_cashier` role
- `canAccess('pos')` returns `true` for `pos_cashier` role
- `canAccess('settings')` returns `false` for `viewer` role
- `canAccess('settings')` returns `true` for `admin` role
- Returns `false` for all modules when `user` is `null` (not logged in)

---

## Frontend Files to Create

### `mobile/hooks/usePermissions.ts`
```typescript
export function usePermissions() {
  const { user } = useAuthStore();

  const hasRole = (...roles: string[]): boolean =>
    roles.some(r => user?.roles?.includes(r));

  const canAccess = (module: AppModule): boolean => {
    const moduleRoles: Record<AppModule, string[]> = {
      dashboard: ['admin','operations','finance','viewer'],
      pos: ['admin','operations','pos_cashier'],
      inventory: ['admin','operations','warehouse'],
      shipments: ['admin','operations','warehouse'],
      purchasing: ['admin','operations'],
      receiving: ['admin','operations','warehouse'],
      sales: ['admin','operations','finance','viewer'],
      customers: ['admin','operations','finance'],
      fx: ['admin','finance'],
      invoices: ['admin','finance'],
      reports: ['admin','finance','viewer'],
      alerts: ['admin','operations','finance'],
      ai: ['admin','operations','finance','viewer'],
      settings: ['admin'],
      users: ['admin'],
    };
    return hasRole(...(moduleRoles[module] ?? []));
  };

  return { hasRole, canAccess };
}
```

### `mobile/app/(app)/_layout.tsx`
Authenticated app root layout:
- Reads `user.roles` from `authStore`
- Renders a bottom `TabBar` with role-filtered tabs
- On tablet (width > 768): renders a `Drawer` sidebar instead of bottom tabs
- Wraps all screens in a consistent header component

### `mobile/components/navigation/TabBar.tsx`
Custom tab bar component:
- Reads `canAccess()` from `usePermissions()`
- Renders only the tabs the current user's role can see
- Shows: icon, label, active indicator
- "More" tab always visible — opens the More screen
- Large tap targets (min 44px height)

### `mobile/components/navigation/QuickActions.tsx`
Floating quick-action strip shown on the Dashboard screen:
- 6 action buttons in a horizontal scroll view (or 2×3 grid on larger screens)
- Each button: icon + label
- Buttons: Scan Product, New Purchase, New Shipment, Receive Goods, Start Sale, Ask AI
- Visibility gated by `canAccess()` — e.g. pos_cashier only sees "Start Sale"
- Each navigates directly to the relevant screen

### `mobile/app/(app)/more/index.tsx`
More Screen (full-screen module grid):
- 4-column icon grid of all modules
- Each module card: icon, label, role-gated visibility
- Section headers: Operations / Finance / Analytics / Admin

### `mobile/app/(app)/settings/index.tsx`
Settings Home Screen:
- Grouped list sections:
  - **Business**: Business Profile, Logo
  - **Finance**: Currency settings, Tax settings
  - **Notifications**: Alert settings, Email recipients
  - **Operations**: Barcode settings, Locations
  - **AI**: AI Assistant settings (enable/disable, default prompts)
  - **Account**: User Management (admin only), Roles & Permissions (admin only), Audit Log (admin only)
  - **Session**: Logout, Logout all devices

### `mobile/app/(app)/settings/business.tsx`
Business Profile Screen:
- Form: business name, contact details, address, tax number
- Logo upload (image picker → uploads to backend → returns logo URL)
- Receipt footer text area
- Invoice footer text area
- Save button → `PATCH /settings/business-profile`

### `mobile/app/(app)/settings/notifications.tsx`
Notification Settings Screen:
- Alert email toggle
- Email recipients input (comma-separated)
- Low stock threshold override (numeric)
- FX loss alert threshold (GBP numeric)
- Save button

### `mobile/app/(app)/settings/users/index.tsx`
User Management Screen (admin only):
- `FlashList` of users: name, email, role badge, active/inactive indicator
- FAB → `settings/users/new`
- Tap user → `settings/users/[id]`

### `mobile/app/(app)/settings/users/new.tsx`
Create User Screen:
- Full name, email, password (temporary), role picker (single role select)
- Note: user is prompted to change password on first login (future feature — stub for now)
- Save → `POST /users`

### `mobile/app/(app)/settings/users/[id].tsx`
User Detail / Edit Screen:
- Pre-filled form fields
- Role picker
- Active/Inactive toggle
- Reset Password button (triggers `POST /auth/forgot-password` for that user's email)
- Save → `PATCH /users/:id`

### `mobile/app/(app)/settings/roles.tsx`
Role and Permission Screen (admin only):
- Table/matrix view: rows = roles, columns = permission codes
- Checkboxes at each intersection
- Save changes → `PATCH /roles/:id/permissions` for each changed role
- Read-only for non-admin users

### `mobile/app/(app)/settings/audit.tsx`
Audit Log Viewer Screen (admin only):
- `FlashList` of log entries: timestamp, user, action type badge, entity type, entity ID
- Filter by action type, entity type, user, date range
- Tap entry → bottom sheet with before/after JSON diff (formatted, read-only)

### `mobile/app/(app)/settings/locations.tsx`
Locations Screen (admin only):
- List of configured locations
- Add new location form (name, type, country, city)
- Edit existing location

### `mobile/lib/api/admin.api.ts`
```typescript
export const adminApi = {
  getAuditLogs: (params) => client.get('/audit-logs', { params }),
  getLocations: () => client.get('/locations'),
  createLocation: (data) => client.post('/locations', data),
  updateLocation: (id, data) => client.patch(`/locations/${id}`, data),
  getBusinessProfile: () => client.get('/settings/business-profile'),
  updateBusinessProfile: (data) => client.patch('/settings/business-profile', data),
  getNotificationSettings: () => client.get('/settings/notifications'),
  updateNotificationSettings: (data) => client.patch('/settings/notifications', data),
};
```

---

## Implementation Steps

1. Add `settings` table to Prisma schema and run migration
2. Create `SettingsModule` with `SettingsService` and `SettingsController`
3. Test `GET /settings/business-profile` (returns null before setup) and `PATCH` to create it
4. Add `AuditController` (controller only — service exists from STEP-02)
5. Add `LocationsController` (controller only — service exists from STEP-03)
6. Write unit tests for `usePermissions` hook first (covering all roles × modules), then implement until all pass
7. Build `TabBar` component with role filtering — test on device with each role type
8. Build `QuickActions` component — verify role-gated visibility
9. Build `(app)/_layout.tsx` with tab bar and role-based routing
10. Build More screen module grid
11. Build Settings Home screen
12. Build Business Profile screen — test logo upload and form save
13. Build User Management screens — test create user → user can log in
14. Build Roles & Permissions matrix screen — test permission change takes effect
15. Build Audit Log Viewer — test filter and before/after JSON diff display
16. Build Notification Settings screen
17. Build Locations management screen
18. Run `npm test` in both `backend/` and `mobile/` — all unit tests across the entire project must pass
19. Final integration test: walk through the entire app with each role and verify correct screens are visible/hidden

## Acceptance Criteria
- Bottom tab bar shows only the tabs relevant to the logged-in user's role
- `pos_cashier` role can only access POS, Sales History, and Settings (account section only)
- `viewer` role can only access Dashboard, Reports, and read-only screens
- Business Profile saves correctly and the data appears on generated invoices/receipts (requires updating `PdfService` to read `GET /settings/business-profile`)
- Audit Log Viewer shows all audit entries with correct before/after data
- Admin can create a new user, assign a role, and that user can log in and see only their permitted screens
- Quick actions on dashboard navigate directly to the correct screens
- All 32 MVP screens from the screen map are accessible and functional
- `npm test` passes in both `backend/` and `mobile/` — `usePermissions` is fully unit-tested for all role/module combinations and `SettingsService` upsert behaviour is verified
