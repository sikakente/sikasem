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
import { customersApi } from '../../../lib/api/customers.api';

interface CustomerCard {
  id: string;
  fullName: string;
  customerType: string;
  phone: string | null;
  email: string | null;
  _count: { sales: number };
}

const TYPE_CONFIG: Record<string, { bg: string; text: string }> = {
  retail: { bg: '#dbeafe', text: '#1e40af' },
  wholesale: { bg: '#fef3c7', text: '#92400e' },
};

export default function CustomersScreen() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerCard[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (searchVal = '') => {
    try {
      setError(null);
      const res = await customersApi.list({ search: searchVal || undefined });
      setCustomers((res.data as any).data ?? []);
    } catch {
      setError('Failed to load customers. Tap to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load('');
  }, [load]);

  const handleSearch = (text: string) => {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(text), 300);
  };

  const onRefresh = () => {
    setRefreshing(true);
    load(search);
  };

  const renderItem = ({ item }: { item: CustomerCard }) => {
    const typeConfig = TYPE_CONFIG[item.customerType] ?? { bg: '#f3f4f6', text: '#374151' };
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(app)/customers/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardName}>{item.fullName}</Text>
          <View style={[styles.typeBadge, { backgroundColor: typeConfig.bg }]}>
            <Text style={[styles.typeBadgeText, { color: typeConfig.text }]}>
              {item.customerType}
            </Text>
          </View>
        </View>
        {(item.phone || item.email) && (
          <Text style={styles.cardMeta}>
            {[item.phone, item.email].filter(Boolean).join(' · ')}
          </Text>
        )}
        <Text style={styles.cardSales}>
          {item._count.sales} sale{item._count.sales !== 1 ? 's' : ''}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search customers..."
        placeholderTextColor="#9ca3af"
        value={search}
        onChangeText={handleSearch}
      />

      {loading ? (
        <ActivityIndicator style={styles.loader} color="#2563eb" />
      ) : error ? (
        <TouchableOpacity
          style={styles.errorBanner}
          onPress={() => {
            setLoading(true);
            load(search);
          }}
        >
          <Text style={styles.errorText}>{error}</Text>
        </TouchableOpacity>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No customers found</Text>}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/(app)/customers/new')} accessibilityLabel="Add new customer" accessibilityRole="button">
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
  cardName: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1 },
  cardMeta: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  cardSales: { fontSize: 12, color: '#9ca3af' },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  typeBadgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
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
