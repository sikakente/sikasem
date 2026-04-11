# Navigation Scaffold Design
**Date:** 2026-04-11
**Status:** Approved

## Problem

The app's `(app)/_layout.tsx` is a bare `<Stack />`. All feature screens exist (STEP-00–04 complete) but are unreachable without manually typing routes. The full navigation shell is deferred to STEP-13, leaving no way to see or test features as each step is completed.

## Goal

Add a persistent bottom tab bar that grows with each implementation step, so every completed feature is immediately visible and testable. STEP-13 becomes a polish pass (role filtering, overflow, settings) rather than building nav from scratch.

## Solution

### New step: STEP-04b-navigation-scaffold

Inserted between STEP-04 (done) and STEP-05 (next). This step:

1. Replaces `mobile/src/app/(app)/_layout.tsx` bare `<Stack />` with a `<Tabs>` layout from `expo-router`
2. Installs icon library (`@expo/vector-icons` — already in Expo, or `lucide-react-native` if preferred)
3. Adds a `TabBarIcon` helper component
4. Wires tabs for all 6 already-built features:
   - **Home** → `(app)/index.tsx`
   - **Suppliers** → `(app)/suppliers/index.tsx`
   - **Products** → `(app)/products/index.tsx`
   - **Inventory** → `(app)/inventory/index.tsx`
   - **Purchasing** → `(app)/purchasing/index.tsx`
   - **Shipments** → `(app)/shipments/index.tsx`
5. Updates `INDEX.md` to include STEP-04b

### Tab bar growth per step

| After Step | Tab bar |
|---|---|
| STEP-04b | Home · Suppliers · Products · Inventory · Purchasing · Shipments |
| STEP-05 | + Receiving |
| STEP-06 | + POS · Sales |
| STEP-07 | + FX |
| STEP-08 | + Invoices |
| STEP-09 | Home → real Dashboard |
| STEP-10 | + Reports |
| STEP-11 | + Alerts |
| STEP-12 | + AI |
| STEP-13 | Polish: "More" overflow, role filtering, settings, final icons |

### Navigation Update section (added to STEP-05–12)

Each step gets a `## Navigation Update` section before Acceptance Criteria:

```
## Navigation Update

Update `mobile/src/app/(app)/_layout.tsx`:
- Add `<Tabs.Screen name="<route>" options={{ title: '<Label>', tabBarIcon: ... }} />`
- After this step the tab bar reads: <previous tabs> · <new tab>

Acceptance criterion:
- Tapping the <Feature> tab from any other tab navigates to the correct list screen
```

### STEP-13 changes

- Note updated: tab bar already exists from STEP-04b; this step polishes it
- Work shifts from "build nav" to: role-filtered tab visibility, "More" overflow menu, settings tab, final icon set, deep link handling

## Files Changed by This Design

| File | Change |
|---|---|
| `requirements/implementation-plans/STEP-04b-navigation-scaffold.md` | Created (new step) |
| `requirements/implementation-plans/STEP-05-receiving.md` | Add Navigation Update section |
| `requirements/implementation-plans/STEP-06-pos-and-sales.md` | Add Navigation Update section |
| `requirements/implementation-plans/STEP-07-fx-and-cash-conversions.md` | Add Navigation Update section |
| `requirements/implementation-plans/STEP-08-invoices.md` | Add Navigation Update section |
| `requirements/implementation-plans/STEP-09-dashboard.md` | Add Navigation Update section (upgrade Home tab) |
| `requirements/implementation-plans/STEP-10-reports.md` | Add Navigation Update section |
| `requirements/implementation-plans/STEP-11-alerts-risks-opportunities.md` | Add Navigation Update section |
| `requirements/implementation-plans/STEP-12-ai-assistant.md` | Add Navigation Update section |
| `requirements/implementation-plans/STEP-13-settings-admin-navigation.md` | Update to reflect polish-only scope |
| `requirements/implementation-plans/INDEX.md` | Add STEP-04b row |

## Acceptance Criteria

- `STEP-04b` can be run as a standalone session and produces a working tab bar covering all STEP-00–04 features
- Each subsequent step adds its tab(s) with no rework of previous tabs
- STEP-13 does not need to rebuild `_layout.tsx` from scratch
- Bottom tab bar is visible on both iOS and Android simulators after STEP-04b
