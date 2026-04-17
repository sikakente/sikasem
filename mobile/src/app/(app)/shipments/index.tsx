import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { shipmentsApi } from '../../../lib/api/shipments.api';
import { ShipmentStatusBadge } from '../../../components/ShipmentStatusBadge';

interface ShipmentCard {
  id: string;
  shipmentReference: string;
  shipmentName: string | null;
  carrierName: string | null;
  status: string;
  dispatchDate: string | null;
  expectedArrivalDate: string | null;
  _count: { items: number };
}

const STATUS_FILTERS = [
  { label: 'All', value: undefined },
  { label: 'In Transit', value: 'dispatched' },
  { label: 'Delayed', value: 'delayed' },
  { label: 'Received', value: 'received' },
];

export default function ShipmentsScreen() {
  const router = useRouter();
  const [shipments, setShipments] = useState<ShipmentCard[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (searchVal = '', status?: string) => {
    try {
      setError(null);
      const res = await shipmentsApi.list({
        search: searchVal || undefined,
        status,
      });
      setShipments((res.data as any).data ?? []);
    } catch {
      setError('Failed to load shipments. Tap to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load('', statusFilter);
  }, [load, statusFilter]);

  const handleSearch = (text: string) => {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(text, statusFilter), 300);
  };

  const onRefresh = () => {
    setRefreshing(true);
    load(search, statusFilter);
  };

  const renderItem = ({ item }: { item: ShipmentCard }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(app)/shipments/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardRef}>{item.shipmentReference}</Text>
        <ShipmentStatusBadge status={item.status} />
      </View>
      {item.shipmentName && <Text style={styles.cardName}>{item.shipmentName}</Text>}
      <View style={styles.cardMeta}>
        <Text style={styles.cardMetaText}>
          {item.carrierName ?? 'No carrier'} · {item._count.items} item
          {item._count.items !== 1 ? 's' : ''}
        </Text>
        {item.dispatchDate && (
          <Text style={styles.cardMetaText}>
            Dispatched {new Date(item.dispatchDate).toLocaleDateString()}
          </Text>
        )}
        {item.expectedArrivalDate && (
          <Text style={styles.cardMetaText}>
            ETA {new Date(item.expectedArrivalDate).toLocaleDateString()}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search shipments..."
        placeholderTextColor="#9ca3af"
        value={search}
        onChangeText={handleSearch}
      />

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
            load(search, statusFilter);
          }}
        >
          <Text style={styles.errorText}>{error}</Text>
        </TouchableOpacity>
      ) : (
        <FlatList
          data={shipments}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No shipments found</Text>}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/(app)/shipments/new')} accessibilityLabel="Create new shipment" accessibilityRole="button">
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  searchInput: {
    margin: 16,
    marginBottom: 8,
    height: 44,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    color: '#111827',
  },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
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
  cardName: { fontSize: 13, color: '#374151', marginBottom: 4 },
  cardMeta: { gap: 2, marginTop: 4 },
  cardMetaText: { fontSize: 12, color: '#6b7280' },
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
