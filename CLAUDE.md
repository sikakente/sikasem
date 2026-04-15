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
npm run start:dev | npm test | npm run test:cov | npm run lint | npm run build
npm test -- --testPathPattern=<name>
npx prisma generate | npx prisma migrate dev | npx prisma db seed | npx tsc --noEmit
```

DB: `docker compose up postgres`, `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/exportmanager`. Swagger: `http://localhost:3000/api/v1/docs`.

## Mobile Commands

```bash
cd mobile
npm start | npm run ios | npm run android | npm test | npm run lint
```

Set `EXPO_PUBLIC_API_URL` in `.env` (defaults to `http://localhost:3000/api/v1`).

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
- `(app)/` — all authenticated screens: dashboard (index), inventory, products, purchasing, shipments, suppliers

Session is restored from `expo-secure-store` on app boot in `src/app/_layout.tsx`. Navigation guards live there, not in individual screens.

### State

- `src/store/auth.store.ts` — Zustand; holds `accessToken`, `user`, `isAuthenticated`; refresh token persisted in SecureStore
- `src/store/inventory.store.ts` — Zustand; holds `balances` and `lowStockCount` for dashboard use
- `src/store/shipments.store.ts` — Zustand; holds shipment list and active shipment detail

### API client

`src/lib/api/client.ts` — axios instance, base URL `/api/v1`, attaches Bearer token, auto-refreshes on 401 with queued retry. Feature API modules in `src/lib/api/` export `{ list, get, create, ... }` functions.

## Before Pushing a PR

Run `cd backend && npm run lint` and `cd mobile && npm run lint`. Fix all errors. Do not use `--no-verify`.

## Implementation Plans

Plans in `requirements/implementation-plans/`. Completed: STEP-00 through STEP-10. Reference the plan file and `requirements/grocery_export_database_schema.md` when implementing a step.

## graphify

Knowledge graph at `graphify-out/`. Read `graphify-out/GRAPH_REPORT.md` before architecture questions; use `graphify-out/wiki/index.md` if it exists.
