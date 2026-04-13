import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { dashboardApi } from '../../../lib/api/dashboard.api';
import MiniChart from '../../../components/MiniChart';

interface MonthlyRevenue {
  month: string;
  totalGhs: number;
  totalGbpEstimate: number;
  saleCount: number;
}

export default function RevenueDrilldownScreen() {
  const [data, setData] = useState<MonthlyRevenue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi
      .getRevenue()
      .then((res) => setData(((res.data as any).data as { monthly: MonthlyRevenue[] }).monthly))
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

  const ghsValues = data.map((d) => d.totalGhs);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Revenue Trend — Last 6 Months</Text>

      <View style={styles.chartBox}>
        <MiniChart data={ghsValues} type="bar" color="#2563eb" height={80} width={320} />
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.cell, styles.headerCell]}>Month</Text>
          <Text style={[styles.cell, styles.headerCell, styles.right]}>GHS</Text>
          <Text style={[styles.cell, styles.headerCell, styles.right]}>GBP Est.</Text>
          <Text style={[styles.cell, styles.headerCell, styles.right]}>Sales</Text>
        </View>
        {data.map((row) => (
          <View key={row.month} style={styles.tableRow}>
            <Text style={styles.cell}>{row.month}</Text>
            <Text style={[styles.cell, styles.right]}>{row.totalGhs.toLocaleString()}</Text>
            <Text style={[styles.cell, styles.right]}>£{row.totalGbpEstimate.toFixed(0)}</Text>
            <Text style={[styles.cell, styles.right]}>{row.saleCount}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  chartBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  table: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  cell: { flex: 1, fontSize: 13, color: '#374151' },
  headerCell: { fontWeight: '600', color: '#6b7280', fontSize: 12 },
  right: { textAlign: 'right' },
});
