import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { receiptsApi } from '../../../lib/api/receipts.api';

interface ReceiptCard {
  id: string;
  receiptNumber: string;
  receiptDatetime: string;
  totalGhs: number;
  pdfUrl: string | null;
  sale: { id: string; saleReference: string } | null;
}

export default function ReceiptsScreen() {
  const [receipts, setReceipts] = useState<ReceiptCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openingPdf, setOpeningPdf] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await receiptsApi.list();
      setReceipts((res.data as any).data?.data ?? []);
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

  const handleOpenPdf = async (receipt: ReceiptCard) => {
    setOpeningPdf(receipt.id);
    try {
      const res = await receiptsApi.getPdfUrl(receipt.id);
      const url = (res.data as any).data?.url;
      if (url) await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Could not load receipt PDF.');
    } finally {
      setOpeningPdf(null);
    }
  };

  const renderItem = ({ item }: { item: ReceiptCard }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleOpenPdf(item)}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardRef}>{item.receiptNumber}</Text>
        {openingPdf === item.id ? (
          <ActivityIndicator color="#2563eb" size="small" />
        ) : (
          <Text style={styles.pdfLink}>View PDF</Text>
        )}
      </View>
      {item.sale && <Text style={styles.cardMeta}>Sale: {item.sale.saleReference}</Text>}
      <View style={styles.cardFooter}>
        <Text style={styles.cardDate}>{new Date(item.receiptDatetime).toLocaleDateString()}</Text>
        <Text style={styles.cardTotal}>GHS {Number(item.totalGhs).toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator style={styles.loader} color="#2563eb" />
      ) : (
        <FlatList
          data={receipts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No receipts found</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loader: { marginTop: 40 },
  list: { padding: 16 },
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
    alignItems: 'center',
    marginBottom: 4,
  },
  cardRef: { fontSize: 15, fontWeight: '700', color: '#111827' },
  pdfLink: { fontSize: 13, color: '#2563eb', fontWeight: '600' },
  cardMeta: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  cardDate: { fontSize: 12, color: '#6b7280' },
  cardTotal: { fontSize: 14, fontWeight: '600', color: '#111827' },
  empty: { textAlign: 'center', marginTop: 40, color: '#9ca3af' },
});
