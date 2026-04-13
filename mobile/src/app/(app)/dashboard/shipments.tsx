import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { dashboardApi } from '../../../lib/api/dashboard.api';

interface DelayedShipment {
  id: string;
  shipmentReference: string;
  expectedArrivalDate: string;
  carrierName: string | null;
  status: string;
}

interface StatusBreakdown {
  status: string;
  _count: { id: number };
}

interface ShipmentDrilldown {
  statusBreakdown: StatusBreakdown[];
  delayedShipments: DelayedShipment[];
  transitTimes: { days: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#9ca3af',
  packed: '#60a5fa',
  in_transit: '#f59e0b',
  received: '#22c55e',
  delayed: '#dc2626',
};

export default function ShipmentsDrilldownScreen() {
  const router = useRouter();
  const [data, setData] = useState<ShipmentDrilldown | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi
      .getShipments()
      .then((res) => setData((res.data as any).data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const avgTransit =
    data && data.transitTimes.length > 0
      ? Math.round(data.transitTimes.reduce((s, t) => s + t.days, 0) / data.transitTimes.length)
      : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Shipment Status</Text>

      <View style={styles.card}>
        {data?.statusBreakdown.map((s) => (
          <View key={s.status} style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: STATUS_COLORS[s.status] ?? '#9ca3af' }]} />
            <Text style={styles.statusLabel}>{s.status.replace('_', ' ')}</Text>
            <Text style={styles.statusCount}>{s._count.id}</Text>
          </View>
        ))}
        <View style={styles.divider} />
        <Text style={styles.avgTransit}>Avg transit time: {avgTransit} days</Text>
      </View>

      {(data?.delayedShipments.length ?? 0) > 0 && (
        <>
          <Text style={styles.subheading}>Delayed Shipments</Text>
          {data!.delayedShipments.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={styles.shipmentCard}
              onPress={() => router.push(`/shipments/${s.id}` as never)}
            >
              <Text style={styles.shipRef}>{s.shipmentReference}</Text>
              <Text style={styles.shipDetail}>
                Expected: {new Date(s.expectedArrivalDate).toLocaleDateString()}
                {s.carrierName ? ` · ${s.carrierName}` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  subheading: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 20,
    marginBottom: 10,
  },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { flex: 1, fontSize: 13, color: '#374151', textTransform: 'capitalize' },
  statusCount: { fontSize: 14, fontWeight: '700', color: '#111827' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 8 },
  avgTransit: { fontSize: 13, color: '#6b7280' },
  shipmentCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  shipRef: { fontSize: 13, fontWeight: '700', color: '#111827' },
  shipDetail: { fontSize: 12, color: '#6b7280', marginTop: 4 },
});
