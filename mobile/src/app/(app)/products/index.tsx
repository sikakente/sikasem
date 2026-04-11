import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { productsApi } from '../../../lib/api/products.api';
import { BarcodeScanner } from '../../../components/BarcodeScanner';

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  isActive: boolean;
}

export default function ProductsScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (searchVal = '') => {
    try {
      const res = await productsApi.list({ search: searchVal || undefined });
      setProducts((res.data as any).products ?? []);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = (text: string) => {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(text), 300);
  };

  const handleBarcodeScan = async (barcode: string) => {
    setScannerOpen(false);
    try {
      const res = await productsApi.getByBarcode(barcode);
      const product = res.data as any;
      router.push(`/(app)/products/${product.id}`);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        Alert.alert(
          'Product Not Found',
          `No product with barcode ${barcode}. Would you like to add it?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Add Product', onPress: () => router.push('/(app)/products/new') },
          ],
        );
      }
    }
  };

  const renderItem = ({ item }: { item: Product }) => (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/(app)/products/${item.id}`)}>
      <View style={styles.cardLeft}>
        <View style={styles.imgPlaceholder}>
          <Text style={styles.imgText}>{item.name[0]}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName}>{item.name}</Text>
        <Text style={styles.cardSku}>{item.sku}</Text>
        {item.barcode && <Text style={styles.cardBarcode}>{item.barcode}</Text>}
      </View>
      <View style={[styles.stockBadge, !item.isActive && styles.stockBadgeInactive]}>
        <Text style={styles.stockBadgeText}>{item.isActive ? 'Active' : 'Inactive'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search name, SKU, barcode..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={handleSearch}
        />
        <TouchableOpacity style={styles.scanBtn} onPress={() => setScannerOpen(true)}>
          <Text style={styles.scanBtnText}>⊡</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color="#2563eb" />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(search);
              }}
            />
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No products found</Text>}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/(app)/products/new')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <BarcodeScanner
        visible={scannerOpen}
        onScanned={handleBarcodeScan}
        onClose={() => setScannerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  searchRow: { flexDirection: 'row', margin: 16, gap: 8 },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    color: '#111827',
  },
  scanBtn: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBtnText: { fontSize: 22, color: '#374151' },
  loader: { marginTop: 40 },
  list: { padding: 16, paddingTop: 0 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardLeft: { marginRight: 12 },
  imgPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imgText: { fontSize: 18, fontWeight: '700', color: '#4f46e5' },
  cardBody: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  cardSku: { fontSize: 12, color: '#6b7280' },
  cardBarcode: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  stockBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  stockBadgeInactive: { backgroundColor: '#fee2e2' },
  stockBadgeText: { fontSize: 11, fontWeight: '600', color: '#065f46' },
  empty: { textAlign: 'center', marginTop: 40, color: '#9ca3af' },
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
