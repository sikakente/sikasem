# Home Screen Stub Design

**Date:** 2026-04-11
**Status:** Approved

## Goal

Replace the "Dashboard — coming in STEP-09" placeholder in `mobile/src/app/(app)/index.tsx` with a functional, intentional-looking home screen that provides navigation access to all 5 feature sections until the real dashboard is built in STEP-09.

## Layout

Single scrollable screen, top to bottom:

1. **Branded header card** — blue gradient (`#2563eb` → `#1d4ed8`), "Export Manager" as the title, "Full dashboard coming in a future update" as a subtitle. White text.

2. **Section list** — 5 tappable rows in a white card, one per feature:
   - Suppliers (🏭)
   - Products (📦)
   - Inventory (🗂️)
   - Purchasing (🛒)
   - Shipments (✈️)

   Each row: emoji icon + section name on the left, chevron (`›`) on the right. Tapping navigates to the route.

## Navigation

Uses `useRouter()` from `expo-router`. Each row calls `router.push('/suppliers')`, `router.push('/products')`, etc. Expo Router resolves these to the correct tab screens within the `(app)` group.

## Styling

Matches existing app conventions:
- Background: `#f9fafb`
- Card background: `#fff` with subtle shadow
- Primary text: `#111827`
- Secondary text: `#6b7280`
- Border/separator: `#f3f4f6`
- Border radius: 12px cards, 10px rows

## No API Calls

This is a static screen. No loading states, no error handling, no data fetching.

## File to Modify

`mobile/src/app/(app)/index.tsx` — replace entirely.
