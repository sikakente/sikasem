import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { inventoryApi } from '../lib/api/inventory.api';

interface InventoryItem {
  productId: string;
  productName: string;
  sku: string;
  quantityAvailable: number;
  locationId: string;
}

interface SelectedItem {
  productId: string;
  productName: string;
  quantity: number;
}

interface Props {
  locationId: string;
  onAdd: (item: SelectedItem) => void;
}

export function InventoryPicker({ locationId, onAdd }: Props) {
  const [visible, setVisible] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [quantity, setQuantity] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    async (searchVal = '') => {
      setLoading(true);
      try {
        const res = await inventoryApi.list({
          locationId,
          search: searchVal || undefined,
        });
        const data = (res.data as any).data ?? [];
        setItems(
          data.map((b: any) => ({
            productId: b.productId,
            productName: b.product?.name ?? '',
            sku: b.product?.sku ?? '',
            quantityAvailable: Number(b.quantityAvailable),
            locationId: b.locationId,
          })),
        );
      } catch {
        // silently ignore
      } finally {
        setLoading(false);
      }
    },
    [locationId],
  );

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const handleSearch = (text: string) => {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(text), 300);
  };

  const handleConfirm = () => {
    if (!selected) return;
    const qty = Number(quantity);
    if (!qty || qty <= 0) return;
    onAdd({ productId: selected.productId, productName: selected.productName, quantity: qty });
    setVisible(false);
    setSelected(null);
    setQuantity('');
    setSearch('');
  };

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setVisible(true)}>
        <Text style={styles.triggerText}>+ Add Item</Text>
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Product</Text>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.search}
            placeholder="Search products..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={handleSearch}
          />

          {loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color="#2563eb" />
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => item.productId}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.row, selected?.productId === item.productId && styles.rowSelected]}
                  onPress={() => setSelected(item)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName}>{item.productName}</Text>
                    <Text style={styles.rowSub}>{item.sku}</Text>
                  </View>
                  <Text style={styles.rowQty}>{item.quantityAvailable} avail.</Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingBottom: 16 }}
              ListEmptyComponent={<Text style={styles.empty}>No products found</Text>}
            />
          )}

          {selected && (
            <View style={styles.qtyRow}>
              <Text style={styles.qtyLabel}>{selected.productName}</Text>
              <TextInput
                style={styles.qtyInput}
                placeholder="Qty"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
              />
              <TouchableOpacity style={styles.addBtn} onPress={handleConfirm}>
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  triggerText: { color: '#2563eb', fontSize: 14, fontWeight: '600' },
  modal: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  cancel: { fontSize: 15, color: '#2563eb' },
  search: {
    margin: 16,
    height: 44,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    color: '#111827',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  rowSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  rowName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  rowSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  rowQty: { fontSize: 13, color: '#6b7280' },
  empty: { textAlign: 'center', marginTop: 40, color: '#9ca3af' },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
    gap: 10,
  },
  qtyLabel: { flex: 1, fontSize: 14, color: '#111827', fontWeight: '500' },
  qtyInput: {
    width: 80,
    height: 40,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    color: '#111827',
    backgroundColor: '#f9fafb',
    textAlign: 'center',
  },
  addBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
