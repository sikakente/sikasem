// mobile/src/app/(app)/reports/[type].tsx
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { reportsApi } from '../../../lib/api/reports.api';
import { useReportExport } from '../../../hooks/useReportExport';

interface ReportRow {
  [key: string]: unknown;
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
    return { dateFrom: `${now.getFullYear()}-01-01`, dateTo: now.toISOString().split('T')[0] };
  }
  return {};
}

export default function ReportDetailScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const { exportReport, isExporting } = useReportExport();
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('month');

  const load = useCallback(
    async (filter: string) => {
      try {
        setLoading(true);
        setColumns([]);
        const params = getDateRange(filter);
        const res = await reportsApi.run(type, params);

        const data = (res.data as any).data.data as ReportRow[];
        setRows(data);
        if (data.length > 0) {
          setColumns(Object.keys(data[0]));
        }
      } catch {
        Alert.alert('Error', 'Could not load report data. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [type],
  );

  useEffect(() => {
    load(dateFilter);
  }, [load, dateFilter]);

  const handleExport = (format: 'csv' | 'xlsx' | 'pdf') => {
    const params = getDateRange(dateFilter);
    exportReport(type, params, format);
  };

  return (
    <View style={styles.container}>
      {/* Date filter chips */}
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

      {/* Export bar */}
      <View style={styles.exportBar}>
        <Text style={styles.exportLabel}>Export:</Text>
        {(['csv', 'xlsx', 'pdf'] as const).map((fmt) => (
          <TouchableOpacity
            key={fmt}
            style={[styles.exportBtn, isExporting && styles.exportBtnDisabled]}
            onPress={() => handleExport(fmt)}
            disabled={isExporting}
          >
            <Text style={styles.exportBtnText}>{fmt.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <ActivityIndicator style={styles.loader} color="#2563eb" />
      ) : rows.length === 0 ? (
        <Text style={styles.empty}>No data for this period</Text>
      ) : (
        <ScrollView horizontal>
          <ScrollView>
            {/* Header */}
            <View style={[styles.tableRow, styles.tableHeader]}>
              {columns.map((col) => (
                <Text key={col} style={[styles.cell, styles.headerCell]}>
                  {col}
                </Text>
              ))}
            </View>
            {/* Rows */}
            {rows.map((row, i) => (
              <View
                key={`${i}-${String(Object.values(row)[0] ?? i)}`}
                style={[styles.tableRow, i % 2 === 0 ? styles.rowEven : styles.rowOdd]}
              >
                {columns.map((col) => (
                  <Text key={col} style={styles.cell}>
                    {String(row[col] ?? '')}
                  </Text>
                ))}
              </View>
            ))}
          </ScrollView>
        </ScrollView>
      )}
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
  exportBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  exportLabel: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  exportBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#2563eb',
  },
  exportBtnDisabled: { opacity: 0.5 },
  exportBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  loader: { marginTop: 40 },
  empty: { textAlign: 'center', marginTop: 40, color: '#9ca3af' },
  tableRow: { flexDirection: 'row' },
  tableHeader: { backgroundColor: '#f3f4f6', borderBottomWidth: 1, borderBottomColor: '#d1d5db' },
  rowEven: { backgroundColor: '#fff' },
  rowOdd: { backgroundColor: '#f9fafb' },
  headerCell: { fontWeight: '700', color: '#374151' },
  cell: {
    width: 120,
    padding: 10,
    fontSize: 12,
    color: '#111827',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
});
