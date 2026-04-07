# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

Monorepo with two workspaces:
- `backend/` — NestJS REST API (TypeScript, Prisma ORM, PostgreSQL)
- `mobile/` — Expo React Native app (TypeScript, Expo Router, Zustand)
- `requirements/` — PRD, database schema, implementation plans (STEP-00 through STEP-13)

## Backend Commands

```bash
cd backend

npm run start:dev          # Dev server with hot reload (port 3000)
npm test                   # Run all unit tests
npm test -- --testPathPattern=inventory   # Run a single test file
npm run test:cov           # Coverage report
npm run lint               # ESLint + auto-fix
npm run build              # Compile to dist/

npx prisma generate        # Regenerate Prisma client after schema changes
npx prisma migrate dev     # Create + apply a new migration
npx prisma migrate deploy  # Apply migrations (production)
ts-node prisma/seed.ts     # Seed roles, permissions, admin user, warehouse locations
npx tsc --noEmit           # Type-check without emitting
```

Local database: `docker compose up postgres` then set `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/exportmanager`.

Swagger UI available at `http://localhost:3000/api/v1/docs` when running.

## Mobile Commands

```bash
cd mobile

npm start          # Expo dev server
npm run ios        # iOS simulator
npm run android    # Android emulator
npm test           # Jest
npm run lint       # ESLint
```

Set `EXPO_PUBLIC_API_URL` in a `.env` file to point at the backend (defaults to `http://localhost:3000/api/v1`).

## Backend Architecture

### Module pattern

Every feature is a NestJS module under `src/modules/<feature>/`. The full module structure includes:
- `<feature>.module.ts` — imports, providers, exports
- `<feature>.service.ts` — business logic
- `<feature>.controller.ts` — HTTP endpoints under `@Controller('<resource>')`
- `<feature>.service.spec.ts` — unit tests (mocked Prisma, no real DB)
- `dto/` — request/response shapes with class-validator decorators

### Global modules (no import needed)

- **`PrismaModule`** (`src/prisma/`) — `PrismaService` injectable everywhere
- **`AuditModule`** (`src/modules/audit/`) — `AuditService.log()` is fire-and-forget; never throws
- **`LocationsModule`** (`src/modules/locations/`) — `LocationsService` with `getUkWarehouse()` / `getGhanaWarehouse()` convenience methods

### Auth & guards

`JwtAuthGuard` and `RolesGuard` are registered as global `APP_GUARD` in `AppModule` — all routes are protected by default.

- `@Public()` — bypasses JWT check entirely
- `@Roles('admin', 'operations', ...)` — role allowlist
- `@RequirePermission('inventory.adjust')` + `@UseGuards(PermissionsGuard)` — fine-grained permission check (uses a 5-minute in-memory cache keyed on role set)

JWT payload shape: `{ sub: userId, email, roles: string[] }` — available as `req.user` in controllers.

### Response envelope

All responses are wrapped automatically by `ResponseInterceptor`:
```json
{ "data": <payload>, "meta": { "timestamp": "..." } }
```
Mobile API clients must unwrap via `response.data.data`.

### Inventory movement engine (most critical)

`InventoryService.recordMovement()` is the **only** way stock changes. Every module that moves stock (purchasing, shipments, receiving, sales, adjustments) calls it — never write directly to `inventory_movements` or `inventory_balances`.

Key behaviours:
- Stock availability check and balance upsert run inside the **same** Prisma `$transaction` to prevent race conditions
- Pass `tx` (the transaction client) when calling from inside another `$transaction` — the method uses it instead of opening a new one
- `allocate_shipment` decrements `quantityAvailable` only (not `quantityOnHand`) — stock is reserved, not yet removed
- Throws `ConflictException('Insufficient stock')` when `quantityAvailable < quantity` and `allowNegative` is false
- Uses `Prisma.Decimal` (not `Number()`) for all quantity comparisons

### Pagination

Extend `PaginationDto` (`src/common/dto/pagination.dto.ts`) for any paginated query DTO. It provides `page` (default 1) and `limit` (default 20, max 100) with class-validator decorators already applied.

### Seeded reference data

- **Roles:** `admin`, `operations`, `warehouse`, `pos_cashier`, `finance`, `viewer`
- **Permissions:** `inventory.adjust`, `inventory.override_negative`, `sales.void`, `sales.refund`, `sales.discount`, `shipments.dispatch`, `shipments.receive`, `reports.export`, `users.manage`, `fx.convert`
- **Locations:** `UK Warehouse` (locationType: `'UK warehouse'`) and `Ghana Warehouse` (locationType: `'Ghana warehouse'`)

## Mobile Architecture

### Routing

Expo Router file-based routing under `src/app/`:
- `(auth)/` — login, forgot-password, reset-password (redirects to `(app)` if authenticated)
- `(app)/` — all authenticated screens

Session is restored from `expo-secure-store` on app boot in `src/app/_layout.tsx`. Navigation guards live there, not in individual screens.

### State

- `src/store/auth.store.ts` — Zustand; holds `accessToken`, `user`, `isAuthenticated`; refresh token persisted in SecureStore
- `src/store/inventory.store.ts` — Zustand; holds `balances` and `lowStockCount` for dashboard use

### API client

`src/lib/api/client.ts` — axios instance with base URL `/api/v1`, attaches Bearer token from auth store, auto-refreshes on 401 with queued retry.

Feature API modules in `src/lib/api/` follow the pattern:
```typescript
export const featureApi = {
  list: (params?) => client.get('/resource', { params }),
  get: (id) => client.get(`/resource/${id}`),
  create: (data) => client.post('/resource', data),
};
```

## Implementation Plans

Step-by-step plans for the full build live in `requirements/implementation-plans/`. Each STEP document contains exact file paths, key decisions, acceptance criteria, and unit test specifications. Completed steps: STEP-00 through STEP-03.

When implementing a step, reference the plan file and the schema at `requirements/grocery_export_database_schema.md`.
