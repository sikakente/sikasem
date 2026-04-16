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
  iconBg: string;
  iconColor: string;
};

type Section = {
  title: string;
  sectionIcon: React.ComponentProps<typeof Ionicons>['name'];
  modules: ModuleCard[];
};

const SECTIONS: Section[] = [
  {
    title: 'Operations',
    sectionIcon: 'briefcase-outline',
    modules: [
      {
        id: 'suppliers',
        label: 'Suppliers',
        icon: 'people-outline',
        route: '/(app)/suppliers',
        module: 'purchasing' as const,
        iconBg: '#EFF6FF',
        iconColor: '#2563EB',
      },
      {
        id: 'products',
        label: 'Products',
        icon: 'cube-outline',
        route: '/(app)/products',
        module: 'inventory' as const,
        iconBg: '#F0FDF4',
        iconColor: '#16A34A',
      },
      {
        id: 'purchasing',
        label: 'Purchasing',
        icon: 'cart-outline',
        route: '/(app)/purchasing',
        module: 'purchasing' as const,
        iconBg: '#FFF7ED',
        iconColor: '#EA580C',
      },
      {
        id: 'receiving',
        label: 'Receive',
        icon: 'download-outline',
        route: '/(app)/receiving',
        module: 'receiving' as const,
        iconBg: '#F5F3FF',
        iconColor: '#7C3AED',
      },
      {
        id: 'shipments',
        label: 'Shipments',
        icon: 'airplane-outline',
        route: '/(app)/shipments',
        module: 'shipments' as const,
        iconBg: '#EFF6FF',
        iconColor: '#1D4ED8',
      },
      {
        id: 'inventory',
        label: 'Inventory',
        icon: 'layers-outline',
        route: '/(app)/inventory',
        module: 'inventory' as const,
        iconBg: '#F0FDF4',
        iconColor: '#15803D',
      },
      {
        id: 'sales',
        label: 'Sales',
        icon: 'receipt-outline',
        route: '/(app)/sales',
        module: 'sales' as const,
        iconBg: '#FFFBEB',
        iconColor: '#D97706',
      },
      {
        id: 'customers',
        label: 'Customers',
        icon: 'person-outline',
        route: '/(app)/customers',
        module: 'customers' as const,
        iconBg: '#FDF4FF',
        iconColor: '#9333EA',
      },
    ],
  },
  {
    title: 'Finance',
    sectionIcon: 'cash-outline',
    modules: [
      {
        id: 'fx',
        label: 'FX Rates',
        icon: 'swap-horizontal-outline',
        route: '/(app)/fx',
        module: 'fx' as const,
        iconBg: '#FFFBEB',
        iconColor: '#D97706',
      },
      {
        id: 'invoices',
        label: 'Invoices',
        icon: 'document-text-outline',
        route: '/(app)/invoices',
        module: 'invoices' as const,
        iconBg: '#EFF6FF',
        iconColor: '#2563EB',
      },
      {
        id: 'receipts',
        label: 'Receipts',
        icon: 'receipt-outline',
        route: '/(app)/receipts',
        module: 'sales' as const,
        iconBg: '#F0FDF4',
        iconColor: '#16A34A',
      },
    ],
  },
  {
    title: 'Analytics',
    sectionIcon: 'bar-chart-outline',
    modules: [
      {
        id: 'reports',
        label: 'Reports',
        icon: 'bar-chart-outline',
        route: '/(app)/reports',
        module: 'reports' as const,
        iconBg: '#EFF6FF',
        iconColor: '#1D4ED8',
      },
      {
        id: 'alerts',
        label: 'Alerts',
        icon: 'notifications-outline',
        route: '/(app)/alerts',
        module: 'alerts' as const,
        iconBg: '#FEF2F2',
        iconColor: '#DC2626',
      },
      {
        id: 'ai',
        label: 'AI Assistant',
        icon: 'sparkles-outline',
        route: '/(app)/ai',
        module: 'ai' as const,
        iconBg: '#F5F3FF',
        iconColor: '#7C3AED',
      },
    ],
  },
  {
    title: 'Admin',
    sectionIcon: 'settings-outline',
    modules: [
      {
        id: 'settings',
        label: 'Settings',
        icon: 'settings-outline',
        route: '/(app)/settings',
        module: 'settings' as const,
        iconBg: '#F8FAFC',
        iconColor: '#475569',
      },
      {
        id: 'users',
        label: 'Users',
        icon: 'people-circle-outline',
        route: '/(app)/settings/users',
        module: 'users' as const,
        iconBg: '#F8FAFC',
        iconColor: '#475569',
      },
    ],
  },
];

export default function MoreScreen() {
  const { canAccess } = usePermissions();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {SECTIONS.map((section) => {
        const visibleModules = section.modules.filter((m) => canAccess(m.module));
        if (visibleModules.length === 0) return null;

        return (
          <View key={section.title} style={styles.section}>
            {/* Section header */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name={section.sectionIcon} size={14} color="#3B82F6" />
              </View>
              <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
            </View>

            {/* Module grid */}
            <View style={styles.grid}>
              {visibleModules.map((mod) => (
                <TouchableOpacity
                  key={mod.id}
                  style={styles.card}
                  onPress={() => router.push(mod.route as never)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={mod.label}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <View style={[styles.iconContainer, { backgroundColor: mod.iconBg }]}>
                    <Ionicons name={mod.icon} size={22} color={mod.iconColor} />
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
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 24,
  },
  section: {},

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.9,
  },

  // Module cards grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    width: '22%',
    minWidth: 76,
    aspectRatio: 0.85,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    gap: 8,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 14,
  },
});
