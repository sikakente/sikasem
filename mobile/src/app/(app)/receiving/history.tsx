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
import { receivingApi } from '../../../lib/api/receiving.api';

interface ReceivingRecord {
  id: string;
  receivedDate: string;
  status: string;
  shipment: { id: string; shipmentReference: string };
  _count: { items: number };
}

export default function ReceivingHistoryScreen() {
  const [records, setRecords] = useState<ReceivingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (pageNum = 1) => {
    try {
      setError(null);
      const res = await receivingApi.list({ page: pageNum, limit: 20 });
      const body = (res.data as any).data;
      if (pageNum === 1) {
        setRecords(body?.data ?? []);
      } else {
        setRecords((prev) => [...prev, ...(body?.data ?? [])]);
      }
      setTotal(body?.total ?? 0);
    } catch {
      setError('Failed to load history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    load(1);
  };

  const onLoadMore = () => {
    if (records.length < total) {
      const next = page + 1;
      setPage(next);
      load(next);
    }
  };

  const renderItem = ({ item }: { item: ReceivingRecord }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardRef}>{item.shipment.shipmentReference}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {item.status === 'completed' ? 'Received' : 'Partial'}
          </Text>
        </View>
      </View>
      <Text style={styles.cardMeta}>
        {new Date(item.receivedDate).toLocaleDateString()} · {item._count.items} item
        {item._count.items !== 1 ? 's' : ''}
      </Text>
    </View>
  );

  if (loading) {
    return <ActivityIndicator style={styles.loader} color="#2563eb" />;
  }

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
        }
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No receiving records found</Text>}
        ListFooterComponent={
          records.length > 0 && records.length < total ? (
            <TouchableOpacity style={styles.loadMore} onPress={onLoadMore}>
              <Text style={styles.loadMoreText}>Load more</Text>
            </TouchableOpacity>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loader: { marginTop: 40 },
  list: { padding: 16 },
  errorBanner: {
    backgroundColor: '#fee2e2',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
  },
  errorText: { color: '#dc2626', fontSize: 13 },
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
  cardMeta: { fontSize: 12, color: '#6b7280' },
  badge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#065f46' },
  empty: { textAlign: 'center', marginTop: 40, color: '#9ca3af' },
  loadMore: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  loadMoreText: { color: '#2563eb', fontWeight: '600', fontSize: 14 },
});
