# Home Screen Stub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "Dashboard — coming in STEP-09" placeholder with a branded home screen showing a blue gradient header and 5 tappable section rows.

**Architecture:** Single static screen — no API calls, no state management. A blue gradient header card followed by a list of 5 tappable rows (Suppliers, Products, Inventory, Purchasing, Shipments), each navigating to its route via `useRouter`. Styled to match existing app conventions.

**Tech Stack:** React Native (View, Text, TouchableOpacity, StyleSheet, ScrollView), expo-router (`useRouter`)

---

### Task 1: Replace home screen with branded stub

**Files:**
- Modify: `mobile/src/app/(app)/index.tsx`

This screen has no unit-testable logic (pure static navigation UI), so verification is done via lint + manual smoke test on simulator.

- [ ] **Step 1: Replace the file contents**

  Open `mobile/src/app/(app)/index.tsx` and replace the entire file with:

  ```tsx
  import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
  import { useRouter } from 'expo-router';

  const SECTIONS = [
    { label: 'Suppliers', icon: '🏭', route: '/suppliers' },
    { label: 'Products', icon: '📦', route: '/products' },
    { label: 'Inventory', icon: '🗂️', route: '/inventory' },
    { label: 'Purchasing', icon: '🛒', route: '/purchasing' },
    { label: 'Shipments', icon: '✈️', route: '/shipments' },
  ] as const;

  export default function HomeScreen() {
    const router = useRouter();

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Export Manager</Text>
          <Text style={styles.headerSubtitle}>Full dashboard coming in a future update</Text>
        </View>

        <View style={styles.card}>
          {SECTIONS.map((section, index) => (
            <TouchableOpacity
              key={section.route}
              style={[styles.row, index < SECTIONS.length - 1 && styles.rowBorder]}
              onPress={() => router.push(section.route as never)}
              activeOpacity={0.7}
            >
              <Text style={styles.rowIcon}>{section.icon}</Text>
              <Text style={styles.rowLabel}>{section.label}</Text>
              <Text style={styles.rowChevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f9fafb',
    },
    content: {
      padding: 16,
      paddingBottom: 32,
    },
    header: {
      backgroundColor: '#2563eb',
      borderRadius: 12,
      padding: 20,
      marginBottom: 16,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#fff',
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.75)',
    },
    card: {
      backgroundColor: '#fff',
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    rowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: '#f3f4f6',
    },
    rowIcon: {
      fontSize: 20,
      marginRight: 12,
    },
    rowLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: '#111827',
    },
    rowChevron: {
      fontSize: 20,
      color: '#9ca3af',
    },
  });
  ```

- [ ] **Step 2: Run lint**

  ```bash
  cd mobile && npm run lint
  ```

  Expected: no errors reported for `src/app/(app)/index.tsx`.

- [ ] **Step 3: Smoke test on simulator**

  Run `npm start` (or `npm run ios` / `npm run android`) and verify:
  - Home tab shows blue header "Export Manager" with subtitle
  - 5 rows visible: Suppliers, Products, Inventory, Purchasing, Shipments
  - Tapping each row navigates to the correct screen
  - Tab bar remains visible after navigation

- [ ] **Step 4: Commit**

  ```bash
  git add mobile/src/app/\(app\)/index.tsx
  git commit -m "feat(mobile): replace home screen placeholder with branded stub"
  ```
