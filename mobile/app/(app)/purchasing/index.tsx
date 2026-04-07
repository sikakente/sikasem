import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { purchasingApi } from '../../../lib/api/purchasing.api';

interface PurchaseItem {
  totalCostGbp: number;
}

interface PurchaseOrder {
  id: string;
  supplierId: string;
  purchaseDate: string;
  status: 'draft' | 'confirmed';
  items: PurchaseItem[];
}

export default function PurchaseOrderListScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setError(null);
      const response = await purchasingApi.list();
      const data = response.data as { data: PurchaseOrder[] } | PurchaseOrder[];
      if (Array.isArray(data)) {
        setOrders(data);
      } else if (data && Array.isArray((data as { data: PurchaseOrder[] }).data)) {
        setOrders((data as { data: PurchaseOrder[] }).data);
      } else {
        setOrders([]);
      }
    } catch {
      setError('Failed to load purchase orders.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchOrders().finally(() => setLoading(false));
  }, [fetchOrders]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  }, [fetchOrders]);

  const getTotalGbp = (items: PurchaseItem[]): number => {
    if (!items || items.length === 0) return 0;
    return items.reduce((sum, item) => sum + (item.totalCostGbp || 0), 0);
  };

  const renderCard = ({ item }: { item: PurchaseOrder }) => {
    const total = getTotalGbp(item.items);
    const itemCount = item.items ? item.items.length : 0;
    const isConfirmed = item.status === 'confirmed';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/purchasing/${item.id}` as never)}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.supplierName}>{item.supplierId || 'Unknown Supplier'}</Text>
          <View style={[styles.badge, isConfirmed ? styles.badgeConfirmed : styles.badgeDraft]}>
            <Text style={[styles.badgeText, isConfirmed ? styles.badgeTextConfirmed : styles.badgeTextDraft]}>
              {item.status}
            </Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardMeta}>
            {item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : 'No date'}
          </Text>
          <Text style={styles.cardMeta}>{itemCount} {itemCount === 1 ? 'item' : 'items'}</Text>
          <Text style={styles.totalText}>£{total.toFixed(2)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No purchase orders yet</Text>
      <Text style={styles.emptySubtitle}>Tap + to create your first purchase order</Text>
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
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        contentContainerStyle={orders.length === 0 ? styles.listEmpty : styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
        }
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/purchasing/new' as never)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
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
    padding: 16,
    gap: 12,
  },
  listEmpty: {
    flex: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  supplierName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeDraft: {
    backgroundColor: '#fff7ed',
  },
  badgeConfirmed: {
    backgroundColor: '#f0fdf4',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  badgeTextDraft: {
    color: '#ea580c',
  },
  badgeTextConfirmed: {
    color: '#16a34a',
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardMeta: {
    fontSize: 13,
    color: '#6b7280',
  },
  totalText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 'auto',
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
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  fabIcon: {
    fontSize: 28,
    color: '#fff',
    lineHeight: 32,
  },
});
