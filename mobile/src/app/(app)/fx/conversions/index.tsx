import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { fxApi } from '../../../../lib/api/fx.api';

interface Conversion {
  id: string;
  conversionReference: string;
  conversionDate: string;
  sourceAmount: number;
  destinationAmount: number;
  exchangeRate: number;
  feesGbp: number | null;
}

export default function ConversionsListScreen() {
  const router = useRouter();
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [totalGbp, setTotalGbp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fxApi.listConversions({ limit: 50 });
      const data: Conversion[] = (res.data as any).data?.data ?? [];
      setConversions(data);
      setTotalGbp(data.reduce((sum, c) => sum + Number(c.destinationAmount), 0));
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const renderItem = ({ item }: { item: Conversion }) => {
    const netGbp = Number(item.destinationAmount) - Number(item.feesGbp ?? 0);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(app)/fx/conversions/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardRef}>{item.conversionReference}</Text>
          <Text style={styles.cardDate}>{new Date(item.conversionDate).toLocaleDateString()}</Text>
        </View>
        <Text style={styles.cardMeta}>
          GHS {Number(item.sourceAmount).toFixed(2)} → GBP{' '}
          {Number(item.destinationAmount).toFixed(2)} @ {Number(item.exchangeRate).toFixed(6)}
        </Text>
        {item.feesGbp != null && (
          <Text style={styles.fees}>Fees: GBP {Number(item.feesGbp).toFixed(2)}</Text>
        )}
        <Text style={styles.netGbp}>Net: GBP {netGbp.toFixed(2)}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total GBP Repatriated</Text>
        <Text style={styles.totalValue}>GBP {totalGbp.toFixed(2)}</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color="#2563eb" />
      ) : (
        <FlatList
          data={conversions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No conversions recorded</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  totalCard: {
    backgroundColor: '#1e3a8a',
    padding: 16,
    margin: 16,
    marginBottom: 8,
    borderRadius: 10,
  },
  totalLabel: { fontSize: 13, color: '#bfdbfe', marginBottom: 4 },
  totalValue: { fontSize: 24, fontWeight: '800', color: '#fff' },
  loader: { marginTop: 40 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardRef: { fontSize: 14, fontWeight: '700', color: '#111827' },
  cardDate: { fontSize: 12, color: '#6b7280' },
  cardMeta: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  fees: { fontSize: 12, color: '#9ca3af' },
  netGbp: { fontSize: 14, fontWeight: '700', color: '#2563eb', marginTop: 4 },
  empty: { textAlign: 'center', marginTop: 40, color: '#9ca3af' },
});
