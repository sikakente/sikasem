# Navigation Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the implementation plans so that a persistent bottom tab bar is added in STEP-04b (covering all features built in STEP-00–04), and each subsequent step adds its own tab, making every feature immediately visible and testable after its step completes.

**Architecture:** A new `STEP-04b-navigation-scaffold.md` plan file is created. STEP-05 through STEP-12 each get a `## Navigation Update` section. STEP-13 is updated to describe a polish pass (role filtering, overflow) rather than building the nav from scratch.

**Tech Stack:** Expo Router v6 `<Tabs>` layout, `@expo/vector-icons` (Ionicons — bundled with Expo SDK 54, no install needed), TypeScript.

---

## Files Modified

| File | Change |
|---|---|
| `requirements/implementation-plans/STEP-04b-navigation-scaffold.md` | Created |
| `requirements/implementation-plans/STEP-05-receiving.md` | Add `## Navigation Update` before Acceptance Criteria |
| `requirements/implementation-plans/STEP-06-pos-and-sales.md` | Add `## Navigation Update` before Acceptance Criteria |
| `requirements/implementation-plans/STEP-07-fx-and-cash-conversions.md` | Add `## Navigation Update` before Acceptance Criteria |
| `requirements/implementation-plans/STEP-08-invoices.md` | Add `## Navigation Update` before Acceptance Criteria |
| `requirements/implementation-plans/STEP-09-dashboard.md` | Add `## Navigation Update` before Acceptance Criteria |
| `requirements/implementation-plans/STEP-10-reports.md` | Add `## Navigation Update` before Acceptance Criteria |
| `requirements/implementation-plans/STEP-11-alerts-risks-opportunities.md` | Add `## Navigation Update` before Acceptance Criteria |
| `requirements/implementation-plans/STEP-12-ai-assistant.md` | Add `## Navigation Update` before Acceptance Criteria |
| `requirements/implementation-plans/STEP-13-settings-admin-navigation.md` | Update Goal paragraph + Implementation Step 9 |
| `requirements/implementation-plans/INDEX.md` | Add STEP-04b row |

---

### Task 1: Create STEP-04b-navigation-scaffold.md

**Files:**
- Create: `requirements/implementation-plans/STEP-04b-navigation-scaffold.md`

- [ ] **Step 1: Create the file with the following exact content**

```markdown
# STEP-04b: Navigation Scaffold — Bottom Tab Bar

## Goal
Replace the bare `<Stack />` app layout with a persistent bottom tab bar covering every feature built so far (STEP-00–04). After this step all six sections are reachable by tapping a tab on any screen. Subsequent steps add their own tab as they build their screens.

## Prerequisites
- STEP-00, STEP-01, STEP-02, STEP-03, STEP-04 (all screens must already exist)

---

## Key Decisions

### Icon library
`@expo/vector-icons` is bundled with Expo SDK 54 — no additional install required. Use `Ionicons` throughout for consistency. STEP-13 may swap to a custom icon set.

### Tab overflow strategy
During development there will be more tabs than comfortably fit on screen. This is intentional — the scrollable tab bar lets every feature stay reachable. STEP-13 collapses the overflow into a "More" menu and adds role filtering.

### `headerShown: false`
All `<Tabs.Screen>` entries set `headerShown: false`. Each feature screen manages its own header via a nested `<Stack>` where needed.

### Stack screens hidden from tab bar
Sub-routes (`[id].tsx`, `new.tsx`, etc.) must be listed as `<Tabs.Screen href={null}>` to hide them from the tab bar. Only the index of each feature appears as a tab.

---

## Frontend File to Modify

### `mobile/src/app/(app)/_layout.tsx`

Replace the current content entirely:

```tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color, size }: { name: IconName; color: string; size: number }) {
  return <Ionicons name={name} color={color} size={size} />;
}

export default function AppLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="suppliers"
        options={{
          title: 'Suppliers',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="people-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="cube-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Inventory',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="layers-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="purchasing"
        options={{
          title: 'Purchasing',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="cart-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="shipments"
        options={{
          title: 'Shipments',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="airplane-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
```

---

## Implementation Steps

1. Open `mobile/src/app/(app)/_layout.tsx` and replace the entire file with the code above
2. Run `npm start` in `mobile/` and open on iOS/Android simulator
3. Verify the bottom tab bar shows 6 tabs: Home · Suppliers · Products · Inventory · Purchasing · Shipments
4. Tap each tab and confirm navigation to the correct list screen
5. Navigate into a detail screen (e.g. a product) and confirm the tab bar remains visible at the bottom
6. Run `cd mobile && npm run lint` — fix any reported errors
7. Commit: `git add mobile/src/app/(app)/_layout.tsx && git commit -m "feat(mobile): add bottom tab bar for STEP-00-04 features"`

## Acceptance Criteria
- Bottom tab bar shows 6 tabs: Home · Suppliers · Products · Inventory · Purchasing · Shipments
- Each tab tap navigates to the correct list screen
- Tab bar remains visible while navigating into detail screens
- `npm run lint` passes with no errors
```

- [ ] **Step 2: Verify the file was written**

Open `requirements/implementation-plans/STEP-04b-navigation-scaffold.md` and confirm it exists with the content above.

- [ ] **Step 3: Commit**

```bash
cd /path/to/repo
git add requirements/implementation-plans/STEP-04b-navigation-scaffold.md
git commit -m "docs: add STEP-04b navigation scaffold plan"
```

---

### Task 2: Add Navigation Update to STEP-05 (Receiving)

**Files:**
- Modify: `requirements/implementation-plans/STEP-05-receiving.md` — insert before line 165 (`## Acceptance Criteria`)

- [ ] **Step 1: Insert the following block before `## Acceptance Criteria` in STEP-05**

Insert this text immediately before the `## Acceptance Criteria` heading (currently at line 165):

```markdown
## Navigation Update

Update `mobile/src/app/(app)/_layout.tsx` — add the Receiving tab after the Shipments entry:

```tsx
<Tabs.Screen
  name="receiving"
  options={{
    title: 'Receiving',
    tabBarIcon: ({ color, size }) => (
      <TabIcon name="download-outline" color={color} size={size} />
    ),
  }}
/>
```

After this step the tab bar reads: **Home · Suppliers · Products · Inventory · Purchasing · Shipments · Receiving**

```

- [ ] **Step 2: Add acceptance criterion**

Append this line to the existing `## Acceptance Criteria` list in STEP-05:

```
- Tapping the Receiving tab from any other tab navigates to the Receiving Queue screen
```

- [ ] **Step 3: Commit**

```bash
git add requirements/implementation-plans/STEP-05-receiving.md
git commit -m "docs: add navigation update section to STEP-05"
```

---

### Task 3: Add Navigation Update to STEP-06 (POS and Sales)

**Files:**
- Modify: `requirements/implementation-plans/STEP-06-pos-and-sales.md` — insert before line 295 (`## Acceptance Criteria`)

- [ ] **Step 1: Insert the following block before `## Acceptance Criteria` in STEP-06**

```markdown
## Navigation Update

Update `mobile/src/app/(app)/_layout.tsx` — add POS and Sales tabs after the Receiving entry:

```tsx
<Tabs.Screen
  name="pos"
  options={{
    title: 'POS',
    tabBarIcon: ({ color, size }) => (
      <TabIcon name="storefront-outline" color={color} size={size} />
    ),
  }}
/>
<Tabs.Screen
  name="sales"
  options={{
    title: 'Sales',
    tabBarIcon: ({ color, size }) => (
      <TabIcon name="receipt-outline" color={color} size={size} />
    ),
  }}
/>
```

After this step the tab bar reads: **Home · Suppliers · Products · Inventory · Purchasing · Shipments · Receiving · POS · Sales**

```

- [ ] **Step 2: Add acceptance criterion**

Append to the `## Acceptance Criteria` list in STEP-06:

```
- Tapping the POS tab from any screen navigates to the POS cart screen
- Tapping the Sales tab navigates to the Sales History list screen
```

- [ ] **Step 3: Commit**

```bash
git add requirements/implementation-plans/STEP-06-pos-and-sales.md
git commit -m "docs: add navigation update section to STEP-06"
```

---

### Task 4: Add Navigation Update to STEP-07 (FX)

**Files:**
- Modify: `requirements/implementation-plans/STEP-07-fx-and-cash-conversions.md` — insert before line 171 (`## Acceptance Criteria`)

- [ ] **Step 1: Insert the following block before `## Acceptance Criteria` in STEP-07**

```markdown
## Navigation Update

Update `mobile/src/app/(app)/_layout.tsx` — add the FX tab after the Sales entry:

```tsx
<Tabs.Screen
  name="fx"
  options={{
    title: 'FX',
    tabBarIcon: ({ color, size }) => (
      <TabIcon name="cash-outline" color={color} size={size} />
    ),
  }}
/>
```

After this step the tab bar reads: **Home · Suppliers · Products · Inventory · Purchasing · Shipments · Receiving · POS · Sales · FX**

```

- [ ] **Step 2: Add acceptance criterion**

Append to the `## Acceptance Criteria` list in STEP-07:

```
- Tapping the FX tab navigates to the FX Overview screen
```

- [ ] **Step 3: Commit**

```bash
git add requirements/implementation-plans/STEP-07-fx-and-cash-conversions.md
git commit -m "docs: add navigation update section to STEP-07"
```

---

### Task 5: Add Navigation Update to STEP-08 (Invoices)

**Files:**
- Modify: `requirements/implementation-plans/STEP-08-invoices.md` — insert before line 195 (`## Acceptance Criteria`)

- [ ] **Step 1: Insert the following block before `## Acceptance Criteria` in STEP-08**

```markdown
## Navigation Update

Update `mobile/src/app/(app)/_layout.tsx` — add the Invoices tab after the FX entry:

```tsx
<Tabs.Screen
  name="invoices"
  options={{
    title: 'Invoices',
    tabBarIcon: ({ color, size }) => (
      <TabIcon name="document-text-outline" color={color} size={size} />
    ),
  }}
/>
```

After this step the tab bar reads: **Home · Suppliers · Products · Inventory · Purchasing · Shipments · Receiving · POS · Sales · FX · Invoices**

```

- [ ] **Step 2: Add acceptance criterion**

Append to the `## Acceptance Criteria` list in STEP-08:

```
- Tapping the Invoices tab navigates to the Invoice List screen
```

- [ ] **Step 3: Commit**

```bash
git add requirements/implementation-plans/STEP-08-invoices.md
git commit -m "docs: add navigation update section to STEP-08"
```

---

### Task 6: Add Navigation Update to STEP-09 (Dashboard)

**Files:**
- Modify: `requirements/implementation-plans/STEP-09-dashboard.md` — insert before line 235 (`## Acceptance Criteria`)

- [ ] **Step 1: Insert the following block before `## Acceptance Criteria` in STEP-09**

```markdown
## Navigation Update

No new tab is added. The existing `index` tab (labelled "Home" since STEP-04b) is upgraded to show the real Dashboard built in this step.

Update `mobile/src/app/(app)/_layout.tsx` — change the `index` tab title and icon to reflect it is now a real Dashboard:

```tsx
<Tabs.Screen
  name="index"
  options={{
    title: 'Dashboard',
    tabBarIcon: ({ color, size }) => (
      <TabIcon name="grid-outline" color={color} size={size} />
    ),
  }}
/>
```

After this step the tab bar reads: **Dashboard · Suppliers · Products · Inventory · Purchasing · Shipments · Receiving · POS · Sales · FX · Invoices**

```

- [ ] **Step 2: Add acceptance criterion**

Append to the `## Acceptance Criteria` list in STEP-09:

```
- The Dashboard tab label and icon have been updated from "Home" to "Dashboard" with a grid icon
```

- [ ] **Step 3: Commit**

```bash
git add requirements/implementation-plans/STEP-09-dashboard.md
git commit -m "docs: add navigation update section to STEP-09"
```

---

### Task 7: Add Navigation Update to STEP-10 (Reports)

**Files:**
- Modify: `requirements/implementation-plans/STEP-10-reports.md` — insert before line 233 (`## Acceptance Criteria`)

- [ ] **Step 1: Insert the following block before `## Acceptance Criteria` in STEP-10**

```markdown
## Navigation Update

Update `mobile/src/app/(app)/_layout.tsx` — add the Reports tab after the Invoices entry:

```tsx
<Tabs.Screen
  name="reports"
  options={{
    title: 'Reports',
    tabBarIcon: ({ color, size }) => (
      <TabIcon name="bar-chart-outline" color={color} size={size} />
    ),
  }}
/>
```

After this step the tab bar reads: **Dashboard · Suppliers · Products · Inventory · Purchasing · Shipments · Receiving · POS · Sales · FX · Invoices · Reports**

```

- [ ] **Step 2: Add acceptance criterion**

Append to the `## Acceptance Criteria` list in STEP-10:

```
- Tapping the Reports tab navigates to the Reports Home screen
```

- [ ] **Step 3: Commit**

```bash
git add requirements/implementation-plans/STEP-10-reports.md
git commit -m "docs: add navigation update section to STEP-10"
```

---

### Task 8: Add Navigation Update to STEP-11 (Alerts)

**Files:**
- Modify: `requirements/implementation-plans/STEP-11-alerts-risks-opportunities.md` — insert before line 233 (`## Acceptance Criteria`)

- [ ] **Step 1: Insert the following block before `## Acceptance Criteria` in STEP-11**

```markdown
## Navigation Update

Update `mobile/src/app/(app)/_layout.tsx` — add the Alerts tab after the Reports entry:

```tsx
<Tabs.Screen
  name="alerts"
  options={{
    title: 'Alerts',
    tabBarIcon: ({ color, size }) => (
      <TabIcon name="notifications-outline" color={color} size={size} />
    ),
  }}
/>
```

After this step the tab bar reads: **Dashboard · Suppliers · Products · Inventory · Purchasing · Shipments · Receiving · POS · Sales · FX · Invoices · Reports · Alerts**

```

- [ ] **Step 2: Add acceptance criterion**

Append to the `## Acceptance Criteria` list in STEP-11:

```
- Tapping the Alerts tab navigates to the Alerts List screen
```

- [ ] **Step 3: Commit**

```bash
git add requirements/implementation-plans/STEP-11-alerts-risks-opportunities.md
git commit -m "docs: add navigation update section to STEP-11"
```

---

### Task 9: Add Navigation Update to STEP-12 (AI Assistant)

**Files:**
- Modify: `requirements/implementation-plans/STEP-12-ai-assistant.md` — insert before line 315 (`## Acceptance Criteria`)

- [ ] **Step 1: Insert the following block before `## Acceptance Criteria` in STEP-12**

```markdown
## Navigation Update

Update `mobile/src/app/(app)/_layout.tsx` — add the AI tab after the Alerts entry:

```tsx
<Tabs.Screen
  name="ai"
  options={{
    title: 'AI',
    tabBarIcon: ({ color, size }) => (
      <TabIcon name="chatbubble-ellipses-outline" color={color} size={size} />
    ),
  }}
/>
```

After this step the tab bar reads: **Dashboard · Suppliers · Products · Inventory · Purchasing · Shipments · Receiving · POS · Sales · FX · Invoices · Reports · Alerts · AI**

```

- [ ] **Step 2: Add acceptance criterion**

Append to the `## Acceptance Criteria` list in STEP-12:

```
- Tapping the AI tab navigates to the AI Chat screen
```

- [ ] **Step 3: Commit**

```bash
git add requirements/implementation-plans/STEP-12-ai-assistant.md
git commit -m "docs: add navigation update section to STEP-12"
```

---

### Task 10: Update STEP-13 (Settings and Navigation Polish)

**Files:**
- Modify: `requirements/implementation-plans/STEP-13-settings-admin-navigation.md`

Two changes are needed:

**Change 1 — Goal paragraph:** The tab bar already exists from STEP-04b. STEP-13 polishes it.

**Change 2 — Implementation Step 9:** Replace "Build `(app)/_layout.tsx` with tab bar and role-based routing" with an upgrade instruction.

- [ ] **Step 1: Replace the Goal paragraph**

Find this text:
```
Complete the application: persistent navigation shell with role-based tab visibility, Settings screens, User Management screens, Audit Log viewer, and Business Profile configuration. After this step the app is a fully navigable, production-ready product with every screen connected.
```

Replace with:
```
Complete the application: upgrade the existing navigation shell (added in STEP-04b) with role-based tab visibility, add Settings screens, User Management screens, Audit Log viewer, and Business Profile configuration. After this step the app is a fully navigable, production-ready product with every screen role-filtered and connected.
```

- [ ] **Step 2: Replace Implementation Step 9**

Find this text in the `## Implementation Steps` list:
```
9. Build `(app)/_layout.tsx` with tab bar and role-based routing
```

Replace with:
```
9. Upgrade `(app)/_layout.tsx` — wrap each `<Tabs.Screen>` with role-based visibility using the `usePermissions` hook; add the Settings tab; collapse overflow tabs into the "More" menu
```

- [ ] **Step 3: Commit**

```bash
git add requirements/implementation-plans/STEP-13-settings-admin-navigation.md
git commit -m "docs: update STEP-13 to reflect tab bar polish-only scope"
```

---

### Task 11: Update INDEX.md

**Files:**
- Modify: `requirements/implementation-plans/INDEX.md`

- [ ] **Step 1: Insert STEP-04b row into the table**

Find this row in the Steps table:
```
| 04 | [STEP-04-shipments.md](./STEP-04-shipments.md) | Shipment lifecycle, stock allocation and dispatch, shipping costs, status history | STEP-00–03 |
```

Add this row immediately after it:
```
| 04b | [STEP-04b-navigation-scaffold.md](./STEP-04b-navigation-scaffold.md) | Bottom tab bar covering all STEP-00–04 features; grows with each subsequent step | STEP-00–04 |
```

- [ ] **Step 2: Update the Total Scope note**

Find:
```
- **14 implementation sessions**
```

Replace with:
```
- **15 implementation sessions**
```

- [ ] **Step 3: Commit**

```bash
git add requirements/implementation-plans/INDEX.md
git commit -m "docs: add STEP-04b to implementation plan index"
```
