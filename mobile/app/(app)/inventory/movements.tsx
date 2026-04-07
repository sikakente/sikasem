import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { inventoryApi } from '../../../lib/api/inventory.api';

interface InventoryMovement {
  id: string;
  productId: string;
  movementType: string;
  quantity: number;
  fromLocationId?: string;
  toLocationId?: string;
  reference?: string;
  createdAt: string;
  fromLocation?: { name: string };
  toLocation?: { name: string };
}

const MOVEMENT_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  purchase: { bg: '#f0fdf4', text: '#16a34a' },
  sale: { bg: '#fff7ed', text: '#ea580c' },
  adjustment: { bg: '#eff6ff', text: '#2563eb' },
  transfer: { bg: '#fdf4ff', text: '#9333ea' },
  return: { bg: '#fef9c3', text: '#ca8a04' },
};

function getMovementColor(type: string) {
  return MOVEMENT_TYPE_COLORS[type?.toLowerCase()] ?? { bg: '#f3f4f6', text: '#6b7280' };
}

export default function MovementsScreen() {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMovements = useCallback(async () => {
    try {
      setError(null);
      const response = await inventoryApi.getMovements();
      const data = response.data as { data: InventoryMovement[] } | InventoryMovement[];
      if (Array.isArray(data)) {
        setMovements(data);
      } else if (data && Array.isArray((data as { data: InventoryMovement[] }).data)) {
        setMovements((data as { data: InventoryMovement[] }).data);
      } else {
        setMovements([]);
      }
    } catch {
      setError('Failed to load movements.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchMovements().finally(() => setLoading(false));
  }, [fetchMovements]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMovements();
    setRefreshing(false);
  }, [fetchMovements]);

  const renderRow = ({ item }: { item: InventoryMovement }) => {
    const color = getMovementColor(item.movementType);
    const fromName = item.fromLocation?.name || item.fromLocationId || '—';
    const toName = item.toLocation?.name || item.toLocationId || '—';
    const dateStr = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
      : 'No date';

    return (
      <View style={styles.row}>
        <View style={styles.rowTop}>
          <Text style={styles.productId} numberOfLines={1}>{item.productId}</Text>
          <View style={[styles.typeBadge, { backgroundColor: color.bg }]}>
            <Text style={[styles.typeBadgeText, { color: color.text }]}>
              {item.movementType}
            </Text>
          </View>
        </View>
        <View style={styles.rowMiddle}>
          <Text style={styles.dateText}>{dateStr}</Text>
          <Text style={styles.quantityText}>
            {item.quantity > 0 ? `+${item.quantity}` : item.quantity}
          </Text>
        </View>
        <View style={styles.rowBottom}>
          <Text style={styles.locationText}>
            {item.movementType?.toLowerCase() === 'transfer'
              ? `${fromName} → ${toName}`
              : item.toLocationId
              ? `To: ${toName}`
              : item.fromLocationId
              ? `From: ${fromName}`
              : '—'}
          </Text>
          {item.reference ? (
            <Text style={styles.referenceText} numberOfLines={1}>Ref: {item.reference}</Text>
          ) : null}
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No movements found</Text>
      <Text style={styles.emptySubtitle}>Inventory movements will appear here</Text>
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
        data={movements}
        keyExtractor={(item) => item.id}
        renderItem={renderRow}
        contentContainerStyle={movements.length === 0 ? styles.listEmpty : styles.listContent}
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
    padding: 16,
    gap: 10,
  },
  listEmpty: {
    flex: 1,
  },
  row: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  productId: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  rowMiddle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 13,
    color: '#6b7280',
  },
  quantityText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationText: {
    fontSize: 13,
    color: '#6b7280',
    flex: 1,
  },
  referenceText: {
    fontSize: 12,
    color: '#9ca3af',
    maxWidth: 140,
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
