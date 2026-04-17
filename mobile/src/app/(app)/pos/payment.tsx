import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { salesApi } from '../../../lib/api/sales.api';
import { fxApi } from '../../../lib/api/fx.api';
import { usePosStore } from '../../../store/pos.store';

type PaymentMethod = 'cash' | 'card' | 'mobile_money' | 'transfer';

const PAYMENT_METHODS: { label: string; value: PaymentMethod }[] = [
  { label: 'Cash', value: 'cash' },
  { label: 'Card', value: 'card' },
  { label: 'Mobile Money', value: 'mobile_money' },
  { label: 'Bank Transfer', value: 'transfer' },
];

export default function PaymentScreen() {
  const router = useRouter();
  const store = usePosStore();

  const total = store.total();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash');
  const [amount, setAmount] = useState(total.toFixed(2));
  const [paymentRef, setPaymentRef] = useState('');
  const [fxRate, setFxRate] = useState('1');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fxApi
      .getLatestRate()
      .then((res) => {
        const rate = (res.data as any).data?.exchangeRate;
        if (rate != null) setFxRate(String(rate));
      })
      .catch(() => {});
  }, []);
  const [error, setError] = useState<string | null>(null);

  const fxRateNum = parseFloat(fxRate) || 1;
  const gbpEquivalent = (total / fxRateNum).toFixed(2);

  const showRefInput = selectedMethod === 'mobile_money' || selectedMethod === 'transfer';

  const handleCompleteSale = async () => {
    setError(null);
    setLoading(true);

    const parsedRate = parseFloat(fxRate);
    if (!parsedRate || parsedRate <= 0) {
      setError('FX rate must be a positive number.');
      setLoading(false);
      return;
    }

    try {
      // TODO: get locationId from config or user session
      // The backend seeds a 'Ghana Warehouse' location; replace this placeholder with the actual seeded UUID
      const res = await salesApi.create({
        locationId: 'ghana-warehouse',
        customerId: store.customerId ?? undefined,
        fxRateAtSale: parseFloat(fxRate) || 1,
        currencyCode: 'GHS',
        items: store.cartItems.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPriceGhs: i.unitPriceGhs,
          discountAmountGhs: i.discountAmountGhs,
        })),
        payments: [
          {
            paymentMethod: selectedMethod,
            amountGhs: parseFloat(amount),
            paymentReference: paymentRef || undefined,
          },
        ],
      });

      const sale = (res.data as any).data;
      store.clearCart();
      router.replace(`/(app)/pos/receipt?saleId=${sale.id}`);
    } catch (err: any) {
      const message = err?.response?.data?.message ?? err?.message ?? 'Failed to complete sale';
      setError(typeof message === 'string' ? message : JSON.stringify(message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Payment</Text>
        </View>

        {/* Total */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Cart Total</Text>
          <Text style={styles.totalAmount}>GHS {total.toFixed(2)}</Text>
        </View>

        {/* Payment method chips */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Payment Method</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
            {PAYMENT_METHODS.map((m) => (
              <TouchableOpacity
                key={m.value}
                style={[styles.chip, selectedMethod === m.value && styles.chipActive]}
                onPress={() => setSelectedMethod(m.value)}
              >
                <Text
                  style={[styles.chipText, selectedMethod === m.value && styles.chipTextActive]}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Amount */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Amount (GHS)</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Payment reference (conditional) */}
        {showRefInput && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Payment Reference</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. transaction ID"
              placeholderTextColor="#9ca3af"
              value={paymentRef}
              onChangeText={setPaymentRef}
            />
          </View>
        )}

        {/* FX Rate */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>GBP/GHS Rate</Text>
          <TextInput
            style={styles.input}
            value={fxRate}
            onChangeText={setFxRate}
            keyboardType="numeric"
            placeholderTextColor="#9ca3af"
          />
          <Text style={styles.fxHint}>GBP equivalent: £{gbpEquivalent}</Text>
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Complete Sale button */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.completeBtn, loading && styles.completeBtnDisabled]}
            onPress={handleCompleteSale}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.completeBtnText}>Complete Sale</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  totalCard: {
    backgroundColor: '#2563eb',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  totalLabel: { fontSize: 13, color: '#bfdbfe', marginBottom: 4 },
  totalAmount: { fontSize: 32, fontWeight: '800', color: '#fff' },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsRow: { flexDirection: 'row' },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    marginRight: 8,
  },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 14, color: '#374151' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    color: '#111827',
    fontSize: 16,
  },
  fxHint: { fontSize: 13, color: '#6b7280', marginTop: 6 },
  errorBanner: {
    backgroundColor: '#fee2e2',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  errorText: { color: '#dc2626', fontSize: 13 },
  actions: { padding: 16, paddingBottom: 32 },
  completeBtn: {
    backgroundColor: '#2563eb',
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeBtnDisabled: { opacity: 0.6 },
  completeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
