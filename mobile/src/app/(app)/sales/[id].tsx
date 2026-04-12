import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { salesApi } from '../../../lib/api/sales.api';

interface SaleDetail {
  id: string;
  saleReference: string;
  saleDatetime: string;
  status: string;
  totalGhs: number;
  subtotalGhs: number;
  discountTotalGhs: number;
  currencyCode: string;
  customer: { id: string; fullName: string } | null;
  items: Array<{
    id: string;
    quantity: number;
    unitPriceGhs: number;
    discountAmountGhs: number;
    lineTotalGhs: number;
    product: { id: string; name: string; sku: string };
  }>;
  payments: Array<{
    id: string;
    paymentMethod: string;
    amountGhs: number;
    paymentReference: string | null;
  }>;
  fxRecords: Array<{ exchangeRate: number; toCurrency: string }>;
  receipts: Array<{ id: string; receiptNumber: string; pdfUrl: string | null }>;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  completed: { bg: '#d1fae5', text: '#065f46', label: 'Completed' },
  voided: { bg: '#fee2e2', text: '#991b1b', label: 'Voided' },
};

export default function SaleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await salesApi.get(id);
      setSale((res.data as any).data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 40 }} color="#2563eb" />;
  }

  if (!sale) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Sale not found</Text>
      </View>
    );
  }

  const statusConfig = STATUS_CONFIG[sale.status] ?? {
    bg: '#f3f4f6',
    text: '#374151',
    label: sale.status,
  };
  const fxRate = sale.fxRecords[0]?.exchangeRate ?? null;

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.reference}>{sale.saleReference}</Text>
          <View style={[styles.badge, { backgroundColor: statusConfig.bg }]}>
            <Text style={[styles.badgeText, { color: statusConfig.text }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>
        <Text style={styles.meta}>{new Date(sale.saleDatetime).toLocaleString()}</Text>
        {sale.customer && <Text style={styles.meta}>Customer: {sale.customer.fullName}</Text>}
      </View>

      {/* Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Items</Text>
        {sale.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.product.name}</Text>
              <Text style={styles.itemSku}>{item.product.sku}</Text>
            </View>
            <Text style={styles.itemQty}>{Number(item.quantity)}×</Text>
            <Text style={styles.itemPrice}>GHS {Number(item.lineTotalGhs).toFixed(2)}</Text>
          </View>
        ))}
      </View>

      {/* Totals */}
      <View style={styles.section}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>GHS {Number(sale.subtotalGhs).toFixed(2)}</Text>
        </View>
        {Number(sale.discountTotalGhs) > 0 && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Discounts</Text>
            <Text style={[styles.totalValue, { color: '#10b981' }]}>
              − GHS {Number(sale.discountTotalGhs).toFixed(2)}
            </Text>
          </View>
        )}
        <View style={[styles.totalRow, styles.totalRowBold]}>
          <Text style={styles.totalLabelBold}>Total</Text>
          <Text style={styles.totalValueBold}>GHS {Number(sale.totalGhs).toFixed(2)}</Text>
        </View>
        {fxRate && (
          <Text style={styles.fxNote}>
            ≈ GBP {(Number(sale.totalGhs) / Number(fxRate)).toFixed(2)} at{' '}
            {Number(fxRate).toFixed(4)} GHS/GBP
          </Text>
        )}
      </View>

      {/* Payments */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payments</Text>
        {sale.payments.map((p) => (
          <View key={p.id} style={styles.paymentRow}>
            <Text style={styles.paymentMethod}>{p.paymentMethod.replace('_', ' ')}</Text>
            <Text style={styles.paymentAmount}>GHS {Number(p.amountGhs).toFixed(2)}</Text>
          </View>
        ))}
      </View>

      {/* Actions */}
      {sale.status === 'completed' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.voidBtn}
            onPress={() => router.push(`/(app)/pos/void?saleId=${sale.id}`)}
          >
            <Text style={styles.voidBtnText}>Void Sale</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { color: '#6b7280', fontSize: 16 },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reference: { fontSize: 20, fontWeight: '700', color: '#111827' },
  meta: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  section: {
    backgroundColor: '#fff',
    margin: 12,
    marginBottom: 0,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemName: { fontSize: 14, color: '#111827', fontWeight: '500' },
  itemSku: { fontSize: 11, color: '#9ca3af' },
  itemQty: { fontSize: 13, color: '#6b7280', marginRight: 8, width: 32, textAlign: 'right' },
  itemPrice: { fontSize: 14, fontWeight: '600', color: '#111827', width: 90, textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalRowBold: { borderTopWidth: 1, borderTopColor: '#e5e7eb', marginTop: 4, paddingTop: 8 },
  totalLabel: { fontSize: 14, color: '#6b7280' },
  totalValue: { fontSize: 14, color: '#374151' },
  totalLabelBold: { fontSize: 15, fontWeight: '700', color: '#111827' },
  totalValueBold: { fontSize: 15, fontWeight: '700', color: '#111827' },
  fxNote: { fontSize: 11, color: '#9ca3af', marginTop: 4, textAlign: 'right' },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  paymentMethod: { fontSize: 14, color: '#374151', textTransform: 'capitalize' },
  paymentAmount: { fontSize: 14, fontWeight: '600', color: '#111827' },
  actions: { padding: 16, paddingBottom: 32 },
  voidBtn: {
    borderWidth: 1.5,
    borderColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  voidBtnText: { color: '#dc2626', fontWeight: '700', fontSize: 15 },
});
