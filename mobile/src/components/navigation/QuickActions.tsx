import { ScrollView, TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { usePermissions } from '../../hooks/usePermissions';

type QuickAction = {
  id: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  route: string;
  requiredModule: 'inventory' | 'purchasing' | 'shipments' | 'receiving' | 'pos' | 'ai';
};

const ACTIONS: QuickAction[] = [
  {
    id: 'scan',
    label: 'Scan Product',
    icon: 'barcode-outline',
    route: '/(app)/inventory',
    requiredModule: 'inventory',
  },
  {
    id: 'purchase',
    label: 'New Purchase',
    icon: 'cart-outline',
    route: '/(app)/purchasing',
    requiredModule: 'purchasing',
  },
  {
    id: 'shipment',
    label: 'New Shipment',
    icon: 'airplane-outline',
    route: '/(app)/shipments',
    requiredModule: 'shipments',
  },
  {
    id: 'receive',
    label: 'Receive Goods',
    icon: 'download-outline',
    route: '/(app)/receiving',
    requiredModule: 'receiving',
  },
  {
    id: 'sale',
    label: 'Start Sale',
    icon: 'storefront-outline',
    route: '/(app)/pos',
    requiredModule: 'pos',
  },
  {
    id: 'ai',
    label: 'Ask AI',
    icon: 'chatbubble-ellipses-outline',
    route: '/(app)/ai',
    requiredModule: 'ai',
  },
];

export function QuickActions() {
  const { canAccess } = usePermissions();
  const visible = ACTIONS.filter((a) => canAccess(a.requiredModule));

  if (visible.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.heading}>Quick Actions</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {visible.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.actionButton}
            onPress={() => router.push(action.route as Parameters<typeof router.push>[0])}
            accessibilityLabel={action.label}
            accessibilityRole="button"
          >
            <View style={styles.iconContainer}>
              <Ionicons name={action.icon} size={24} color="#007AFF" />
            </View>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  heading: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3C3C43',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  actionButton: {
    alignItems: 'center',
    marginHorizontal: 4,
    minWidth: 72,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  actionLabel: {
    fontSize: 11,
    color: '#3C3C43',
    textAlign: 'center',
    fontWeight: '500',
  },
});
