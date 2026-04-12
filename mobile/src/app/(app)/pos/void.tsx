import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { salesApi } from '../../../lib/api/sales.api';

interface SaleDetail {
  id: string;
  saleReference: string;
  totalAmountGhs: number;
  status: string;
  _count?: { items: number };
  items?: Array<{ id: string }>;
}

export default function VoidSaleScreen() {
  const { saleId } = useLocalSearchParams<{ saleId: string }>();
  const router = useRouter();

  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState('');
  const [voiding, setVoiding] = useState(false);
  const [voided, setVoided] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await salesApi.get(saleId);
      setSale((res.data as any).data);
    } catch {
      setError('Failed to load sale');
    } finally {
      setLoading(false);
    }
  }, [saleId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleVoid = () => {
    if (!reason.trim()) {
      setError('A reason is required to void this sale');
      return;
    }
    Alert.alert(
      'Void Sale',
      `Are you sure you want to void ${sale?.saleReference}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Void Sale',
          style: 'destructive',
          onPress: async () => {
            setVoiding(true);
            setError(null);
            try {
              await salesApi.void(saleId, { reason });
              setVoided(true);
            } catch (err: any) {
              const message = err?.response?.data?.message ?? err?.message ?? 'Failed to void sale';
              setError(typeof message === 'string' ? message : JSON.stringify(message));
            } finally {
              setVoiding(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 40 }} color="#2563eb" />;
  }

  if (!sale) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>{error ?? 'Sale not found'}</Text>
      </View>
    );
  }

  if (voided) {
    return (
      <View style={styles.center}>
        <Text style={styles.successIcon}>✓</Text>
        <Text style={styles.successTitle}>Sale Voided</Text>
        <Text style={styles.successSub}>{sale.saleReference} has been voided successfully</Text>
        <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
          <Text style={styles.doneBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const itemCount = sale._count?.items ?? sale.items?.length ?? 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        {/* Sale summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryRef}>{sale.saleReference}</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={styles.summaryValue}>GHS {Number(sale.totalAmountGhs).toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Items</Text>
            <Text style={styles.summaryValue}>{itemCount}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Status</Text>
            <Text style={[styles.summaryValue, { color: '#2563eb' }]}>{sale.status}</Text>
          </View>
        </View>

        {/* Warning */}
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            Voiding this sale will reverse all inventory changes. This cannot be undone.
          </Text>
        </View>

        {/* Reason input */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Reason for Void *</Text>
          <TextInput
            style={styles.reasonInput}
            placeholder="Enter reason..."
            placeholderTextColor="#9ca3af"
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.voidBtn, (voiding || !reason.trim()) && styles.voidBtnDisabled]}
            onPress={handleVoid}
            disabled={voiding || !reason.trim()}
          >
            {voiding ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.voidBtnText}>Void Sale</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  notFound: { color: '#6b7280', fontSize: 16 },
  summaryCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  summaryRef: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 14, color: '#6b7280' },
  summaryValue: { fontSize: 14, fontWeight: '500', color: '#111827' },
  warningBanner: {
    backgroundColor: '#fef3c7',
    margin: 16,
    marginBottom: 0,
    padding: 12,
    borderRadius: 8,
  },
  warningText: { color: '#92400e', fontSize: 13 },
  section: { margin: 16, marginBottom: 0 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
    color: '#111827',
    fontSize: 15,
    minHeight: 80,
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
  },
  errorText: { color: '#dc2626', fontSize: 13 },
  actions: { padding: 16, paddingBottom: 32, gap: 10 },
  voidBtn: {
    backgroundColor: '#dc2626',
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voidBtnDisabled: { opacity: 0.5 },
  voidBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: {
    height: 50,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { color: '#374151', fontSize: 16, fontWeight: '600' },
  successIcon: { fontSize: 52, color: '#10b981', marginBottom: 12 },
  successTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  successSub: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  doneBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
  },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
