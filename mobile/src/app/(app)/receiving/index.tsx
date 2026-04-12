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
import { receivingApi } from '../../../lib/api/receiving.api';

interface QueueShipment {
  id: string;
  shipmentReference: string;
  carrierName: string | null;
  expectedArrivalDate: string | null;
  status: string;
  _count: { items: number };
}

interface ReceivingRecord {
  id: string;
  receivedDate: string;
  status: string;
  shipment: { id: string; shipmentReference: string; status: string };
  _count: { items: number };
}

function isOverdue(expectedDate: string | null): boolean {
  if (!expectedDate) return false;
  return new Date(expectedDate) < new Date();
}

export default function ReceivingQueueScreen() {
  const router = useRouter();
  const [queue, setQueue] = useState<QueueShipment[]>([]);
  const [recent, setRecent] = useState<ReceivingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [queueRes, recentRes] = await Promise.all([
        receivingApi.getQueue(),
        receivingApi.list({ limit: 10 }),
      ]);
      setQueue((queueRes.data as any).data ?? []);
      setRecent((recentRes.data as any).data?.data ?? []);
    } catch {
      setError('Failed to load receiving data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const renderQueueCard = ({ item }: { item: QueueShipment }) => {
    const overdue = isOverdue(item.expectedArrivalDate);
    return (
      <TouchableOpacity
        style={[styles.card, overdue && styles.cardOverdue]}
        onPress={() => router.push(`/(app)/receiving/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardRef}>{item.shipmentReference}</Text>
          {overdue && (
            <View style={styles.overdueBadge}>
              <Text style={styles.overdueBadgeText}>Overdue</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardMeta}>
          {item.carrierName ?? 'No carrier'} · {item._count.items} item
          {item._count.items !== 1 ? 's' : ''}
        </Text>
        {item.expectedArrivalDate && (
          <Text style={[styles.cardMeta, overdue && styles.cardMetaOverdue]}>
            ETA {new Date(item.expectedArrivalDate).toLocaleDateString()}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderRecentCard = ({ item }: { item: ReceivingRecord }) => (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/(app)/receiving/history`)}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardRef}>{item.shipment.shipmentReference}</Text>
        <View style={styles.completedBadge}>
          <Text style={styles.completedBadgeText}>Received</Text>
        </View>
      </View>
      <Text style={styles.cardMeta}>
        {new Date(item.receivedDate).toLocaleDateString()} · {item._count.items} item
        {item._count.items !== 1 ? 's' : ''}
      </Text>
    </TouchableOpacity>
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
        data={[]}
        keyExtractor={() => 'dummy'}
        renderItem={null}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
        }
        ListHeaderComponent={
          <>
            <Text style={styles.sectionTitle}>Pending Receipt</Text>
            {queue.length === 0 ? (
              <Text style={styles.empty}>No shipments awaiting receipt</Text>
            ) : (
              queue.map((item) => <View key={item.id}>{renderQueueCard({ item })}</View>)
            )}

            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Recent Receipts</Text>
            {recent.length === 0 ? (
              <Text style={styles.empty}>No recent receipts</Text>
            ) : (
              recent.map((item) => <View key={item.id}>{renderRecentCard({ item })}</View>)
            )}

            <TouchableOpacity
              style={styles.historyBtn}
              onPress={() => router.push('/(app)/receiving/history')}
            >
              <Text style={styles.historyBtnText}>View Full History</Text>
            </TouchableOpacity>
          </>
        }
        contentContainerStyle={styles.list}
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
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardOverdue: { borderColor: '#fca5a5', backgroundColor: '#fff7f7' },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardRef: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  cardMetaOverdue: { color: '#dc2626' },
  overdueBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  overdueBadgeText: { fontSize: 11, fontWeight: '600', color: '#dc2626' },
  completedBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  completedBadgeText: { fontSize: 11, fontWeight: '600', color: '#065f46' },
  empty: { textAlign: 'center', color: '#9ca3af', paddingVertical: 16 },
  historyBtn: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#2563eb',
    alignItems: 'center',
  },
  historyBtnText: { color: '#2563eb', fontWeight: '600', fontSize: 14 },
});
