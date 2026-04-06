# Implementation Plan Index
## Grocery Export Business Manager

Each document below covers one implementation session. Work through them in order — each step builds on the previous ones.

---

## Steps

| Step | Document | What Gets Built | Key Dependency |
|---|---|---|---|
| 00 | [STEP-00-project-scaffolding.md](./STEP-00-project-scaffolding.md) | Monorepo, NestJS skeleton, Expo skeleton, full Prisma schema, Docker, CI/CD | — |
| 01 | [STEP-01-auth-and-rbac.md](./STEP-01-auth-and-rbac.md) | JWT auth, refresh rotation, password reset, roles/permissions guards, login screens | STEP-00 |
| 02 | [STEP-02-suppliers-and-products.md](./STEP-02-suppliers-and-products.md) | Supplier CRUD, product catalogue, barcode scanning, AuditService | STEP-00, 01 |
| 03 | [STEP-03-purchasing-and-inventory.md](./STEP-03-purchasing-and-inventory.md) | Purchase orders, **inventory movement engine** (central), FX at purchase, inventory screens | STEP-00–02 |
| 04 | [STEP-04-shipments.md](./STEP-04-shipments.md) | Shipment lifecycle, stock allocation and dispatch, shipping costs, status history | STEP-00–03 |
| 05 | [STEP-05-receiving.md](./STEP-05-receiving.md) | Ghana receiving workflow, discrepancy tracking, transit time locking | STEP-00–01, 03–04 |
| 06 | [STEP-06-pos-and-sales.md](./STEP-06-pos-and-sales.md) | POS checkout, cart, payments, FX at sale, receipt PDF, void, sales history, customers | STEP-00–03, 05 |
| 07 | [STEP-07-fx-and-cash-conversions.md](./STEP-07-fx-and-cash-conversions.md) | FX overview, GHS→GBP conversion, gain/loss calculations | STEP-00–01, 03, 06 |
| 08 | [STEP-08-invoices.md](./STEP-08-invoices.md) | Invoice generation, PDF rendering (PdfService), S3 storage, invoice lifecycle | STEP-00–01, 06 |
| 09 | [STEP-09-dashboard.md](./STEP-09-dashboard.md) | KPI aggregations, dashboard screen, charts, drilldowns | STEP-00–01, 03–07 |
| 10 | [STEP-10-reports.md](./STEP-10-reports.md) | All 8 report types, CSV/XLSX/PDF export | STEP-00–01, 03–04, 06–08 |
| 11 | [STEP-11-alerts-risks-opportunities.md](./STEP-11-alerts-risks-opportunities.md) | Rule-based detection engine, scheduled jobs, alerts/risks/opportunities screens | STEP-00–01, 03–04, 06–07, 09 |
| 12 | [STEP-12-ai-assistant.md](./STEP-12-ai-assistant.md) | Claude AI integration, tool-use data queries, chat interface | STEP-00–01, 03–04, 06–07, 09, 11 |
| 13 | [STEP-13-settings-admin-navigation.md](./STEP-13-settings-admin-navigation.md) | Navigation shell, role-filtered tabs, settings, user management, audit log viewer | All prior steps |

---

## Critical Path

The most important sequence to get right early:

```
STEP-00 (scaffold)
  → STEP-01 (auth)
    → STEP-02 (products/suppliers)
      → STEP-03 (inventory engine)  ← everything that moves stock depends on this
        → STEP-04 (shipments)
          → STEP-05 (receiving)
            → STEP-06 (POS/sales)
```

STEP-03's `InventoryService.recordMovement()` is the single most critical method in the codebase. Get it right with thorough tests before building anything that depends on it.

---

## Total Scope

- **14 implementation sessions**
- **~236 files** created across backend and mobile
- **Backend**: 19 NestJS modules, 37 Prisma tables, REST API under `/api/v1`
- **Frontend**: 32 screens, Expo Router file-based navigation, Zustand state management
- **Infrastructure**: Docker on Railway (backend + PostgreSQL), S3 (file storage), SES (email)

---

## How to Use These Documents

Start a new Claude Code session for each step. Open the step document and say:

> "Implement STEP-XX per the plan in `requirements/implementation-plans/STEP-XX-*.md`. Reference the schema in `requirements/grocery_export_database_schema.md` and the backend spec in `requirements/grocery_export_backend_spec.md` as needed."

Each document contains:
- Goal and scope
- Exact file paths to create
- Key decisions already made (do not re-debate these)
- Implementation steps in order
- Acceptance criteria to verify before moving on
