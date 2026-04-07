import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { inventoryApi } from '../../../lib/api/inventory.api';
import { useInventoryStore, InventoryBalance } from '../../../store/inventory.store';

export default function InventoryScreen() {
  const router = useRouter();
  const { balances, lowStockCount, setBalances } = useInventoryStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchInventory = useCallback(async () => {
    try {
      setError(null);
      const response = await inventoryApi.list();
      const data = response.data as { data: InventoryBalance[] } | InventoryBalance[];
      if (Array.isArray(data)) {
        setBalances(data);
      } else if (data && Array.isArray((data as { data: InventoryBalance[] }).data)) {
        setBalances((data as { data: InventoryBalance[] }).data);
      } else {
        setBalances([]);
      }
    } catch {
      setError('Failed to load inventory.');
    }
  }, [setBalances]);

  useEffect(() => {
    setLoading(true);
    fetchInventory().finally(() => setLoading(false));
  }, [fetchInventory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchInventory();
    setRefreshing(false);
  }, [fetchInventory]);

  const ukStock = balances
    .filter((b) => b.location?.name?.toLowerCase().includes('uk') || b.locationId?.toLowerCase().includes('uk'))
    .reduce((sum, b) => sum + (b.quantityOnHand || 0), 0);

  const ghanaStock = balances
    .filter((b) => b.location?.name?.toLowerCase().includes('ghana') || b.locationId?.toLowerCase().includes('ghana'))
    .reduce((sum, b) => sum + (b.quantityOnHand || 0), 0);

  const filteredBalances = balances.filter((b) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      b.productId?.toLowerCase().includes(term) ||
      b.product?.name?.toLowerCase().includes(term)
    );
  });

  const renderSummaryCards = () => (
    <View style={styles.summaryRow}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>UK Stock</Text>
        <Text style={styles.summaryValue}>{ukStock}</Text>
      </View>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Ghana Stock</Text>
        <Text style={styles.summaryValue}>{ghanaStock}</Text>
      </View>
      <View style={[styles.summaryCard, lowStockCount > 0 && styles.summaryCardAlert]}>
        <Text style={[styles.summaryLabel, lowStockCount > 0 && styles.summaryLabelAlert]}>Low Stock</Text>
        <Text style={[styles.summaryValue, lowStockCount > 0 && styles.summaryValueAlert]}>{lowStockCount}</Text>
      </View>
    </View>
  );

  const renderRow = ({ item }: { item: InventoryBalance }) => {
    const productName = item.product?.name || item.productId;
    const locationName = item.location?.name || item.locationId;
    const isLow = item.quantityAvailable <= 0;

    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => router.push(`/inventory/product/${item.productId}` as never)}
        activeOpacity={0.8}
      >
        <View style={styles.rowMain}>
          <Text style={styles.productName} numberOfLines={1}>{productName}</Text>
          <View style={styles.locationBadge}>
            <Text style={styles.locationBadgeText}>{locationName}</Text>
          </View>
        </View>
        <Text style={[styles.quantityText, isLow && styles.quantityTextLow]}>
          {item.quantityAvailable}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No inventory found</Text>
      <Text style={styles.emptySubtitle}>Inventory balances will appear here</Text>
    </View>
  );

  const renderHeader = () => (
    <View>
      {renderSummaryCards()}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by product name or ID..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      <FlatList
        data={filteredBalances}
        keyExtractor={(item) => item.id}
        renderItem={renderRow}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={filteredBalances.length === 0 ? styles.listEmpty : styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 24,
  },
  listEmpty: {
    flex: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryCardAlert: {
    backgroundColor: '#fff1f2',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryLabelAlert: {
    color: '#be123c',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  summaryValueAlert: {
    color: '#e11d48',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 8,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  locationBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  locationBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563eb',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    minWidth: 36,
    textAlign: 'right',
  },
  quantityTextLow: {
    color: '#e11d48',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
