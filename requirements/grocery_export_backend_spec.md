# Backend Architecture Specification
## NestJS API for Grocery Export Business Manager

## 1. Purpose

This document defines the backend architecture for the grocery export business platform. It is intended for a developer or AI builder implementing the API layer.

The backend must serve a React Native Expo frontend and support all modules defined in the PRD: inventory, purchasing, shipments, POS, FX tracking, invoicing, reporting, alerts, and AI insights.

---

## 2. Technology Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | NestJS | TypeScript-first, modular, decorator-based |
| Language | TypeScript | strict mode enabled |
| Runtime | Node.js (LTS) | |
| Database | PostgreSQL | as specified in schema document |
| ORM | Prisma | type-safe schema-first ORM, good migrations story |
| Auth (authn) | Custom JWT via @nestjs/jwt + Passport | access + refresh token pair, tokens stored in expo-secure-store on device |
| Auth (authz) | RBAC + fine-grained permissions | roles and permissions stored in PostgreSQL, enforced via NestJS Guards |
| Email (password reset) | AWS SES | transactional email only |
| Secrets | AWS Secrets Manager | JWT secrets and API keys injected at container startup |
| Validation | class-validator + class-transformer | via @nestjs/class-validator |
| File Storage | AWS S3 or Supabase Storage | for invoices, receipts, product images |
| Task Scheduling | @nestjs/schedule | for alerts, risk detection, opportunity detection |
| AI Integration | Anthropic Claude API | via @anthropic-ai/sdk |
| API Style | REST | JSON responses, versioned under /api/v1 |
| Documentation | Swagger via @nestjs/swagger | auto-generated from decorators |
| Testing | Jest | unit and integration tests |

---

## 3. Project Structure

```
src/
  app.module.ts
  main.ts
  common/
    decorators/
    filters/
    guards/
    interceptors/
    pipes/
    dto/
  config/
    database.config.ts
    jwt.config.ts
    storage.config.ts
  modules/
    auth/
    users/
    roles/
    suppliers/
    products/
    purchasing/
    inventory/
    shipments/
    receiving/
    sales/
    pos/
    customers/
    invoices/
    receipts/
    fx/
    dashboard/
    reports/
    alerts/
    risks/
    opportunities/
    ai/
    audit/
  prisma/
    schema.prisma
    migrations/
```

Each module follows the standard NestJS structure:
- `module.ts`
- `controller.ts`
- `service.ts`
- `dto/` — request and response DTOs
- `entities/` — Prisma model types or domain types if needed

---

## 4. Module Overview

### 4.1 Auth Module
Handles login, token issuance, refresh rotation, and password reset.

#### Why custom JWT and not AWS Cognito
This is an internal staff app. Accounts are created by an admin — users do not self-register. AWS Cognito is built for consumer-scale self-registration and adds unnecessary complexity and cost for this use case. Custom JWT keeps the auth model simple, fully within the existing stack, and tightly coupled to the custom roles/permissions system that is central to the PRD.

#### Endpoints
- `POST /auth/login` — validates credentials, returns access token + refresh token
- `POST /auth/refresh` — validates refresh token, issues new access token + rotated refresh token
- `POST /auth/logout` — invalidates the refresh token for the current session
- `POST /auth/logout-all` — invalidates all refresh tokens for the user (all devices)
- `POST /auth/forgot-password` — sends reset link via AWS SES
- `POST /auth/reset-password` — validates reset token, applies new password

#### Token design
| Token | Lifetime | Storage (device) | Storage (server) |
|---|---|---|---|
| Access token | 15 minutes | Zustand/React state (in-memory only) | Not stored — stateless JWT |
| Refresh token | 7 days | expo-secure-store (iOS Keychain / Android Keystore) | Hashed in `refresh_tokens` table |

Access tokens are never written to expo-secure-store. Only the refresh token persists on device. This limits the window of exposure if memory is somehow read.

#### Refresh token schema (additional table)
```
refresh_tokens
  id            UUID PK
  user_id       FK users.id
  token_hash    VARCHAR        bcrypt hash of the issued token
  device_label  VARCHAR        optional, e.g. "iPhone 14 - Kenneth"
  issued_at     TIMESTAMP
  expires_at    TIMESTAMP
  revoked_at    TIMESTAMP      nullable — set on logout or rotation
```

#### Refresh token rotation
On every `POST /auth/refresh`:
1. Validate the incoming refresh token against `token_hash` in the DB
2. If token is already revoked → revoke all sessions for this user (reuse detected) and return 401
3. If valid → revoke the old record (set `revoked_at`), issue new access + refresh tokens, insert new `refresh_tokens` row

This detects token theft: if a stolen token is used after the legitimate client has already rotated it, all sessions are killed.

#### Password reset flow
1. User submits email to `POST /auth/forgot-password`
2. A short-lived signed JWT (10 min) is generated as the reset token — no extra DB table needed
3. AWS SES sends an email containing a deep link: `exportapp://reset-password?token=...`
4. React Native handles the deep link via Expo Router and presents the new password form
5. `POST /auth/reset-password` validates the token, hashes the new password, saves it

#### Implementation packages
- `@nestjs/jwt` — token signing and verification
- `@nestjs/passport` + `passport-jwt` — JWT extraction and validation on protected routes
- `bcrypt` — password hashing and refresh token hashing
- `@aws-sdk/client-ses` — password reset emails
- `@aws-sdk/client-secrets-manager` — load JWT_SECRET and JWT_REFRESH_SECRET at startup

---

### 4.2 Users and Roles Module
Manages users and role-based access control.

Endpoints:
- `GET /users`
- `POST /users`
- `GET /users/:id`
- `PATCH /users/:id`
- `DELETE /users/:id`
- `GET /roles`
- `POST /roles`
- `PATCH /roles/:id/permissions`

#### Authorization model
Two-layer RBAC:

**Layer 1 — Role guard (coarse-grained)**
Protects entire routes or controllers. Example: only `admin` and `finance` roles can access `/reports`.

```typescript
@Roles('admin', 'finance')
@Get('reports/profitability')
getProfitabilityReport() { ... }
```

**Layer 2 — Permission guard (fine-grained)**
Protects specific actions within a route. Example: only users with `inventory.adjust` permission can make manual stock adjustments.

```typescript
@RequirePermission('inventory.adjust')
@Post('inventory/adjustments')
createAdjustment() { ... }
```

#### Defined roles (from PRD)
| Role | Access summary |
|---|---|
| admin | Full access including user management and all overrides |
| operations | Inventory, shipments, purchasing, receiving, dashboard |
| warehouse | Inventory adjustments, shipment packing, receiving |
| pos_cashier | POS sales only, receipt reprint |
| finance | Invoices, FX, reports, dashboard |
| viewer | Read-only on dashboard and reports |

#### JWT payload
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "roles": ["warehouse"],
  "iat": 1700000000,
  "exp": 1700000900
}
```

Roles are embedded in the JWT so the guard does not need a DB call on every request. Permissions are loaded from DB once and cached in memory (or Redis if needed) since they change infrequently.

#### Permission codes (examples)
| Code | Description |
|---|---|
| `inventory.adjust` | Manual stock adjustment |
| `inventory.override_negative` | Allow stock to go below zero |
| `sales.void` | Void a completed sale |
| `sales.refund` | Issue a refund |
| `sales.discount` | Apply discounts at POS |
| `shipments.dispatch` | Mark shipment dispatched |
| `shipments.receive` | Confirm goods received |
| `reports.export` | Export reports to CSV/Excel/PDF |
| `users.manage` | Create and edit users |
| `fx.convert` | Log cash conversions |

---

### 4.3 Suppliers Module
CRUD for supplier and shop records.

Endpoints:
- `GET /suppliers`
- `POST /suppliers`
- `GET /suppliers/:id`
- `PATCH /suppliers/:id`
- `GET /suppliers/:id/products` — products sourced from this supplier
- `GET /suppliers/:id/spend` — spend summary over time

---

### 4.4 Products Module
Product catalogue management including barcode lookup.

Endpoints:
- `GET /products` — supports search by name, SKU, barcode
- `POST /products`
- `GET /products/:id`
- `PATCH /products/:id`
- `GET /products/barcode/:barcode` — fast barcode lookup for POS and scanning
- `GET /products/:id/stock` — stock by location
- `GET /products/:id/history` — purchase, shipment, sales history

---

### 4.5 Purchasing Module
Records purchases and triggers inventory creation.

Endpoints:
- `GET /purchases`
- `POST /purchases`
- `GET /purchases/:id`
- `PATCH /purchases/:id`
- `POST /purchases/:id/confirm` — confirms purchase and increases UK inventory

Business logic in service:
- on confirm, create `inventory_movements` with type `purchase_in`
- update `inventory_balances` for the UK location
- create `fx_records` entry with event_type `purchase`

---

### 4.6 Inventory Module
Stock visibility, adjustments, and movement history.

Endpoints:
- `GET /inventory` — current balances by product and location
- `GET /inventory/movements` — movement log with filters
- `POST /inventory/adjustments` — manual adjustment with reason
- `GET /inventory/product/:id` — stock detail for one product

Business logic:
- all stock changes go through a shared `InventoryService.recordMovement()` method
- this method writes to `inventory_movements` and updates `inventory_balances` transactionally
- negative stock prevention enforced unless caller has `inventory.override_negative` permission

---

### 4.7 Shipments Module
Full shipment lifecycle from creation to dispatch.

Endpoints:
- `GET /shipments`
- `POST /shipments`
- `GET /shipments/:id`
- `PATCH /shipments/:id`
- `POST /shipments/:id/items` — add items to shipment
- `DELETE /shipments/:id/items/:itemId`
- `POST /shipments/:id/dispatch` — moves status to dispatched, moves stock to in-transit
- `POST /shipments/:id/costs` — add a cost entry
- `GET /shipments/:id/costs`
- `GET /shipments/:id/status-history`

---

### 4.8 Receiving Module
Goods receiving workflow in Ghana.

Endpoints:
- `GET /receiving` — list shipments awaiting receiving
- `POST /receiving` — create receiving record with line items
- `GET /receiving/:id`
- `PATCH /receiving/:id` — update partial receiving

Business logic:
- on submit, create inventory movements of type `receive` into the Ghana location
- record discrepancy between expected and received quantities
- update shipment status to `received`
- lock actual arrival date on shipment

---

### 4.9 Sales and POS Module
Point-of-sale transactions and sales history.

Endpoints:
- `GET /sales`
- `POST /sales` — create and complete a sale
- `GET /sales/:id`
- `POST /sales/:id/void` — void sale with reason
- `POST /sales/:id/refund` — refund items

Business logic:
- sale creation checks Ghana inventory is sufficient
- on complete, deduct stock via `InventoryService.recordMovement()` with type `sale_out`
- auto-generate receipt
- create `fx_records` entry with event_type `sale`
- write audit log

---

### 4.10 FX Module
Exchange rate event tracking and cash conversion records.

Endpoints:
- `GET /fx` — all FX events with filters by type and date
- `GET /fx/:id`
- `POST /fx/conversions` — record GHS to GBP conversion
- `GET /fx/conversions`
- `GET /fx/conversions/:id`
- `GET /fx/summary` — purchase / sale / conversion FX summary and gain-loss

---

### 4.11 Customers Module
Customer records linked to sales and invoices.

Endpoints:
- `GET /customers`
- `POST /customers`
- `GET /customers/:id`
- `PATCH /customers/:id`
- `GET /customers/:id/sales`
- `GET /customers/:id/invoices`

---

### 4.12 Invoices Module
Invoice generation and management.

Endpoints:
- `GET /invoices`
- `POST /invoices` — create manually or from sale
- `GET /invoices/:id`
- `PATCH /invoices/:id`
- `GET /invoices/:id/pdf` — stream or return PDF download URL
- `POST /invoices/:id/mark-paid`

PDF generation: use `pdfkit` or `puppeteer` to render invoice template server-side.

---

### 4.13 Receipts Module
POS receipt storage and retrieval.

Endpoints:
- `GET /receipts`
- `GET /receipts/:id`
- `GET /receipts/:id/pdf`

Receipts are auto-created when a sale is completed. They are not created manually.

---

### 4.14 Dashboard Module
Aggregated KPIs for the dashboard screen.

Endpoints:
- `GET /dashboard/summary` — top-level KPIs
- `GET /dashboard/revenue` — revenue over time
- `GET /dashboard/shipments` — shipment status summary
- `GET /dashboard/fx` — FX impact summary
- `GET /dashboard/top-products` — best and worst performing products
- `GET /dashboard/risks` — active risks and alerts for dashboard panel

All endpoints accept date range and location query params.

---

### 4.15 Reports Module
Detailed report generation with export support.

Endpoints:
- `GET /reports/inventory`
- `GET /reports/shipments`
- `GET /reports/shipping-costs`
- `GET /reports/sales`
- `GET /reports/profitability`
- `GET /reports/supplier-spend`
- `GET /reports/fx`
- `GET /reports/risks`

Each endpoint accepts query filters and an optional `format` param (`json`, `csv`, `xlsx`, `pdf`). CSV and XLSX generated via `exceljs`. PDF via `pdfkit` or `puppeteer`.

---

### 4.16 Alerts Module
System-generated and rule-based alert management.

Endpoints:
- `GET /alerts`
- `GET /alerts/:id`
- `POST /alerts/:id/acknowledge`
- `POST /alerts/:id/resolve`
- `POST /alerts/:id/dismiss`

Alert generation is handled by a scheduled job in `AlertsService` using `@nestjs/schedule`. Rules include low stock, shipment delay, FX loss threshold, cost spike, and expiry risk.

---

### 4.17 Risks and Opportunities Modules
Structured risk and opportunity detection.

Endpoints:
- `GET /risks`
- `GET /risks/:id`
- `PATCH /risks/:id/status`
- `GET /opportunities`
- `GET /opportunities/:id`
- `PATCH /opportunities/:id/status`

Detection jobs run on a schedule and write records to `risk_records` and `opportunity_records`.

---

### 4.18 AI Module
Natural language business insights using Claude API.

Endpoints:
- `POST /ai/chat` — sends a user question, returns a structured answer
- `GET /ai/history` — returns past AI interactions for the user

Implementation:
- use `@anthropic-ai/sdk` with Claude claude-sonnet-4-6 as default model
- before calling Claude, query relevant database tables based on question intent
- pass structured business data as context in the system prompt
- Claude must distinguish internal data answers from external trend answers
- response is stored in `ai_insight_logs`
- never expose raw SQL or sensitive internals to the model
- use tool use / function calling to let the model request specific data queries safely

---

### 4.19 Audit Module
Immutable action log for sensitive operations.

- not a REST module for clients
- `AuditService.log()` is called internally by other services on create, update, delete, void, refund, and stock adjustment operations
- writes to `audit_logs` table with before and after JSON snapshots
- admin users can query logs via `GET /audit-logs` with filters

---

## 5. Cross-Cutting Concerns

### 5.1 Authentication Guard
`JwtAuthGuard` is applied globally in `AppModule`. Routes that do not require auth (login, forgot-password, reset-password) are decorated with `@Public()` which the guard checks before validating the token.

The Passport JWT strategy extracts the Bearer token from the `Authorization` header, verifies the signature using `JWT_SECRET` from AWS Secrets Manager, and attaches the decoded payload to `request.user`.

React Native sends the access token on every request:
```
Authorization: Bearer <access_token>
```

When the app receives a 401, an Axios response interceptor automatically calls `POST /auth/refresh` with the refresh token from `expo-secure-store`, stores the new tokens, and retries the original request transparently.

### 5.2 Roles Guard
`RolesGuard` reads `@Roles(...)` metadata from the handler and controller, then checks `request.user.roles`. Applied globally after `JwtAuthGuard`.

### 5.3 Permissions Guard
`PermissionsGuard` reads `@RequirePermission(...)` metadata. Permissions for the user's roles are loaded from the DB and cached in-process (TTL 5 min). If a permission is not in the cache, it falls back to a DB query. Applied as a route-level guard only where needed.

### 5.3 Global Validation Pipe
```typescript
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
```
All DTOs validated and transformed automatically.

### 5.4 Global Exception Filter
Custom `HttpExceptionFilter` returns consistent error shape:
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": ["field is required"]
}
```

### 5.5 Response Interceptor
Wraps successful responses in a consistent envelope:
```json
{
  "data": { ... },
  "meta": { "timestamp": "..." }
}
```

### 5.6 Database Transactions
Use Prisma's `$transaction()` for any operation that touches multiple tables, particularly:
- purchase confirmation (purchase + inventory movement + FX record)
- sale completion (sale + sale items + payments + inventory movements + receipt + FX record)
- receiving (receiving record + inventory movements + shipment status update)

### 5.7 Pagination
All list endpoints support `page` and `limit` query params. Responses include:
```json
{
  "data": [...],
  "meta": { "page": 1, "limit": 20, "total": 143 }
}
```

---

## 6. Environment Configuration

Sensitive secrets (JWT_SECRET, JWT_REFRESH_SECRET, ANTHROPIC_API_KEY, database password) are stored in AWS Secrets Manager and loaded at container startup. Non-sensitive config is passed as ECS task definition environment variables.

```env
# Non-sensitive — set in ECS task definition
APP_PORT=3000
NODE_ENV=production
AWS_REGION=eu-west-1
DATABASE_URL=postgresql://user:password@rds-host:5432/dbname
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
STORAGE_BUCKET=export-manager-assets
SES_FROM_EMAIL=noreply@yourdomain.com

# Sensitive — loaded from AWS Secrets Manager at startup
# JWT_SECRET
# JWT_REFRESH_SECRET
# ANTHROPIC_API_KEY
# (DATABASE_URL can also be pulled from Secrets Manager if preferred)
```

The NestJS app loads secrets from Secrets Manager during `AppModule` initialization using `@aws-sdk/client-secrets-manager` before the HTTP server starts. The container's IAM role (ECS task role) grants it `secretsmanager:GetSecretValue` access — no long-lived credentials needed in the environment.

---

## 7. Database

Use Prisma as the ORM against PostgreSQL. The schema maps directly to the tables defined in `grocery_export_database_schema.md`.

Key Prisma setup notes:
- enable `previewFeatures = ["postgresqlExtensions"]` if using UUID generation via `gen_random_uuid()`
- use `@default(uuid())` or `@default(cuid())` for primary keys
- define `@@index` blocks matching the indexes listed in the schema document
- use Prisma migrations for all schema changes — never edit the database directly

---

## 8. Deployment (AWS)

### Infrastructure
| Component | AWS Service | Notes |
|---|---|---|
| Container runtime | ECS Fargate | serverless containers, no EC2 to manage |
| Container registry | ECR | stores Docker images |
| Database | RDS PostgreSQL | Multi-AZ for production |
| File storage | S3 | invoices, receipts, product images |
| Email | SES | password reset and alert emails |
| Secrets | Secrets Manager | JWT secrets, API keys |
| Load balancer | ALB (Application Load Balancer) | HTTPS termination, routes to ECS service |
| DNS / TLS | Route 53 + ACM | custom domain and free TLS cert |
| Logs | CloudWatch Logs | container stdout/stderr |

### Docker setup
The NestJS app ships as a multi-stage Dockerfile:
```
Stage 1 (build): node:lts-alpine → install deps, compile TypeScript
Stage 2 (run):   node:lts-alpine → copy dist + node_modules (prod only), run node dist/main
```

The image is pushed to ECR and referenced in the ECS task definition.

### Networking
- ECS tasks run in private subnets
- ALB in public subnet terminates HTTPS (port 443) and forwards to ECS on port 3000
- RDS in a separate private subnet, only reachable from ECS security group
- No public IP on ECS tasks

### IAM
- ECS task role (attached to containers) grants:
  - `secretsmanager:GetSecretValue` on the app's secrets
  - `s3:GetObject`, `s3:PutObject` on the storage bucket
  - `ses:SendEmail` for password reset
  - `ecr:GetAuthorizationToken` is on the ECS execution role, not the task role

### CI/CD
GitHub Actions pipeline:
1. `npm run lint` and `npm run test`
2. Build Docker image and push to ECR
3. Update ECS service to deploy the new task definition revision
4. Run Prisma migrations as a one-off ECS task before the new service version goes live

---

## 9. API Versioning

All routes prefixed with `/api/v1`. When breaking changes are needed, introduce `/api/v2` routes rather than modifying existing ones. The frontend and backend are versioned together in MVP but this allows independent evolution later.

---

## 10. MVP Build Order

Implement modules in this order to unblock the frontend progressively:

1. Auth + Users + Roles
2. Suppliers
3. Products + Barcodes
4. Purchasing + Inventory (movement engine)
5. Shipments + Shipment Costs
6. Receiving
7. Sales + POS
8. FX + Cash Conversions
9. Invoices + Receipts
10. Dashboard
11. Reports
12. Alerts + Risks + Opportunities
13. AI Module
14. Audit Logs
