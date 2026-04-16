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
import { Ionicons } from '@expo/vector-icons';
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

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        {icon && (
          <View style={styles.sectionIconWrap}>
            <Ionicons name={icon} size={14} color="#3B82F6" />
          </View>
        )}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
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
      <Section title="Revenue & Profit" icon="cash-outline">
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
      <Section title="Inventory Health" icon="layers-outline">
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
      <Section title="Shipments" icon="airplane-outline">
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
      <Section title="FX Impact" icon="swap-horizontal-outline">
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
        <Section title="Best Sellers" icon="star-outline">
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
      <Section title="Top Risks" icon="warning-outline">
        <RiskPanel risks={d?.risks ?? []} onPress={() => {}} />
      </Section>

      {/* Opportunities */}
      <Section title="Opportunities" icon="bulb-outline">
        <OpportunityPanel opportunities={d?.opportunities ?? []} onPress={() => {}} />
      </Section>

      {/* Alerts */}
      {(d?.alerts.totalOpen ?? 0) > 0 && (
        <Section title="Active Alerts" icon="notifications-outline">
          <KpiCard label="Open Alerts" value={`${d?.alerts.totalOpen ?? 0}`} color="warning" />
        </Section>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 48 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },

  // Date filter chips
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: { backgroundColor: '#1E40AF', borderColor: '#1E40AF' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  chipTextActive: { color: '#FFFFFF' },

  // Sections
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // KPI grid
  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  half: { flex: 1 },

  // Product list
  productRow: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  productName: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  productStat: { fontSize: 12, color: '#64748B', marginTop: 2 },
  viewAll: {
    marginTop: 12,
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '700',
    textAlign: 'right',
  },
});
