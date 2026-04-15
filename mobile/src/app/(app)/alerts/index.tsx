import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { alertsApi, Alert as AlertRecord } from '../../../lib/api/alerts.api';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const SEVERITY_FILTERS = [
  { label: 'All', value: undefined },
  { label: 'Critical', value: 'critical' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
];

const TYPE_FILTERS = [
  { label: 'All Types', value: undefined },
  { label: 'Low Stock', value: 'low_stock' },
  { label: 'Delay', value: 'delay' },
  { label: 'FX Loss', value: 'fx_loss' },
  { label: 'Expiry', value: 'expiry_risk' },
];

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

const ALERT_TYPE_ICONS: Record<string, IconName> = {
  low_stock: 'warning-outline',
  delay: 'time-outline',
  fx_loss: 'trending-down-outline',
  expiry_risk: 'calendar-outline',
  cost_spike: 'arrow-up-outline',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function AlertCard({ item, onPress }: { item: AlertRecord; onPress: (a: AlertRecord) => void }) {
  const color = SEVERITY_COLORS[item.severity] ?? '#6b7280';
  const icon: IconName = ALERT_TYPE_ICONS[item.alertType] ?? 'alert-circle-outline';

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)}>
      <View style={[styles.severityBar, { backgroundColor: color }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIconWrap}>
            <Ionicons name={icon} size={18} color={color} />
          </View>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.severityBadge, { color, borderColor: color }]}>
            {item.severity.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.cardMessage} numberOfLines={2}>
          {item.message}
        </Text>
        <View style={styles.cardFooter}>
          <Text style={styles.timeAgo}>{timeAgo(item.createdAt)}</Text>
          <Text style={[styles.statusChip, item.status !== 'open' && styles.statusChipInactive]}>
            {item.status}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function AlertDetailSheet({
  alert: a,
  onClose,
  onRefresh,
}: {
  alert: AlertRecord;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const action = async (fn: () => Promise<unknown>, label: string) => {
    setLoading(true);
    try {
      await fn();
      onRefresh();
      onClose();
    } catch {
      Alert.alert('Error', `Failed to ${label}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.sheet}>
      <View style={styles.sheetHandle} />
      <Text style={styles.sheetTitle}>{a.title}</Text>
      <Text style={styles.sheetMessage}>{a.message}</Text>
      {a.relatedEntityType && (
        <Text style={styles.sheetMeta}>
          Entity: {a.relatedEntityType} · {a.relatedEntityId}
        </Text>
      )}
      <Text style={styles.sheetMeta}>Created: {new Date(a.createdAt).toLocaleString()}</Text>

      {loading && <ActivityIndicator style={{ marginVertical: 12 }} />}

      {!loading && a.status === 'open' && (
        <View style={styles.sheetActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnAck]}
            onPress={() => action(() => alertsApi.acknowledge(a.id), 'acknowledge')}
          >
            <Text style={styles.actionBtnText}>Acknowledge</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnResolve]}
            onPress={() => action(() => alertsApi.resolve(a.id), 'resolve')}
          >
            <Text style={styles.actionBtnText}>Resolve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDismiss]}
            onPress={() => action(() => alertsApi.dismiss(a.id), 'dismiss')}
          >
            <Text style={styles.actionBtnTextDark}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && a.status === 'acknowledged' && (
        <View style={styles.sheetActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnResolve]}
            onPress={() => action(() => alertsApi.resolve(a.id), 'resolve')}
          >
            <Text style={styles.actionBtnText}>Resolve</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
        <Text style={styles.closeBtnText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [selected, setSelected] = useState<AlertRecord | null>(null);

  const load = useCallback(async (severity?: string, alertType?: string) => {
    try {
      const res = await alertsApi.list({ severity, alertType, status: 'open', limit: 50 });
      setAlerts((res.data as any).data ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(severityFilter, typeFilter);
  }, [load, severityFilter, typeFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    load(severityFilter, typeFilter);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Alerts</Text>

      {/* Severity filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        {SEVERITY_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.label}
            style={[styles.chip, severityFilter === f.value && styles.chipActive]}
            onPress={() => setSeverityFilter(f.value)}
          >
            <Text style={[styles.chipText, severityFilter === f.value && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Type filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        {TYPE_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.label}
            style={[styles.chip, typeFilter === f.value && styles.chipActive]}
            onPress={() => setTypeFilter(f.value)}
          >
            <Text style={[styles.chipText, typeFilter === f.value && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => <AlertCard item={item} onPress={(a) => setSelected(a)} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#22c55e" />
            <Text style={styles.emptyText}>No open alerts</Text>
          </View>
        }
        contentContainerStyle={styles.list}
      />

      {selected && (
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetBackdrop} onPress={() => setSelected(null)} />
          <AlertDetailSheet
            alert={selected}
            onClose={() => setSelected(null)}
            onRefresh={onRefresh}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 22, fontWeight: '700', color: '#111827', padding: 16, paddingBottom: 8 },
  filterRow: { maxHeight: 44 },
  filterContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 13, color: '#374151' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  list: { padding: 12, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  severityBar: { width: 4 },
  cardContent: { flex: 1, padding: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: '#111827' },
  severityBadge: {
    fontSize: 10,
    fontWeight: '700',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  cardMessage: { fontSize: 13, color: '#6b7280', marginBottom: 6 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeAgo: { fontSize: 12, color: '#9ca3af' },
  statusChip: { fontSize: 11, color: '#ef4444', fontWeight: '600', textTransform: 'uppercase' },
  statusChipInactive: { color: '#6b7280' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 16, color: '#6b7280' },
  // Sheet styles
  sheetOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 8 },
  sheetMessage: { fontSize: 14, color: '#374151', lineHeight: 20, marginBottom: 10 },
  sheetMeta: { fontSize: 12, color: '#9ca3af', marginBottom: 4 },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  actionBtnAck: { backgroundColor: '#2563eb' },
  actionBtnResolve: { backgroundColor: '#16a34a' },
  actionBtnDismiss: { backgroundColor: '#f3f4f6' },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  actionBtnTextDark: { color: '#374151', fontWeight: '600', fontSize: 14 },
  closeBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 10 },
  closeBtnText: { fontSize: 14, color: '#6b7280' },
});
