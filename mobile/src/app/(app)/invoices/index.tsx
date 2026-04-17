import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { invoicesApi } from '../../../lib/api/invoices.api';
import { InvoiceStatusBadge } from '../../../components/InvoiceStatusBadge';

interface InvoiceCard {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  currencyCode: string;
  total: number;
  status: string;
  customer: { id: string; fullName: string } | null;
}

const STATUS_FILTERS = [
  { label: 'All', value: undefined },
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Paid', value: 'paid' },
  { label: 'Overdue', value: undefined, overdue: true },
];

export default function InvoicesScreen() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceCard[]>([]);
  const [activeFilter, setActiveFilter] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (filterIndex: number) => {
    try {
      setError(null);
      const f = STATUS_FILTERS[filterIndex];
      const params: Record<string, unknown> = {};
      if (f.value) params.status = f.value;
      if (f.overdue) params.overdue = true;
      const res = await invoicesApi.list(params);
      setInvoices((res.data as any).data ?? []);
    } catch {
      setError('Failed to load invoices. Tap to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(activeFilter);
  }, [load, activeFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    load(activeFilter);
  };

  const renderItem = ({ item }: { item: InvoiceCard }) => (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/(app)/invoices/${item.id}`)}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardRef}>{item.invoiceNumber}</Text>
        <InvoiceStatusBadge status={item.status} />
      </View>
      {item.customer && <Text style={styles.cardName}>{item.customer.fullName}</Text>}
      <View style={styles.cardFooter}>
        <Text style={styles.cardMeta}>Due {new Date(item.dueDate).toLocaleDateString()}</Text>
        <Text style={styles.cardTotal}>
          {item.currencyCode} {Number(item.total).toFixed(2)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f, i) => (
          <TouchableOpacity
            key={f.label}
            style={[styles.filterChip, activeFilter === i && styles.filterChipActive]}
            onPress={() => setActiveFilter(i)}
          >
            <Text
              style={[styles.filterChipText, activeFilter === i && styles.filterChipTextActive]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color="#2563eb" />
      ) : error ? (
        <TouchableOpacity
          style={styles.errorBanner}
          onPress={() => {
            setLoading(true);
            load(activeFilter);
          }}
        >
          <Text style={styles.errorText}>{error}</Text>
        </TouchableOpacity>
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No invoices found</Text>}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/(app)/invoices/new')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  filterChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filterChipText: { fontSize: 13, color: '#374151' },
  filterChipTextActive: { color: '#fff' },
  loader: { marginTop: 40 },
  list: { padding: 16, paddingTop: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardRef: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardName: { fontSize: 13, color: '#374151', marginBottom: 6 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  cardMeta: { fontSize: 12, color: '#6b7280' },
  cardTotal: { fontSize: 14, fontWeight: '600', color: '#111827' },
  empty: { textAlign: 'center', marginTop: 40, color: '#9ca3af' },
  errorBanner: {
    backgroundColor: '#fee2e2',
    padding: 16,
    margin: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  errorText: { color: '#dc2626', fontSize: 14, textAlign: 'center' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },
});
