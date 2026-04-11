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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { shipmentsApi } from '../../../lib/api/shipments.api';
import { ShipmentStatusBadge } from '../../../components/ShipmentStatusBadge';

type Tab = 'items' | 'costs' | 'timeline';

interface ShipmentDetail {
  id: string;
  shipmentReference: string;
  shipmentName: string | null;
  carrierName: string | null;
  trackingNumber: string | null;
  status: string;
  packedDate: string | null;
  dispatchDate: string | null;
  expectedArrivalDate: string | null;
  actualArrivalDate: string | null;
  notes: string | null;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    product: { name: string; sku: string };
  }>;
  costs: Array<{
    id: string;
    costType: string;
    amountGbp: number;
    description: string | null;
    vendorName: string | null;
    costDate: string;
  }>;
  statusHistory: Array<{
    id: string;
    status: string;
    statusTimestamp: string;
    notes: string | null;
  }>;
}

export default function ShipmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [shipment, setShipment] = useState<ShipmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('items');
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await shipmentsApi.get(id);
      setShipment((res.data as any).data);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDispatch = () => {
    Alert.alert('Dispatch Shipment', 'Mark this shipment as dispatched?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Dispatch',
        onPress: async () => {
          setActionLoading(true);
          try {
            await shipmentsApi.dispatch(id);
            await load();
          } catch {
            Alert.alert('Error', 'Failed to dispatch shipment.');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
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

  const canDispatch = shipment.status === 'draft' || shipment.status === 'packed';
  const canAddCosts = !['cancelled', 'closed'].includes(shipment.status);

  const totalCosts = shipment.costs.reduce((sum, c) => sum + Number(c.amountGbp), 0);

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.reference}>{shipment.shipmentReference}</Text>
          <ShipmentStatusBadge status={shipment.status} />
        </View>
        {shipment.shipmentName && <Text style={styles.name}>{shipment.shipmentName}</Text>}
        {shipment.carrierName && (
          <Text style={styles.meta}>
            {shipment.carrierName}
            {shipment.trackingNumber ? ` · ${shipment.trackingNumber}` : ''}
          </Text>
        )}
      </View>

      {/* Dates */}
      <View style={styles.datesRow}>
        {[
          { label: 'Packed', value: shipment.packedDate },
          { label: 'Dispatched', value: shipment.dispatchDate },
          { label: 'Expected', value: shipment.expectedArrivalDate },
          { label: 'Arrived', value: shipment.actualArrivalDate },
        ].map((d) => (
          <View key={d.label} style={styles.dateCell}>
            <Text style={styles.dateCellLabel}>{d.label}</Text>
            <Text style={styles.dateCellValue}>
              {d.value
                ? new Date(d.value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                : '—'}
            </Text>
          </View>
        ))}
      </View>

      {/* Quick action bar */}
      <View style={styles.actions}>
        {canDispatch && (
          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.actionBtnPrimary,
              actionLoading && styles.actionBtnDisabled,
            ]}
            onPress={handleDispatch}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.actionBtnTextWhite}>Mark Dispatched</Text>
            )}
          </TouchableOpacity>
        )}
        {canAddCosts && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnOutline]}
            onPress={() => router.push(`/(app)/shipments/${id}/costs`)}
          >
            <Text style={styles.actionBtnTextBlue}>Add Costs</Text>
          </TouchableOpacity>
        )}
        {shipment.status === 'dispatched' && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnOutline]}
            onPress={() => router.push(`/(app)/shipments/${id}/status`)}
          >
            <Text style={styles.actionBtnTextBlue}>Update Status</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['items', 'costs', 'timeline'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Items tab */}
      {activeTab === 'items' && (
        <View style={styles.tabContent}>
          {shipment.items.length === 0 ? (
            <Text style={styles.empty}>No items</Text>
          ) : (
            shipment.items.map((item) => (
              <View key={item.id} style={styles.listRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listRowPrimary}>{item.product.name}</Text>
                  <Text style={styles.listRowSub}>{item.product.sku}</Text>
                </View>
                <Text style={styles.listRowRight}>×{Number(item.quantity)}</Text>
              </View>
            ))
          )}
        </View>
      )}

      {/* Costs tab */}
      {activeTab === 'costs' && (
        <View style={styles.tabContent}>
          {shipment.costs.length === 0 ? (
            <Text style={styles.empty}>No costs recorded</Text>
          ) : (
            shipment.costs.map((cost) => (
              <View key={cost.id} style={styles.listRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listRowPrimary}>{cost.costType}</Text>
                  {cost.vendorName && <Text style={styles.listRowSub}>{cost.vendorName}</Text>}
                  {cost.description && <Text style={styles.listRowSub}>{cost.description}</Text>}
                </View>
                <Text style={styles.listRowRight}>£{Number(cost.amountGbp).toFixed(2)}</Text>
              </View>
            ))
          )}
          {shipment.costs.length > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>£{totalCosts.toFixed(2)}</Text>
            </View>
          )}
        </View>
      )}

      {/* Timeline tab */}
      {activeTab === 'timeline' && (
        <View style={styles.tabContent}>
          {shipment.statusHistory.length === 0 ? (
            <Text style={styles.empty}>No history</Text>
          ) : (
            shipment.statusHistory.map((entry) => (
              <View key={entry.id} style={styles.timelineRow}>
                <ShipmentStatusBadge status={entry.status} />
                <Text style={styles.timelineDate}>
                  {new Date(entry.statusTimestamp).toLocaleString()}
                </Text>
                {entry.notes && <Text style={styles.timelineNotes}>{entry.notes}</Text>}
              </View>
            ))
          )}
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
    marginBottom: 6,
  },
  reference: { fontSize: 20, fontWeight: '700', color: '#111827' },
  name: { fontSize: 14, color: '#374151', marginBottom: 4 },
  meta: { fontSize: 13, color: '#6b7280' },
  datesRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dateCell: { flex: 1, alignItems: 'center', padding: 12 },
  dateCellLabel: { fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 },
  dateCellValue: { fontSize: 13, fontWeight: '600', color: '#111827', marginTop: 2 },
  actions: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  actionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPrimary: { backgroundColor: '#2563eb' },
  actionBtnOutline: { borderWidth: 1.5, borderColor: '#2563eb' },
  actionBtnDisabled: { opacity: 0.6 },
  actionBtnTextWhite: { color: '#fff', fontWeight: '600', fontSize: 14 },
  actionBtnTextBlue: { color: '#2563eb', fontWeight: '600', fontSize: 14 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#2563eb' },
  tabText: { fontSize: 14, color: '#6b7280' },
  tabTextActive: { color: '#2563eb', fontWeight: '600' },
  tabContent: { padding: 16 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  listRowPrimary: { fontSize: 14, fontWeight: '500', color: '#111827' },
  listRowSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  listRowRight: { fontSize: 15, fontWeight: '600', color: '#111827' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 4,
  },
  totalLabel: { fontSize: 15, fontWeight: '700', color: '#111827' },
  totalValue: { fontSize: 15, fontWeight: '700', color: '#111827' },
  timelineRow: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
    gap: 4,
  },
  timelineDate: { fontSize: 12, color: '#6b7280' },
  timelineNotes: { fontSize: 13, color: '#374151' },
  empty: { textAlign: 'center', marginTop: 20, color: '#9ca3af' },
});
