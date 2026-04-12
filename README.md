# Sikasem — Export Business Manager

A full-stack monorepo for managing a UK→Ghana grocery export business. Covers the complete operational cycle: supplier management, purchasing, inventory, shipments, goods receiving, point-of-sale, invoicing, FX conversion, and reporting.

## Stack

| Layer | Technology |
|---|---|
| Backend API | NestJS (TypeScript), Prisma ORM, PostgreSQL |
| Mobile app | Expo React Native (TypeScript), Expo Router, Zustand |
| Auth | JWT + RBAC (roles) + fine-grained permissions |

## Repository layout

```
├── backend/      NestJS REST API (port 3000)
├── mobile/       Expo React Native app
└── requirements/ PRD, database schema, implementation plans
```

## Getting started

### Prerequisites

- Node.js 20+
- Docker (for local PostgreSQL)

### Backend

```bash
docker compose up postgres

cd backend
cp .env.example .env          # set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/exportmanager
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev             # http://localhost:3000/api/v1
```

Swagger UI: `http://localhost:3000/api/v1/docs`

### Mobile

```bash
cd mobile
cp .env.example .env          # set EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
npm install
npm start
```

## Implementation progress

| Step | Feature | Status |
|---|---|---|
| STEP-00 | Project scaffolding | ✅ Done |
| STEP-01 | Auth & RBAC | ✅ Done |
| STEP-02 | Suppliers & products | ✅ Done |
| STEP-03 | Purchasing & inventory engine | ✅ Done |
| STEP-04 | Shipments | ✅ Done |
| STEP-04b | Mobile navigation scaffold | ✅ Done |
| STEP-05 | Goods receiving (Ghana) | ✅ Done |
| STEP-06 | POS & sales | 🔜 Pending |
| STEP-07 | FX & cash conversions | 🔜 Pending |
| STEP-08 | Invoices | 🔜 Pending |
| STEP-09 | Dashboard | 🔜 Pending |
| STEP-10 | Reports | 🔜 Pending |
| STEP-11 | Alerts, risks & opportunities | 🔜 Pending |
| STEP-12 | AI assistant | 🔜 Pending |
| STEP-13 | Settings & admin | 🔜 Pending |

## Key architecture notes

- All stock changes go through `InventoryService.recordMovement()` — never write directly to inventory tables
- All routes are JWT-protected by default; use `@Public()` to opt out
- Responses are wrapped: `{ data: <payload>, meta: { timestamp } }` — mobile clients unwrap via `response.data.data`
- See `CLAUDE.md` for full conventions and module patterns
