import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { receivingApi } from '../../../lib/api/receiving.api';
import { shipmentsApi } from '../../../lib/api/shipments.api';
import { ReceivingLineItem } from '../../../components/ReceivingLineItem';

interface ShipmentItem {
  id: string;
  quantity: number;
  product: { id: string; name: string; sku: string };
}

interface ShipmentDetail {
  id: string;
  shipmentReference: string;
  carrierName: string | null;
  expectedArrivalDate: string | null;
  status: string;
  items: ShipmentItem[];
}

interface ItemState {
  shipmentItemId: string;
  productId: string;
  productName: string;
  sku: string;
  expectedQuantity: number;
  receivedQuantity: number;
  damagedQuantity: number;
  lostQuantity: number;
}

export default function ReceiveShipmentScreen() {
  const { shipmentId } = useLocalSearchParams<{ shipmentId: string }>();
  const router = useRouter();

  const [shipment, setShipment] = useState<ShipmentDetail | null>(null);
  const [items, setItems] = useState<ItemState[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await shipmentsApi.get(shipmentId);
      const s: ShipmentDetail = (res.data as any).data;
      setShipment(s);
      setItems(
        s.items.map((si) => ({
          shipmentItemId: si.id,
          productId: si.product.id,
          productName: si.product.name,
          sku: si.product.sku,
          expectedQuantity: Number(si.quantity),
          receivedQuantity: Number(si.quantity),
          damagedQuantity: 0,
          lostQuantity: 0,
        })),
      );
    } catch {
      setError('Failed to load shipment');
    } finally {
      setLoading(false);
    }
  }, [shipmentId]);

  useEffect(() => {
    load();
  }, [load]);

  const updateItem = (
    index: number,
    field: 'receivedQuantity' | 'damagedQuantity' | 'lostQuantity',
    value: number,
  ) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const totalExpected = items.reduce((s, i) => s + i.expectedQuantity, 0);
  const totalReceived = items.reduce((s, i) => s + i.receivedQuantity, 0);
  const totalDamaged = items.reduce((s, i) => s + i.damagedQuantity, 0);
  const totalLost = items.reduce((s, i) => s + i.lostQuantity, 0);
  const hasDiscrepancy = totalReceived + totalDamaged + totalLost < totalExpected;

  const buildPayload = () => ({
    shipmentId,
    receivedDate: new Date().toISOString().split('T')[0],
    items: items.map((i) => ({
      shipmentItemId: i.shipmentItemId,
      productId: i.productId,
      receivedQuantity: i.receivedQuantity,
      damagedQuantity: i.damagedQuantity,
      lostQuantity: i.lostQuantity,
    })),
  });

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await receivingApi.create(buildPayload());
      Alert.alert('Saved', 'Progress saved. Stock not yet updated.');
    } catch {
      setError('Failed to save progress');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = () => {
    Alert.alert(
      'Confirm Receipt',
      hasDiscrepancy
        ? `There are discrepancies (${totalExpected - totalReceived - totalDamaged - totalLost} unaccounted). Confirm receipt anyway?`
        : 'Confirm receipt and update Ghana inventory?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setSubmitting(true);
            setError(null);
            try {
              // Create the record then submit it
              const created = await receivingApi.create(buildPayload());
              const recordId = (created.data as any).data?.id;
              await receivingApi.submit(recordId);
              setSubmitted(true);
            } catch {
              setError('Failed to confirm receipt');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 40 }} color="#2563eb" />;
  }

  if (!shipment) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Shipment not found</Text>
      </View>
    );
  }

  if (submitted) {
    return (
      <View style={styles.center}>
        <Text style={styles.successIcon}>✓</Text>
        <Text style={styles.successTitle}>Receipt Confirmed</Text>
        <Text style={styles.successSub}>
          Ghana inventory updated for {shipment.shipmentReference}
        </Text>
        <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace('/(app)/receiving')}>
          <Text style={styles.doneBtnText}>Back to Queue</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        {/* Shipment header */}
        <View style={styles.header}>
          <Text style={styles.reference}>{shipment.shipmentReference}</Text>
          {shipment.carrierName && <Text style={styles.meta}>{shipment.carrierName}</Text>}
          {shipment.expectedArrivalDate && (
            <Text style={styles.meta}>
              ETA {new Date(shipment.expectedArrivalDate).toLocaleDateString()}
            </Text>
          )}
        </View>

        {/* Running totals */}
        <View style={styles.totalsRow}>
          {[
            { label: 'Expected', value: totalExpected },
            { label: 'Received', value: totalReceived },
            { label: 'Damaged', value: totalDamaged },
            { label: 'Lost', value: totalLost },
          ].map((t) => (
            <View key={t.label} style={styles.totalCell}>
              <Text style={styles.totalLabel}>{t.label}</Text>
              <Text
                style={[
                  styles.totalValue,
                  t.label === 'Received' && hasDiscrepancy && styles.totalValueWarn,
                ]}
              >
                {t.value}
              </Text>
            </View>
          ))}
        </View>

        {hasDiscrepancy && (
          <View style={styles.discrepancyBanner}>
            <Text style={styles.discrepancyText}>
              ⚠ {totalExpected - totalReceived - totalDamaged - totalLost} unit
              {totalExpected - totalReceived - totalDamaged - totalLost !== 1 ? 's' : ''}{' '}
              unaccounted across all items
            </Text>
          </View>
        )}

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Line items */}
        <View style={styles.items}>
          {items.map((item, index) => (
            <ReceivingLineItem
              key={item.shipmentItemId}
              productName={item.productName}
              sku={item.sku}
              expectedQuantity={item.expectedQuantity}
              receivedQuantity={item.receivedQuantity}
              damagedQuantity={item.damagedQuantity}
              lostQuantity={item.lostQuantity}
              onChangeReceived={(v) => updateItem(index, 'receivedQuantity', v)}
              onChangeDamaged={(v) => updateItem(index, 'damagedQuantity', v)}
              onChangeLost={(v) => updateItem(index, 'lostQuantity', v)}
            />
          ))}
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.btnOutline, saving && styles.btnDisabled]}
            onPress={handleSave}
            disabled={saving || submitting}
          >
            {saving ? (
              <ActivityIndicator color="#2563eb" size="small" />
            ) : (
              <Text style={styles.btnTextBlue}>Save Progress</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary, submitting && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={saving || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnTextWhite}>Confirm Receipt</Text>
            )}
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
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  reference: { fontSize: 20, fontWeight: '700', color: '#111827' },
  meta: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  totalsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  totalCell: { flex: 1, alignItems: 'center', padding: 12 },
  totalLabel: {
    fontSize: 10,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalValue: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 2 },
  totalValueWarn: { color: '#dc2626' },
  discrepancyBanner: {
    backgroundColor: '#fef3c7',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
  },
  discrepancyText: { color: '#92400e', fontSize: 13, fontWeight: '500' },
  errorBanner: {
    backgroundColor: '#fee2e2',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  errorText: { color: '#dc2626', fontSize: 13 },
  items: { padding: 16 },
  actions: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    paddingBottom: 32,
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: { backgroundColor: '#2563eb' },
  btnOutline: { borderWidth: 1.5, borderColor: '#2563eb' },
  btnDisabled: { opacity: 0.6 },
  btnTextWhite: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnTextBlue: { color: '#2563eb', fontWeight: '700', fontSize: 15 },
  successIcon: {
    fontSize: 56,
    color: '#10b981',
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  successSub: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  doneBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
  },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
