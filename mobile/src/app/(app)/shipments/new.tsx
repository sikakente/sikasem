import { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { shipmentsApi } from '../../../lib/api/shipments.api';
import { InventoryPicker } from '../../../components/InventoryPicker';

interface ItemEntry {
  productId: string;
  productName: string;
  quantity: number;
}

export default function NewShipmentScreen() {
  const router = useRouter();
  const [form, setForm] = useState({
    shipmentReference: '',
    shipmentName: '',
    carrierName: '',
    trackingNumber: '',
    originLocationId: '',
    destinationLocationId: '',
    dispatchDate: '',
    expectedArrivalDate: '',
    notes: '',
  });
  const [items, setItems] = useState<ItemEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: string) => (val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleAddItem = (item: ItemEntry) => {
    setItems((prev) => {
      const existing = prev.findIndex((i) => i.productId === item.productId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = {
          ...updated[existing],
          quantity: updated[existing].quantity + item.quantity,
        };
        return updated;
      }
      return [...prev, item];
    });
  };

  const handleRemoveItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const handleSave = async (dispatchNow = false) => {
    setError(null);
    if (!form.shipmentReference || !form.originLocationId || !form.destinationLocationId) {
      setError('Reference, origin, and destination are required');
      return;
    }
    setLoading(true);
    try {
      const res = await shipmentsApi.create({
        shipmentReference: form.shipmentReference,
        shipmentName: form.shipmentName || undefined,
        carrierName: form.carrierName || undefined,
        trackingNumber: form.trackingNumber || undefined,
        originLocationId: form.originLocationId,
        destinationLocationId: form.destinationLocationId,
        dispatchDate: form.dispatchDate || undefined,
        expectedArrivalDate: form.expectedArrivalDate || undefined,
        notes: form.notes || undefined,
      });

      const shipment = (res.data as any).data;

      // Add all selected items
      for (const item of items) {
        await shipmentsApi.addItem(shipment.id, {
          productId: item.productId,
          quantity: item.quantity,
        });
      }

      if (dispatchNow) {
        await shipmentsApi.dispatch(shipment.id);
      }

      router.replace(`/(app)/shipments/${shipment.id}`);
    } catch {
      setError('Failed to create shipment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.section}>Shipment Details</Text>
        {error && <Text style={styles.error}>{error}</Text>}

        <Text style={styles.label}>Reference *</Text>
        <TextInput
          style={styles.input}
          value={form.shipmentReference}
          onChangeText={set('shipmentReference')}
          placeholder="SHP-001"
          placeholderTextColor="#9ca3af"
          autoCapitalize="characters"
        />

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={form.shipmentName}
          onChangeText={set('shipmentName')}
          placeholder="Optional description"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Carrier</Text>
        <TextInput
          style={styles.input}
          value={form.carrierName}
          onChangeText={set('carrierName')}
          placeholder="DHL, FedEx..."
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Tracking Number</Text>
        <TextInput
          style={styles.input}
          value={form.trackingNumber}
          onChangeText={set('trackingNumber')}
          placeholder="Optional"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.section}>Locations</Text>

        <Text style={styles.label}>Origin Location ID *</Text>
        <TextInput
          style={styles.input}
          value={form.originLocationId}
          onChangeText={set('originLocationId')}
          placeholder="Location UUID"
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Destination Location ID *</Text>
        <TextInput
          style={styles.input}
          value={form.destinationLocationId}
          onChangeText={set('destinationLocationId')}
          placeholder="Location UUID"
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
        />

        <Text style={styles.section}>Dates</Text>

        <Text style={styles.label}>Dispatch Date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={form.dispatchDate}
          onChangeText={set('dispatchDate')}
          placeholder="2025-06-01"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Expected Arrival (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={form.expectedArrivalDate}
          onChangeText={set('expectedArrivalDate')}
          placeholder="2025-06-15"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.section}>Items</Text>

        {items.map((item) => (
          <View key={item.productId} style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.productName}</Text>
              <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
            </View>
            <TouchableOpacity onPress={() => handleRemoveItem(item.productId)}>
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))}

        {form.originLocationId ? (
          <InventoryPicker locationId={form.originLocationId} onAdd={handleAddItem} />
        ) : (
          <Text style={styles.hintText}>Enter origin location ID to add items</Text>
        )}

        <Text style={styles.section}>Notes</Text>
        <TextInput
          style={[styles.input, { height: 80 }]}
          value={form.notes}
          onChangeText={set('notes')}
          multiline
          placeholder="Any notes..."
          placeholderTextColor="#9ca3af"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={() => handleSave(false)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Save as Draft</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.buttonOutline, loading && styles.buttonDisabled]}
          onPress={() => {
            Alert.alert('Dispatch Now', 'This will save and immediately dispatch the shipment.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Dispatch', onPress: () => handleSave(true) },
            ]);
          }}
          disabled={loading}
        >
          <Text style={styles.buttonOutlineText}>Dispatch Now</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },
  section: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
  },
  label: { fontSize: 14, color: '#374151', marginBottom: 4 },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    color: '#111827',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  itemName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  itemQty: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  removeText: { fontSize: 13, color: '#dc2626' },
  hintText: { fontSize: 13, color: '#9ca3af', fontStyle: 'italic', marginTop: 8 },
  button: {
    height: 48,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  buttonOutline: {
    height: 48,
    borderWidth: 1.5,
    borderColor: '#2563eb',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  buttonOutlineText: { color: '#2563eb', fontSize: 15, fontWeight: '600' },
  error: { color: '#dc2626', fontSize: 13, marginBottom: 12 },
});
