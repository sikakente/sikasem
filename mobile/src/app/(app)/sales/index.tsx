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
import { salesApi } from '../../../lib/api/sales.api';
import { formatDate } from '../../../lib/utils/date';

interface SaleCard {
  id: string;
  saleReference: string;
  saleDatetime: string;
  totalGhs: number;
  status: string;
  customer: { id: string; fullName: string } | null;
  _count: { items: number };
}

const STATUS_FILTERS = [
  { label: 'All', value: undefined },
  { label: 'Completed', value: 'completed' },
  { label: 'Voided', value: 'voided' },
];

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  completed: { bg: '#d1fae5', text: '#065f46', label: 'Completed' },
  voided: { bg: '#fee2e2', text: '#991b1b', label: 'Voided' },
};

export default function SalesHistoryScreen() {
  const router = useRouter();
  const [sales, setSales] = useState<SaleCard[]>([]);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (status?: string) => {
    try {
      setError(null);
      const res = await salesApi.list({ status, limit: 50 });
      setSales((res.data as any).data ?? []);
    } catch {
      setError('Failed to load sales. Tap to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(statusFilter);
  }, [load, statusFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    load(statusFilter);
  };

  const renderItem = ({ item }: { item: SaleCard }) => {
    const statusConfig = STATUS_CONFIG[item.status] ?? {
      bg: '#f3f4f6',
      text: '#374151',
      label: item.status,
    };
    return (
      <TouchableOpacity style={styles.card} onPress={() => router.push(`/(app)/sales/${item.id}`)}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardRef}>{item.saleReference}</Text>
          <View style={[styles.badge, { backgroundColor: statusConfig.bg }]}>
            <Text style={[styles.badgeText, { color: statusConfig.text }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>
        <Text style={styles.cardMeta}>
          {formatDate(item.saleDatetime)} ·{' '}
          {item.customer?.fullName ?? 'Walk-in'} · {item._count.items} item
          {item._count.items !== 1 ? 's' : ''}
        </Text>
        <Text style={styles.cardTotal}>GHS {Number(item.totalGhs).toFixed(2)}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.label}
            style={[styles.filterChip, statusFilter === f.value && styles.filterChipActive]}
            onPress={() => setStatusFilter(f.value)}
          >
            <Text
              style={[
                styles.filterChipText,
                statusFilter === f.value && styles.filterChipTextActive,
              ]}
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
            load(statusFilter);
          }}
        >
          <Text style={styles.errorText}>{error}</Text>
        </TouchableOpacity>
      ) : (
        <FlatList
          data={sales}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No sales found</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  filterRow: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 8 },
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
  cardMeta: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  cardTotal: { fontSize: 14, fontWeight: '700', color: '#2563eb' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 40, color: '#9ca3af' },
  errorBanner: {
    backgroundColor: '#fee2e2',
    padding: 16,
    margin: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  errorText: { color: '#dc2626', fontSize: 14, textAlign: 'center' },
});
