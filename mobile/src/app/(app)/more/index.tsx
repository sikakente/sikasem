import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePermissions } from '../../../hooks/usePermissions';
import { AppModule } from '../../../hooks/usePermissions';

type ModuleCard = {
  id: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  route: string;
  module: AppModule;
};

type Section = {
  title: string;
  modules: ModuleCard[];
};

const SECTIONS: Section[] = [
  {
    title: 'Operations',
    modules: [
      {
        id: 'suppliers',
        label: 'Suppliers',
        icon: 'people-outline',
        route: '/(app)/suppliers',
        module: 'purchasing' as const,
      },
      {
        id: 'products',
        label: 'Products',
        icon: 'cube-outline',
        route: '/(app)/products',
        module: 'inventory' as const,
      },
      {
        id: 'purchasing',
        label: 'Purchasing',
        icon: 'cart-outline',
        route: '/(app)/purchasing',
        module: 'purchasing' as const,
      },
      {
        id: 'receiving',
        label: 'Receive',
        icon: 'download-outline',
        route: '/(app)/receiving',
        module: 'receiving' as const,
      },
      {
        id: 'shipments',
        label: 'Shipments',
        icon: 'airplane-outline',
        route: '/(app)/shipments',
        module: 'shipments' as const,
      },
      {
        id: 'inventory',
        label: 'Inventory',
        icon: 'layers-outline',
        route: '/(app)/inventory',
        module: 'inventory' as const,
      },
      {
        id: 'sales',
        label: 'Sales',
        icon: 'receipt-outline',
        route: '/(app)/sales',
        module: 'sales' as const,
      },
      {
        id: 'customers',
        label: 'Customers',
        icon: 'person-outline',
        route: '/(app)/customers',
        module: 'customers' as const,
      },
    ],
  },
  {
    title: 'Finance',
    modules: [
      {
        id: 'fx',
        label: 'FX Rates',
        icon: 'cash-outline',
        route: '/(app)/fx',
        module: 'fx' as const,
      },
      {
        id: 'invoices',
        label: 'Invoices',
        icon: 'document-text-outline',
        route: '/(app)/invoices',
        module: 'invoices' as const,
      },
      {
        id: 'receipts',
        label: 'Receipts',
        icon: 'receipt-outline',
        route: '/(app)/receipts',
        module: 'sales' as const,
      },
    ],
  },
  {
    title: 'Analytics',
    modules: [
      {
        id: 'reports',
        label: 'Reports',
        icon: 'bar-chart-outline',
        route: '/(app)/reports',
        module: 'reports' as const,
      },
      {
        id: 'alerts',
        label: 'Alerts',
        icon: 'notifications-outline',
        route: '/(app)/alerts',
        module: 'alerts' as const,
      },
      {
        id: 'ai',
        label: 'AI Assistant',
        icon: 'chatbubble-ellipses-outline',
        route: '/(app)/ai',
        module: 'ai' as const,
      },
    ],
  },
  {
    title: 'Admin',
    modules: [
      {
        id: 'settings',
        label: 'Settings',
        icon: 'settings-outline',
        route: '/(app)/settings',
        module: 'settings' as const,
      },
      {
        id: 'users',
        label: 'Users',
        icon: 'people-circle-outline',
        route: '/(app)/settings/users',
        module: 'users' as const,
      },
    ],
  },
];

export default function MoreScreen() {
  const { canAccess } = usePermissions();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {SECTIONS.map((section) => {
        const visibleModules = section.modules.filter((m) => canAccess(m.module));
        if (visibleModules.length === 0) return null;

        return (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionHeader}>{section.title}</Text>
            <View style={styles.grid}>
              {visibleModules.map((mod) => (
                <TouchableOpacity
                  key={mod.id}
                  style={styles.card}
                  onPress={() => router.push(mod.route as never)}
                  activeOpacity={0.75}
                >
                  <View style={styles.iconContainer}>
                    <Ionicons name={mod.icon} size={26} color="#2563eb" />
                  </View>
                  <Text style={styles.cardLabel} numberOfLines={2}>
                    {mod.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    paddingBottom: 32,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '22%',
    minWidth: 72,
    aspectRatio: 0.9,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 14,
  },
});
