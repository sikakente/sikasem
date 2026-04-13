import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { dashboardApi } from '../../lib/api/dashboard.api';
import { useDashboardStore, DashboardSummary } from '../../store/dashboard.store';
import KpiCard from '../../components/KpiCard';
import RiskPanel from '../../components/RiskPanel';
import OpportunityPanel from '../../components/OpportunityPanel';

const DATE_FILTERS = [
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
  { label: 'All Time', value: 'all' },
];

function getDateRange(filter: string): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  if (filter === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      dateFrom: from.toISOString().split('T')[0],
      dateTo: now.toISOString().split('T')[0],
    };
  }
  if (filter === 'year') {
    return {
      dateFrom: `${now.getFullYear()}-01-01`,
      dateTo: now.toISOString().split('T')[0],
    };
  }
  return {};
}

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function trendDir(pct: number): 'up' | 'down' | 'neutral' {
  return pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral';
}

export default function DashboardScreen() {
  const router = useRouter();
  const { summary: cached, setSummary } = useDashboardStore();
  const [summary, setSummaryLocal] = useState<DashboardSummary | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState('month');

  const load = useCallback(
    async (filter: string, isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else if (!cached) setLoading(true);
        const params = getDateRange(filter);
        const res = await dashboardApi.getSummary(params);
        const data = (res.data as any).data as DashboardSummary;
        setSummary(data);
        setSummaryLocal(data);
      } catch {
        // silently fail — stale data stays visible
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [cached, setSummary],
  );

  useEffect(() => {
    load(dateFilter);
  }, [dateFilter]);

  const onRefresh = () => load(dateFilter, true);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const d = summary;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSubtitle}>Business performance overview</Text>
      </View>

      {/* Date Filter */}
      <View style={styles.filterRow}>
        {DATE_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.chip, dateFilter === f.value && styles.chipActive]}
            onPress={() => setDateFilter(f.value)}
          >
            <Text style={[styles.chipText, dateFilter === f.value && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Revenue + Profit */}
      <Section title="Revenue &amp; Profit">
        <View style={styles.row}>
          <View style={styles.half}>
            <KpiCard
              label="Today"
              value={`GHS ${fmt(d?.revenue.todayGhs ?? 0)}`}
              onPress={() => router.push('/dashboard/revenue' as never)}
            />
          </View>
          <View style={styles.half}>
            <KpiCard
              label="This Month"
              value={`GHS ${fmt(d?.revenue.thisMonthGhs ?? 0)}`}
              trend={trendDir(d?.revenue.monthOverMonthChange ?? 0)}
              trendPercent={d?.revenue.monthOverMonthChange}
              subValue="vs last month"
              color={
                trendDir(d?.revenue.monthOverMonthChange ?? 0) === 'up' ? 'success' : 'default'
              }
              onPress={() => router.push('/dashboard/revenue' as never)}
            />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.half}>
            <KpiCard
              label="Est. Gross Profit"
              value={`£${fmt(d?.profit.estimatedGrossProfit ?? 0)}`}
              subValue={`${fmt(d?.profit.estimatedGrossProfitMargin ?? 0, 1)}% margin`}
              color={(d?.profit.estimatedGrossProfit ?? 0) >= 0 ? 'success' : 'danger'}
            />
          </View>
          <View style={styles.half}>
            <KpiCard
              label="Est. GBP Revenue"
              value={`£${fmt(d?.revenue.thisMonthGbpEstimate ?? 0)}`}
              subValue="this month"
            />
          </View>
        </View>
      </Section>

      {/* Inventory */}
      <Section title="Inventory Health">
        <View style={styles.row}>
          <View style={styles.half}>
            <KpiCard
              label="Stock Value"
              value={`£${fmt(d?.inventory.totalStockValueGbp ?? 0)}`}
              onPress={() => router.push('/inventory' as never)}
            />
          </View>
          <View style={styles.half}>
            <KpiCard
              label="Low Stock"
              value={`${d?.inventory.lowStockCount ?? 0}`}
              subValue={`${d?.inventory.outOfStockCount ?? 0} out of stock`}
              color={
                (d?.inventory.outOfStockCount ?? 0) > 0
                  ? 'danger'
                  : (d?.inventory.lowStockCount ?? 0) > 0
                    ? 'warning'
                    : 'default'
              }
              onPress={() => router.push('/inventory' as never)}
            />
          </View>
        </View>
      </Section>

      {/* Shipments */}
      <Section title="Shipments">
        <View style={styles.row}>
          <View style={styles.half}>
            <KpiCard
              label="In Transit"
              value={`${d?.shipments.inTransitCount ?? 0}`}
              onPress={() => router.push('/dashboard/shipments' as never)}
            />
          </View>
          <View style={styles.half}>
            <KpiCard
              label="Delayed"
              value={`${d?.shipments.delayedCount ?? 0}`}
              color={(d?.shipments.delayedCount ?? 0) > 0 ? 'danger' : 'default'}
              onPress={() => router.push('/dashboard/shipments' as never)}
            />
          </View>
        </View>
        <KpiCard
          label="Avg Transit Time"
          value={`${d?.shipments.avgTransitDays ?? 0} days`}
          subValue={`Shipping cost this month: £${fmt(d?.shipments.shippingCostThisMonthGbp ?? 0)}`}
          onPress={() => router.push('/dashboard/shipments' as never)}
        />
      </Section>

      {/* FX */}
      <Section title="FX Impact">
        <KpiCard
          label="Realised FX Gain / Loss"
          value={`£${fmt(d?.fx.realisedFxGainLoss ?? 0, 2)}`}
          color={(d?.fx.realisedFxGainLoss ?? 0) >= 0 ? 'success' : 'danger'}
          subValue={`Unrealised GHS balance: ${fmt(d?.fx.unrealisedGhsBalance ?? 0)}`}
          onPress={() => router.push('/dashboard/fx' as never)}
        />
      </Section>

      {/* Top Products */}
      {(d?.topProducts.bestSelling.length ?? 0) > 0 && (
        <Section title="Best Sellers">
          {d!.topProducts.bestSelling.map((p) => (
            <View key={p.id} style={styles.productRow}>
              <Text style={styles.productName}>{p.name}</Text>
              <Text style={styles.productStat}>
                {fmt(p.totalQuantity)} units · GHS {fmt(p.totalRevenueGhs)}
              </Text>
            </View>
          ))}
          <TouchableOpacity onPress={() => router.push('/dashboard/products' as never)}>
            <Text style={styles.viewAll}>View all products →</Text>
          </TouchableOpacity>
        </Section>
      )}

      {/* Risks */}
      <Section title="Top Risks">
        <RiskPanel risks={d?.risks ?? []} onPress={() => {}} />
      </Section>

      {/* Opportunities */}
      <Section title="Opportunities">
        <OpportunityPanel opportunities={d?.opportunities ?? []} onPress={() => {}} />
      </Section>

      {/* Alerts */}
      {(d?.alerts.totalOpen ?? 0) > 0 && (
        <Section title="Active Alerts">
          <KpiCard label="Open Alerts" value={`${d?.alerts.totalOpen ?? 0}`} color="warning" />
        </Section>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 4 },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 12, fontWeight: '500', color: '#374151' },
  chipTextActive: { color: '#fff' },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  half: { flex: 1 },
  productRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  productName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  productStat: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  viewAll: { marginTop: 10, fontSize: 13, color: '#2563eb', fontWeight: '600' },
});
