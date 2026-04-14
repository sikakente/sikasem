// mobile/src/app/(app)/reports/index.tsx
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const REPORT_CARDS: Array<{
  type: string;
  title: string;
  description: string;
  icon: IconName;
}> = [
  {
    type: 'inventory',
    title: 'Inventory Report',
    description: 'Current stock levels by location with estimated value and status.',
    icon: 'layers-outline',
  },
  {
    type: 'stock-movements',
    title: 'Stock Movements',
    description: 'All inventory movements with type, quantity, and location.',
    icon: 'swap-vertical-outline',
  },
  {
    type: 'shipments',
    title: 'Shipment Performance',
    description: 'Transit days, status, and total shipping costs per shipment.',
    icon: 'airplane-outline',
  },
  {
    type: 'shipping-costs',
    title: 'Shipping Costs',
    description: 'Granular cost entries by type, vendor, and date.',
    icon: 'cash-outline',
  },
  {
    type: 'sales',
    title: 'Sales Report',
    description: 'Transactions with FX rate, GBP equivalent, and payment method.',
    icon: 'receipt-outline',
  },
  {
    type: 'profitability',
    title: 'Profitability',
    description: 'Per-product gross profit and margin using landed cost.',
    icon: 'trending-up-outline',
  },
  {
    type: 'supplier-spend',
    title: 'Supplier Spend',
    description: 'Total spend, quantity, and average unit cost per supplier.',
    icon: 'people-outline',
  },
  {
    type: 'fx-gain-loss',
    title: 'FX Gain / Loss',
    description: 'Monthly GBP expected vs actual and gain/loss breakdown.',
    icon: 'swap-horizontal-outline',
  },
];

export default function ReportsIndexScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Reports</Text>
      {REPORT_CARDS.map((card) => (
        <TouchableOpacity
          key={card.type}
          style={styles.card}
          onPress={() => router.push(`/(app)/reports/${card.type}`)}
        >
          <View style={styles.iconWrap}>
            <Ionicons name={card.icon} size={24} color="#2563eb" />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.cardDesc}>{card.description}</Text>
          </View>
          <Ionicons name="chevron-forward-outline" size={18} color="#9ca3af" />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 2 },
  cardDesc: { fontSize: 13, color: '#6b7280' },
});
