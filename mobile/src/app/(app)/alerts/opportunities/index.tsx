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
import { opportunitiesApi, OpportunityRecord } from '../../../../lib/api/opportunities.api';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TYPE_FILTERS = [
  { label: 'All', value: undefined },
  { label: 'Restock', value: 'restock' },
  { label: 'Repricing', value: 'repricing' },
  { label: 'Supplier', value: 'supplier_switch' },
  { label: 'Consolidate', value: 'consolidate_shipment' },
];

const TYPE_ICONS: Record<string, IconName> = {
  restock: 'cube-outline',
  repricing: 'pricetag-outline',
  supplier_switch: 'swap-horizontal-outline',
  consolidate_shipment: 'git-merge-outline',
};

const TYPE_LABELS: Record<string, string> = {
  restock: 'Restock',
  repricing: 'Repricing',
  supplier_switch: 'Supplier Switch',
  consolidate_shipment: 'Consolidate Shipment',
};

function OpportunityCard({
  item,
  onPress,
}: {
  item: OpportunityRecord;
  onPress: (o: OpportunityRecord) => void;
}) {
  const icon: IconName = TYPE_ICONS[item.opportunityType] ?? 'bulb-outline';

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={22} color="#2563eb" />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {TYPE_LABELS[item.opportunityType] ?? item.opportunityType}
          </Text>
          {item.score !== null && (
            <View style={styles.priorityBadge}>
              <Text style={styles.priorityText}>{Number(item.score).toFixed(0)}</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardSummary} numberOfLines={2}>
          {item.summary}
        </Text>
        {item.recommendation && (
          <Text style={styles.cardRec} numberOfLines={1}>
            {item.recommendation}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward-outline" size={16} color="#9ca3af" />
    </TouchableOpacity>
  );
}

function OpportunitySheet({
  opp,
  onClose,
  onRefresh,
}: {
  opp: OpportunityRecord;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const action = async (status: string) => {
    setLoading(true);
    try {
      await opportunitiesApi.updateStatus(opp.id, status);
      onRefresh();
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to update opportunity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.sheet}>
      <View style={styles.sheetHandle} />
      <Text style={styles.sheetTitle}>
        {TYPE_LABELS[opp.opportunityType] ?? opp.opportunityType}
      </Text>
      <Text style={styles.sheetSummary}>{opp.summary}</Text>
      {opp.recommendation && (
        <View style={styles.sheetRecBox}>
          <Ionicons name="bulb-outline" size={16} color="#2563eb" />
          <Text style={styles.sheetRec}>{opp.recommendation}</Text>
        </View>
      )}
      <Text style={styles.sheetMeta}>
        Detected: {new Date(opp.detectedAt).toLocaleDateString()}
      </Text>

      {loading && <ActivityIndicator style={{ marginVertical: 12 }} />}

      {!loading && opp.status === 'open' && (
        <View style={styles.sheetActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={() => action('acted_on')}
          >
            <Text style={styles.actionBtnText}>Mark as Acted On</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDismiss]}
            onPress={() => action('dismissed')}
          >
            <Text style={styles.actionBtnTextDark}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
        <Text style={styles.closeBtnText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function OpportunitiesScreen() {
  const [opps, setOpps] = useState<OpportunityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [selected, setSelected] = useState<OpportunityRecord | null>(null);

  const load = useCallback(async (opportunityType?: string) => {
    try {
      const res = await opportunitiesApi.list({ opportunityType, status: 'open', limit: 50 });
      setOpps((res.data as any).data ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(typeFilter);
  }, [load, typeFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    load(typeFilter);
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
      <Text style={styles.heading}>Opportunities</Text>

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
        data={opps}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => <OpportunityCard item={item} onPress={(o) => setSelected(o)} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="bulb-outline" size={48} color="#e5e7eb" />
            <Text style={styles.emptyText}>No open opportunities</Text>
          </View>
        }
        contentContainerStyle={styles.list}
      />

      {selected && (
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetBackdrop} onPress={() => setSelected(null)} />
          <OpportunitySheet
            opp={selected}
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
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1 },
  priorityBadge: {
    backgroundColor: '#fef3c7',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  priorityText: { fontSize: 11, fontWeight: '700', color: '#d97706' },
  cardSummary: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  cardRec: { fontSize: 12, color: '#2563eb', fontStyle: 'italic' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 16, color: '#6b7280' },
  // Sheet
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
  sheetSummary: { fontSize: 14, color: '#374151', lineHeight: 20, marginBottom: 10 },
  sheetRecBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  sheetRec: { flex: 1, fontSize: 13, color: '#1d4ed8', lineHeight: 18 },
  sheetMeta: { fontSize: 12, color: '#9ca3af', marginBottom: 4 },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  actionBtnPrimary: { backgroundColor: '#2563eb' },
  actionBtnDismiss: { backgroundColor: '#f3f4f6' },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  actionBtnTextDark: { color: '#374151', fontWeight: '600', fontSize: 14 },
  closeBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 10 },
  closeBtnText: { fontSize: 14, color: '#6b7280' },
});
