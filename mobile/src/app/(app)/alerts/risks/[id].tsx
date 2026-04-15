import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { risksApi, RiskRecord } from '../../../../lib/api/risks.api';

const RISK_TYPE_LABELS: Record<string, string> = {
  stockout: 'Stockout Risk',
  shipment_delay: 'Shipment Delay Pattern',
  margin_drop: 'Margin Compression',
  supplier_concentration: 'Supplier Concentration',
  fx_loss: 'FX Loss',
};

const STATUS_OPTIONS = [
  { label: 'Open', value: 'open' },
  { label: 'Monitoring', value: 'monitoring' },
  { label: 'Closed', value: 'closed' },
];

const STATUS_COLORS: Record<string, string> = {
  open: '#ef4444',
  monitoring: '#f97316',
  closed: '#22c55e',
};

export default function RiskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [risk, setRisk] = useState<RiskRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!id) return;
    risksApi
      .get(id)
      .then((res) => setRisk((res.data as any).data ?? res.data))
      .catch(() => Alert.alert('Error', 'Failed to load risk'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusChange = async (status: string) => {
    if (!risk) return;
    setUpdating(true);
    try {
      await risksApi.updateStatus(risk.id, status);
      setRisk((prev) => (prev ? { ...prev, status } : prev));
    } catch {
      Alert.alert('Error', 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!risk) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Risk not found</Text>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[risk.status] ?? '#6b7280';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back-outline" size={20} color="#2563eb" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>
            {RISK_TYPE_LABELS[risk.riskType] ?? risk.riskType}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusColor + '20', borderColor: statusColor },
          ]}
        >
          <Text style={[styles.statusBadgeText, { color: statusColor }]}>
            {risk.status.toUpperCase()}
          </Text>
        </View>
      </View>

      {risk.score !== null && (
        <View style={styles.scoreRow}>
          <Text style={styles.scoreLabel}>Risk Score</Text>
          <Text style={styles.scoreValue}>{Number(risk.score).toFixed(0)}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Summary</Text>
        <Text style={styles.sectionText}>{risk.summary}</Text>
      </View>

      {risk.recommendation && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Recommendation</Text>
          <Text style={styles.sectionText}>{risk.recommendation}</Text>
        </View>
      )}

      {risk.relatedEntityType && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Affected Entity</Text>
          <Text style={styles.sectionText}>
            {risk.relatedEntityType}: {risk.relatedEntityId}
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Detected</Text>
        <Text style={styles.sectionText}>{new Date(risk.detectedAt).toLocaleString()}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Update Status</Text>
        {updating && <ActivityIndicator style={{ marginVertical: 8 }} />}
        {!updating && (
          <View style={styles.statusPicker}>
            {STATUS_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.statusOption,
                  risk.status === opt.value && styles.statusOptionActive,
                ]}
                onPress={() => handleStatusChange(opt.value)}
              >
                <Text
                  style={[
                    styles.statusOptionText,
                    risk.status === opt.value && styles.statusOptionTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 16, color: '#ef4444' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
  backText: { fontSize: 14, color: '#2563eb', fontWeight: '500' },
  header: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  typeBadge: {
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  typeBadgeText: { fontSize: 13, fontWeight: '600', color: '#2563eb' },
  statusBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  scoreLabel: { fontSize: 14, color: '#6b7280' },
  scoreValue: { fontSize: 24, fontWeight: '700', color: '#111827' },
  section: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sectionText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  statusPicker: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  statusOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  statusOptionActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  statusOptionText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  statusOptionTextActive: { color: '#fff', fontWeight: '600' },
});
