import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { fxApi } from '../../../lib/api/fx.api';

interface FxRecord {
  id: string;
  eventType: string;
  referenceType: string | null;
  referenceId: string | null;
  fromCurrency: string;
  toCurrency: string;
  exchangeRate: number;
  sourceAmount: number;
  targetAmount: number;
  eventDatetime: string;
  notes: string | null;
  sale: { id: string; totalGhs: number } | null;
}

const EVENT_TYPE_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  purchase: { bg: '#dbeafe', text: '#1e40af', label: 'Purchase' },
  sale: { bg: '#d1fae5', text: '#065f46', label: 'Sale' },
  conversion: { bg: '#fef3c7', text: '#92400e', label: 'Conversion' },
};

export default function FxEventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [record, setRecord] = useState<FxRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fxApi
      .get(id)
      .then((res) => {
        setRecord((res.data as any).data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <ActivityIndicator style={styles.loader} color="#2563eb" />;
  if (!record) return <Text style={styles.error}>FX record not found</Text>;

  const config = EVENT_TYPE_CONFIG[record.eventType] ?? {
    bg: '#f3f4f6',
    text: '#374151',
    label: record.eventType,
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={[styles.badge, { backgroundColor: config.bg }]}>
        <Text style={[styles.badgeText, { color: config.text }]}>{config.label} FX Event</Text>
      </View>

      <View style={styles.card}>
        <Row
          label="From"
          value={`${record.fromCurrency} ${Number(record.sourceAmount).toFixed(2)}`}
        />
        <Row label="To" value={`${record.toCurrency} ${Number(record.targetAmount).toFixed(2)}`} />
        <Row label="Rate" value={`${Number(record.exchangeRate).toFixed(6)} GBP/GHS`} />
        <Row label="Date" value={new Date(record.eventDatetime).toLocaleString()} />
        {record.notes && <Row label="Notes" value={record.notes} />}
      </View>

      {record.sale && (
        <TouchableOpacity
          style={styles.linkCard}
          onPress={() => router.push(`/(app)/sales/${record.sale!.id}`)}
        >
          <Text style={styles.linkLabel}>Linked Sale</Text>
          <Text style={styles.linkValue}>GHS {Number(record.sale.totalGhs).toFixed(2)} →</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  loader: { marginTop: 60 },
  error: { textAlign: 'center', marginTop: 60, color: '#9ca3af' },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  badgeText: { fontWeight: '700', fontSize: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  rowLabel: { fontSize: 13, color: '#6b7280' },
  rowValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    flexShrink: 1,
    textAlign: 'right',
  },
  linkCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkLabel: { fontSize: 13, color: '#1e40af', fontWeight: '600' },
  linkValue: { fontSize: 13, color: '#2563eb' },
});
