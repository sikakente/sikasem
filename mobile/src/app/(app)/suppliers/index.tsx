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
import { suppliersApi } from '../../../lib/api/suppliers.api';

interface Supplier {
  id: string;
  name: string;
  supplierType: string;
  city: string | null;
  country: string;
  isActive: boolean;
}

export default function SuppliersScreen() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (searchVal = '') => {
    try {
      const res = await suppliersApi.list({ search: searchVal || undefined });
      setSuppliers((res.data as any).suppliers ?? []);
    } catch {
      // handle error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (text: string) => {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(text), 300);
  };

  const onRefresh = () => { setRefreshing(true); load(search); };

  const renderItem = ({ item }: { item: Supplier }) => (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/(app)/suppliers/${item.id}`)}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardName}>{item.name}</Text>
        <View style={[styles.badge, !item.isActive && styles.badgeInactive]}>
          <Text style={styles.badgeText}>{item.isActive ? 'Active' : 'Inactive'}</Text>
        </View>
      </View>
      <Text style={styles.cardSub}>{item.supplierType} · {item.city ?? item.country}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search suppliers..."
        placeholderTextColor="#9ca3af"
        value={search}
        onChangeText={handleSearch}
      />

      {loading ? (
        <ActivityIndicator style={styles.loader} color="#2563eb" />
      ) : (
        <FlatList
          data={suppliers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No suppliers found</Text>}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/(app)/suppliers/new')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  searchInput: { margin: 16, height: 44, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 14, backgroundColor: '#fff', color: '#111827' },
  loader: { marginTop: 40 },
  list: { padding: 16, paddingTop: 0 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardName: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1 },
  cardSub: { fontSize: 13, color: '#6b7280' },
  badge: { backgroundColor: '#d1fae5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeInactive: { backgroundColor: '#fee2e2' },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#065f46' },
  empty: { textAlign: 'center', marginTop: 40, color: '#9ca3af' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 54, height: 54, borderRadius: 27, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },
});
