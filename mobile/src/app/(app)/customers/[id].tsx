import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { customersApi } from '../../../lib/api/customers.api';

interface CustomerDetail {
  id: string;
  fullName: string;
  customerType: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  sales: Array<{
    id: string;
    saleReference: string;
    totalGhs: number;
    saleDatetime: string;
    status: string;
  }>;
}

const TYPE_CONFIG: Record<string, { bg: string; text: string }> = {
  retail: { bg: '#dbeafe', text: '#1e40af' },
  wholesale: { bg: '#fef3c7', text: '#92400e' },
};

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await customersApi.get(id);
      setCustomer((res.data as any).data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 40 }} color="#2563eb" />;
  }

  if (!customer) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Customer not found</Text>
      </View>
    );
  }

  const typeConfig = TYPE_CONFIG[customer.customerType] ?? { bg: '#f3f4f6', text: '#374151' };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.name}>{customer.fullName}</Text>
          <View style={[styles.typeBadge, { backgroundColor: typeConfig.bg }]}>
            <Text style={[styles.typeBadgeText, { color: typeConfig.text }]}>
              {customer.customerType}
            </Text>
          </View>
        </View>
      </View>

      {/* Contact info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact</Text>
        {customer.phone && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{customer.phone}</Text>
          </View>
        )}
        {customer.email && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{customer.email}</Text>
          </View>
        )}
        {customer.address && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Address</Text>
            <Text style={styles.infoValue}>{customer.address}</Text>
          </View>
        )}
        {!customer.phone && !customer.email && !customer.address && (
          <Text style={styles.empty}>No contact details</Text>
        )}
      </View>

      {/* Recent sales */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Sales</Text>
          <TouchableOpacity onPress={() => router.push(`/(app)/sales?customerId=${customer.id}`)}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        {customer.sales.length === 0 ? (
          <Text style={styles.empty}>No sales yet</Text>
        ) : (
          customer.sales.map((sale) => (
            <TouchableOpacity
              key={sale.id}
              style={styles.saleRow}
              onPress={() => router.push(`/(app)/sales/${sale.id}`)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.saleRef}>{sale.saleReference}</Text>
                <Text style={styles.saleMeta}>
                  {new Date(sale.saleDatetime).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.saleTotal}>GHS {Number(sale.totalGhs).toFixed(2)}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { color: '#6b7280', fontSize: 16 },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 22, fontWeight: '700', color: '#111827', flex: 1 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  typeBadgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  section: {
    backgroundColor: '#fff',
    margin: 12,
    marginBottom: 0,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  seeAll: { fontSize: 13, color: '#2563eb', fontWeight: '600' },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: { fontSize: 13, color: '#6b7280', width: 72 },
  infoValue: { fontSize: 13, color: '#111827', flex: 1 },
  empty: { color: '#9ca3af', fontSize: 13 },
  saleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  saleRef: { fontSize: 14, fontWeight: '600', color: '#111827' },
  saleMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  saleTotal: { fontSize: 14, fontWeight: '700', color: '#2563eb' },
});
