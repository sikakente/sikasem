import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { fxApi } from '../../../lib/api/fx.api';
import FxSummaryCard from '../../../components/FxSummaryCard';

interface FxSummary {
  purchaseFx: { totalGbpSpent: number; totalGhsEquivalent: number; avgRate: number };
  saleFx: { totalGhsSales: number; totalExpectedGbp: number; avgRate: number };
  conversionFx: {
    totalGhsConverted: number;
    totalGbpReceived: number;
    avgRate: number;
    fees: number;
  };
  realisedFxGainLoss: number;
  unrealisedGhsBalance: number;
  periodBreakdown: { month: string; gainLoss: number }[];
}

const DATE_FILTERS = [
  { label: 'This month', value: 'month' },
  { label: 'This year', value: 'year' },
  { label: 'All time', value: 'all' },
];

function getDateRange(filter: string): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  if (filter === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { dateFrom: from.toISOString().split('T')[0], dateTo: now.toISOString().split('T')[0] };
  }
  if (filter === 'year') {
    return {
      dateFrom: `${now.getFullYear()}-01-01`,
      dateTo: now.toISOString().split('T')[0],
    };
  }
  return {};
}

export default function FxOverviewScreen() {
  const router = useRouter();
  const [summary, setSummary] = useState<FxSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('month');

  const load = useCallback(async (filter: string) => {
    try {
      setLoading(true);
      const params = getDateRange(filter);
      const res = await fxApi.getSummary(params);
      setSummary((res.data as any).data);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(dateFilter);
  }, [load, dateFilter]);

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {DATE_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, dateFilter === f.value && styles.filterChipActive]}
            onPress={() => setDateFilter(f.value)}
          >
            <Text
              style={[styles.filterChipText, dateFilter === f.value && styles.filterChipTextActive]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color="#2563eb" />
      ) : !summary ? (
        <Text style={styles.empty}>No FX data available</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <FxSummaryCard
            label="Purchase FX (GBP → GHS)"
            rate={summary.purchaseFx.avgRate}
            sourceAmount={summary.purchaseFx.totalGbpSpent}
            targetAmount={summary.purchaseFx.totalGhsEquivalent}
            sourceCurrency="GBP"
            targetCurrency="GHS"
          />
          <FxSummaryCard
            label="Sale FX (GHS → GBP)"
            rate={summary.saleFx.avgRate}
            sourceAmount={summary.saleFx.totalGhsSales}
            targetAmount={summary.saleFx.totalExpectedGbp}
            sourceCurrency="GHS"
            targetCurrency="GBP"
          />
          <FxSummaryCard
            label="Conversion FX (GHS → GBP)"
            rate={summary.conversionFx.avgRate}
            sourceAmount={summary.conversionFx.totalGhsConverted}
            targetAmount={summary.conversionFx.totalGbpReceived}
            sourceCurrency="GHS"
            targetCurrency="GBP"
          />

          <View style={styles.outcomeCard}>
            <Text style={styles.outcomeLabel}>Realised GBP Outcome</Text>
            <Text
              style={[
                styles.outcomeValue,
                summary.realisedFxGainLoss >= 0 ? styles.gain : styles.loss,
              ]}
            >
              {summary.realisedFxGainLoss >= 0 ? '+' : ''}
              {summary.realisedFxGainLoss.toFixed(2)} GBP
            </Text>
            <Text style={styles.outcomeHint}>Actual GBP received vs expected from sales</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Unrealised GHS Balance</Text>
            <Text style={styles.cardValue}>GHS {summary.unrealisedGhsBalance.toFixed(2)}</Text>
            <Text style={styles.cardHint}>GHS sales not yet converted to GBP</Text>
          </View>

          <TouchableOpacity
            style={styles.conversionsLink}
            onPress={() => router.push('/(app)/fx/conversions')}
          >
            <Text style={styles.conversionsLinkText}>View Cash Conversions →</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/(app)/fx/conversion/new')}>
        <Text style={styles.fabText}>+ Record Conversion</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  filterRow: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  filterChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filterChipText: { fontSize: 13, color: '#374151' },
  filterChipTextActive: { color: '#fff' },
  loader: { marginTop: 40 },
  empty: { textAlign: 'center', marginTop: 40, color: '#9ca3af' },
  content: { padding: 16, paddingBottom: 100 },
  outcomeCard: {
    backgroundColor: '#1e3a8a',
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
  },
  outcomeLabel: { fontSize: 13, color: '#bfdbfe', marginBottom: 4 },
  outcomeValue: { fontSize: 28, fontWeight: '800', marginBottom: 2 },
  outcomeHint: { fontSize: 12, color: '#93c5fd' },
  gain: { color: '#86efac' },
  loss: { color: '#fca5a5' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardLabel: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  cardValue: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 2 },
  cardHint: { fontSize: 12, color: '#9ca3af' },
  conversionsLink: { padding: 4, marginBottom: 8 },
  conversionsLinkText: { color: '#2563eb', fontWeight: '600' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#2563eb',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
