import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { inventoryApi } from '../../../../lib/api/inventory.api';

interface ProductBalance {
  id: string;
  productId: string;
  locationId: string;
  quantityOnHand: number;
  quantityAllocated: number;
  quantityAvailable: number;
  location?: { name: string };
}

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

export default function ProductStockScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [balances, setBalances] = useState<ProductBalance[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const [stockRes, movementsRes] = await Promise.all([
        inventoryApi.getProductStock(id),
        inventoryApi.getMovements({ productId: id }),
      ]);

      const stockData = stockRes.data as { data: ProductBalance[] } | ProductBalance[];
      if (Array.isArray(stockData)) {
        setBalances(stockData);
      } else if (stockData && Array.isArray((stockData as { data: ProductBalance[] }).data)) {
        setBalances((stockData as { data: ProductBalance[] }).data);
      } else {
        setBalances([]);
      }

      const movData = movementsRes.data as { data: InventoryMovement[] } | InventoryMovement[];
      if (Array.isArray(movData)) {
        setMovements(movData);
      } else if (movData && Array.isArray((movData as { data: InventoryMovement[] }).data)) {
        setMovements((movData as { data: InventoryMovement[] }).data);
      } else {
        setMovements([]);
      }
    } catch {
      setError('Failed to load product stock.');
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const renderBalanceCard = (balance: ProductBalance) => {
    const locationName = balance.location?.name || balance.locationId;
    const isLow = balance.quantityAvailable <= 0;

    return (
      <View key={balance.id} style={styles.balanceCard}>
        <Text style={styles.locationTitle}>{locationName}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>On Hand</Text>
            <Text style={styles.statValue}>{balance.quantityOnHand}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Allocated</Text>
            <Text style={styles.statValue}>{balance.quantityAllocated}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Available</Text>
            <Text style={[styles.statValue, isLow && styles.statValueLow]}>
              {balance.quantityAvailable}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderMovementRow = ({ item }: { item: InventoryMovement }) => {
    const color = getMovementColor(item.movementType);
    const fromName = item.fromLocation?.name || item.fromLocationId || '—';
    const toName = item.toLocation?.name || item.toLocationId || '—';
    const dateStr = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
      : 'No date';

    return (
      <View style={styles.movementRow}>
        <View style={styles.movementLeft}>
          <View style={[styles.typeBadge, { backgroundColor: color.bg }]}>
            <Text style={[styles.typeBadgeText, { color: color.text }]}>
              {item.movementType}
            </Text>
          </View>
          <View style={styles.movementMeta}>
            <Text style={styles.movementDate}>{dateStr}</Text>
            <Text style={styles.movementLocation}>
              {item.movementType?.toLowerCase() === 'transfer'
                ? `${fromName} → ${toName}`
                : item.toLocationId
                ? `To: ${toName}`
                : item.fromLocationId
                ? `From: ${fromName}`
                : '—'}
            </Text>
            {item.reference ? (
              <Text style={styles.movementRef}>Ref: {item.reference}</Text>
            ) : null}
          </View>
        </View>
        <Text style={styles.movementQty}>
          {item.quantity > 0 ? `+${item.quantity}` : item.quantity}
        </Text>
      </View>
    );
  };

  const renderEmptyMovements = () => (
    <Text style={styles.emptyMovements}>No movements recorded</Text>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
      }
    >
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Text style={styles.sectionHeading}>Stock by Location</Text>
      {balances.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No stock data found for this product</Text>
        </View>
      ) : (
        balances.map(renderBalanceCard)
      )}

      <Text style={styles.sectionHeading}>Recent Movements</Text>
      <FlatList
        data={movements}
        keyExtractor={(item) => item.id}
        renderItem={renderMovementRow}
        ListEmptyComponent={renderEmptyMovements}
        scrollEnabled={false}
        contentContainerStyle={styles.movementsList}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    marginTop: 8,
  },
  balanceCard: {
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
  locationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e5e7eb',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  statValueLow: {
    color: '#e11d48',
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  movementsList: {
    gap: 8,
  },
  movementRow: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  movementLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 12,
    gap: 10,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  movementMeta: {
    flex: 1,
  },
  movementDate: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 2,
  },
  movementLocation: {
    fontSize: 12,
    color: '#6b7280',
  },
  movementRef: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  movementQty: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  emptyMovements: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
