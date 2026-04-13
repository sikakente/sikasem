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
import FxSummaryCard from '../../../components/FxSummaryCard';

interface FxData {
  realisedFxGainLoss: number;
  unrealisedGhsBalance: number;
  avgSaleRate: number;
  avgPurchaseRate: number;
}

export default function FxDrilldownScreen() {
  const router = useRouter();
  const [data, setData] = useState<FxData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi
      .getFx()
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>FX Impact Detail</Text>

      <FxSummaryCard
        label="Realised FX Gain / Loss"
        gainLoss={data?.realisedFxGainLoss}
        targetCurrency="GBP"
      />

      <FxSummaryCard
        label="Unrealised GHS Balance"
        sourceAmount={data?.unrealisedGhsBalance}
        sourceCurrency="GHS"
        targetCurrency="GBP"
      />

      <View style={styles.rateCard}>
        <Text style={styles.rateTitle}>Average Rates</Text>
        <View style={styles.rateRow}>
          <Text style={styles.rateLabel}>Avg Sale Rate (GBP/GHS)</Text>
          <Text style={styles.rateValue}>{data?.avgSaleRate?.toFixed(6) ?? '—'}</Text>
        </View>
        <View style={[styles.rateRow, styles.lastRow]}>
          <Text style={styles.rateLabel}>Avg Purchase Rate (GBP/GHS)</Text>
          <Text style={styles.rateValue}>{data?.avgPurchaseRate?.toFixed(6) ?? '—'}</Text>
        </View>
      </View>

      <TouchableOpacity onPress={() => router.push('/fx' as never)}>
        <Text style={styles.link}>View full FX history →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  rateCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  rateTitle: { fontSize: 13, fontWeight: '600', color: '#6b7280', marginBottom: 10 },
  rateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  lastRow: { borderBottomWidth: 0 },
  rateLabel: { fontSize: 13, color: '#374151' },
  rateValue: { fontSize: 13, fontWeight: '700', color: '#111827' },
  link: { fontSize: 14, color: '#2563eb', fontWeight: '600', marginTop: 8 },
});
