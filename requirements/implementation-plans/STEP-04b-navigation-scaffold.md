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
