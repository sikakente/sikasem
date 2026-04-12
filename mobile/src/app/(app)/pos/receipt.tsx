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
import { usePosStore } from '../../../store/pos.store';

interface SaleItem {
  id: string;
  quantity: number;
  unitPriceGhs: number;
  discountAmountGhs: number;
  product: { name: string; sku: string };
}

interface SalePayment {
  id: string;
  paymentMethod: string;
  amountGhs: number;
}

interface SaleDetail {
  id: string;
  saleReference: string;
  saleDate: string;
  status: string;
  totalAmountGhs: number;
  fxRateAtSale: number | null;
  items: SaleItem[];
  payments: SalePayment[];
}

export default function ReceiptScreen() {
  const { saleId } = useLocalSearchParams<{ saleId?: string }>();
  const router = useRouter();
  const clearCart = usePosStore((s) => s.clearCart);

  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!saleId) {
      setError('No sale ID provided');
      setLoading(false);
      return;
    }
    try {
      const res = await salesApi.get(saleId);
      setSale((res.data as any).data);
    } catch {
      setError('Failed to load receipt');
    } finally {
      setLoading(false);
    }
  }, [saleId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleNewSale = () => {
    clearCart();
    router.replace('/(app)/pos');
  };

  const handleViewHistory = () => {
    router.push('/(app)/sales');
  };

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 40 }} color="#2563eb" />;
  }

  if (error || !sale) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'Receipt not found'}</Text>
        <TouchableOpacity style={styles.newSaleBtn} onPress={handleNewSale}>
          <Text style={styles.newSaleBtnText}>New Sale</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const subtotal = sale.items.reduce(
    (sum, i) => sum + Number(i.unitPriceGhs) * Number(i.quantity),
    0,
  );
  const discounts = sale.items.reduce((sum, i) => sum + Number(i.discountAmountGhs), 0);
  const fxRate = sale.fxRateAtSale ? Number(sale.fxRateAtSale) : 1;
  const totalGbp = (Number(sale.totalAmountGhs) / fxRate).toFixed(2);

  return (
    <ScrollView style={styles.container}>
      {/* Success header */}
      <View style={styles.successHeader}>
        <Text style={styles.successIcon}>✓</Text>
        <Text style={styles.successTitle}>Sale Complete</Text>
        <Text style={styles.saleRef}>{sale.saleReference}</Text>
        <Text style={styles.saleDate}>{new Date(sale.saleDate).toLocaleString()}</Text>
      </View>

      {/* Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Items</Text>
        {sale.items.map((item) => {
          const lineTotal =
            Number(item.unitPriceGhs) * Number(item.quantity) - Number(item.discountAmountGhs);
          return (
            <View key={item.id} style={styles.lineRow}>
              <View style={styles.lineInfo}>
                <Text style={styles.lineItemName}>{item.product.name}</Text>
                <Text style={styles.lineItemSub}>
                  {item.product.sku} · x{Number(item.quantity)} @ GHS{' '}
                  {Number(item.unitPriceGhs).toFixed(2)}
                </Text>
                {Number(item.discountAmountGhs) > 0 && (
                  <Text style={styles.lineDiscount}>
                    Discount -GHS {Number(item.discountAmountGhs).toFixed(2)}
                  </Text>
                )}
              </View>
              <Text style={styles.lineTotal}>GHS {lineTotal.toFixed(2)}</Text>
            </View>
          );
        })}
      </View>

      {/* Totals */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Totals</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>GHS {subtotal.toFixed(2)}</Text>
          </View>
          {discounts > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discounts</Text>
              <Text style={[styles.summaryValue, { color: '#dc2626' }]}>
                -GHS {discounts.toFixed(2)}
              </Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.summaryRowTotal]}>
            <Text style={styles.summaryLabelTotal}>Total</Text>
            <Text style={styles.summaryValueTotal}>
              GHS {Number(sale.totalAmountGhs).toFixed(2)}
            </Text>
          </View>
          {sale.fxRateAtSale && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>GBP Equivalent</Text>
              <Text style={styles.summaryValue}>£{totalGbp}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Payments */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment</Text>
        {sale.payments.map((p) => (
          <View key={p.id} style={styles.paymentRow}>
            <Text style={styles.paymentMethod}>
              {p.paymentMethod.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </Text>
            <Text style={styles.paymentAmount}>GHS {Number(p.amountGhs).toFixed(2)}</Text>
          </View>
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleNewSale}>
          <Text style={styles.primaryBtnText}>New Sale</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.outlineBtn} onPress={handleViewHistory}>
          <Text style={styles.outlineBtnText}>View History</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: '#dc2626', fontSize: 15, marginBottom: 16 },
  successHeader: {
    backgroundColor: '#fff',
    alignItems: 'center',
    padding: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  successIcon: { fontSize: 52, color: '#10b981', marginBottom: 8 },
  successTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 6 },
  saleRef: { fontSize: 16, fontWeight: '600', color: '#2563eb', marginBottom: 4 },
  saleDate: { fontSize: 13, color: '#6b7280' },
  section: { margin: 16, marginBottom: 0 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  lineInfo: { flex: 1 },
  lineItemName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  lineItemSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  lineDiscount: { fontSize: 12, color: '#dc2626', marginTop: 2 },
  lineTotal: { fontSize: 14, fontWeight: '700', color: '#111827', marginLeft: 12 },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryRowTotal: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 4,
  },
  summaryLabel: { fontSize: 14, color: '#374151' },
  summaryValue: { fontSize: 14, color: '#111827', fontWeight: '500' },
  summaryLabelTotal: { fontSize: 16, fontWeight: '700', color: '#111827' },
  summaryValueTotal: { fontSize: 16, fontWeight: '700', color: '#111827' },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  paymentMethod: { fontSize: 14, color: '#374151' },
  paymentAmount: { fontSize: 14, fontWeight: '600', color: '#111827' },
  actions: { padding: 16, paddingBottom: 32, gap: 10 },
  primaryBtn: {
    backgroundColor: '#2563eb',
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  outlineBtn: {
    height: 50,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: { color: '#2563eb', fontSize: 16, fontWeight: '600' },
  newSaleBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  newSaleBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
