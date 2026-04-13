import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { invoicesApi } from '../../../lib/api/invoices.api';
import { customersApi } from '../../../lib/api/customers.api';
import { salesApi } from '../../../lib/api/sales.api';

interface CustomerOption {
  id: string;
  fullName: string;
  email: string | null;
}

interface SaleOption {
  id: string;
  saleReference: string;
  totalGhs: number;
}

interface LineItem {
  description: string;
  quantity: string;
  unitPrice: string;
  discountAmount: string;
}

export default function NewInvoiceScreen() {
  const router = useRouter();

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);

  const [selectedSale, setSelectedSale] = useState<SaleOption | null>(null);
  const [saleOptions, setSaleOptions] = useState<SaleOption[]>([]);
  const [showSalePicker, setShowSalePicker] = useState(false);

  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [currencyCode, setCurrencyCode] = useState<'GHS' | 'GBP'>('GHS');
  const [shippingTotal, setShippingTotal] = useState('0');
  const [taxTotal, setTaxTotal] = useState('0');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<LineItem[]>([
    { description: '', quantity: '1', unitPrice: '0', discountAmount: '0' },
  ]);

  const [submitting, setSubmitting] = useState(false);

  const searchCustomers = useCallback(async (q: string) => {
    try {
      const res = await customersApi.list({ search: q || undefined });
      setCustomerOptions((res.data as any).data?.data ?? []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    searchCustomers('');
  }, [searchCustomers]);

  const loadSales = useCallback(async () => {
    try {
      const res = await salesApi.list({ status: 'completed', limit: 50 });
      setSaleOptions((res.data as any).data?.data ?? []);
    } catch {
      // ignore
    }
  }, []);

  const handleFromSale = () => {
    loadSales();
    setShowSalePicker(true);
  };

  const selectSale = (sale: SaleOption) => {
    setSelectedSale(sale);
    setShowSalePicker(false);
    setItems([]);
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { description: '', quantity: '1', unitPrice: '0', discountAmount: '0' },
    ]);
  };

  const updateItem = (index: number, field: keyof LineItem, value: string) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, it) => {
    const qty = parseFloat(it.quantity) || 0;
    const price = parseFloat(it.unitPrice) || 0;
    return sum + qty * price;
  }, 0);

  const discountSum = items.reduce((sum, it) => sum + (parseFloat(it.discountAmount) || 0), 0);
  const total =
    subtotal - discountSum + (parseFloat(shippingTotal) || 0) + (parseFloat(taxTotal) || 0);

  const handleSubmit = async (_asDraft: boolean) => {
    if (!selectedCustomer) {
      Alert.alert('Validation', 'Please select a customer.');
      return;
    }
    if (!selectedSale && items.filter((i) => i.description.trim()).length === 0) {
      Alert.alert('Validation', 'Add at least one line item or generate from a sale.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        customerId: selectedCustomer.id,
        invoiceDate,
        dueDate,
        currencyCode,
        shippingTotal: parseFloat(shippingTotal) || 0,
        taxTotal: parseFloat(taxTotal) || 0,
        notes: notes || undefined,
      };

      if (selectedSale) {
        payload.saleId = selectedSale.id;
      } else {
        payload.items = items
          .filter((i) => i.description.trim())
          .map((i) => ({
            description: i.description,
            quantity: parseFloat(i.quantity) || 1,
            unitPrice: parseFloat(i.unitPrice) || 0,
            discountAmount: parseFloat(i.discountAmount) || 0,
          }));
      }

      const res = await invoicesApi.create(payload);
      const invoice = (res.data as any).data;
      router.replace(`/(app)/invoices/${invoice.id}`);
    } catch {
      Alert.alert('Error', 'Failed to create invoice. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer</Text>
        <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowCustomerPicker(true)}>
          <Text style={selectedCustomer ? styles.pickerBtnText : styles.pickerBtnPlaceholder}>
            {selectedCustomer ? selectedCustomer.fullName : 'Select customer...'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Generate from Sale</Text>
        <TouchableOpacity style={styles.outlineBtn} onPress={handleFromSale}>
          <Text style={styles.outlineBtnText}>
            {selectedSale ? `From sale: ${selectedSale.saleReference}` : 'Select a sale'}
          </Text>
        </TouchableOpacity>
        {selectedSale && (
          <TouchableOpacity style={styles.clearBtn} onPress={() => setSelectedSale(null)}>
            <Text style={styles.clearBtnText}>Clear — enter items manually</Text>
          </TouchableOpacity>
        )}
      </View>

      {!selectedSale && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Line Items</Text>
          {items.map((item, i) => (
            <View key={i} style={styles.itemRow}>
              <TextInput
                style={[styles.input, styles.inputDesc]}
                placeholder="Description"
                placeholderTextColor="#9ca3af"
                value={item.description}
                onChangeText={(v) => updateItem(i, 'description', v)}
              />
              <View style={styles.itemNumRow}>
                <TextInput
                  style={[styles.input, styles.inputNum]}
                  placeholder="Qty"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                  value={item.quantity}
                  onChangeText={(v) => updateItem(i, 'quantity', v)}
                />
                <TextInput
                  style={[styles.input, styles.inputNum]}
                  placeholder="Unit price"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                  value={item.unitPrice}
                  onChangeText={(v) => updateItem(i, 'unitPrice', v)}
                />
                <TextInput
                  style={[styles.input, styles.inputNum]}
                  placeholder="Discount"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                  value={item.discountAmount}
                  onChangeText={(v) => updateItem(i, 'discountAmount', v)}
                />
                {items.length > 1 && (
                  <TouchableOpacity onPress={() => removeItem(i)} style={styles.removeBtn}>
                    <Text style={styles.removeBtnText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.addItemBtn} onPress={addItem}>
            <Text style={styles.addItemBtnText}>+ Add item</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dates &amp; Currency</Text>
        <Text style={styles.label}>Invoice Date</Text>
        <TextInput
          style={styles.input}
          value={invoiceDate}
          onChangeText={setInvoiceDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.label}>Due Date</Text>
        <TextInput
          style={styles.input}
          value={dueDate}
          onChangeText={setDueDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.label}>Currency</Text>
        <View style={styles.currencyRow}>
          {(['GHS', 'GBP'] as const).map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.currencyChip, currencyCode === c && styles.currencyChipActive]}
              onPress={() => setCurrencyCode(c)}
            >
              <Text
                style={[
                  styles.currencyChipText,
                  currencyCode === c && styles.currencyChipTextActive,
                ]}
              >
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Additional Charges</Text>
        <Text style={styles.label}>Shipping</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={shippingTotal}
          onChangeText={setShippingTotal}
          placeholder="0.00"
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.label}>Tax</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={taxTotal}
          onChangeText={setTaxTotal}
          placeholder="0.00"
          placeholderTextColor="#9ca3af"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={3}
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional notes..."
          placeholderTextColor="#9ca3af"
        />
      </View>

      {!selectedSale && (
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>
              {currencyCode} {subtotal.toFixed(2)}
            </Text>
          </View>
          {discountSum > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discounts</Text>
              <Text style={[styles.summaryValue, { color: '#10b981' }]}>
                − {currencyCode} {discountSum.toFixed(2)}
              </Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.summaryRowBold]}>
            <Text style={styles.summaryLabelBold}>Total</Text>
            <Text style={styles.summaryValueBold}>
              {currencyCode} {total.toFixed(2)}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, styles.btnOutline]}
          onPress={() => handleSubmit(true)}
          disabled={submitting}
        >
          <Text style={styles.btnOutlineText}>Save as Draft</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary]}
          onPress={() => handleSubmit(false)}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnPrimaryText}>Generate &amp; Preview</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Customer Picker Modal */}
      <Modal visible={showCustomerPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Customer</Text>
            <TouchableOpacity onPress={() => setShowCustomerPicker(false)}>
              <Text style={styles.modalClose}>Done</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.modalSearch}
            placeholder="Search customers..."
            placeholderTextColor="#9ca3af"
            value={customerSearch}
            onChangeText={(v) => {
              setCustomerSearch(v);
              searchCustomers(v);
            }}
          />
          <FlatList
            data={customerOptions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  setSelectedCustomer(item);
                  setShowCustomerPicker(false);
                }}
              >
                <Text style={styles.modalItemText}>{item.fullName}</Text>
                {item.email && <Text style={styles.modalItemSub}>{item.email}</Text>}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* Sale Picker Modal */}
      <Modal visible={showSalePicker} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Sale</Text>
            <TouchableOpacity onPress={() => setShowSalePicker(false)}>
              <Text style={styles.modalClose}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={saleOptions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalItem} onPress={() => selectSale(item)}>
                <Text style={styles.modalItemText}>{item.saleReference}</Text>
                <Text style={styles.modalItemSub}>GHS {Number(item.totalGhs).toFixed(2)}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.modalEmpty}>No completed sales found</Text>}
          />
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
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
  label: { fontSize: 13, color: '#374151', marginBottom: 4, marginTop: 8 },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    color: '#111827',
    fontSize: 14,
    marginBottom: 4,
  },
  textArea: { height: 80, paddingTop: 10, textAlignVertical: 'top' },
  pickerBtn: {
    height: 44,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  pickerBtnText: { fontSize: 14, color: '#111827' },
  pickerBtnPlaceholder: { fontSize: 14, color: '#9ca3af' },
  outlineBtn: {
    height: 44,
    borderWidth: 1.5,
    borderColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outlineBtnText: { fontSize: 14, color: '#2563eb', fontWeight: '600' },
  clearBtn: { marginTop: 8, alignItems: 'center' },
  clearBtnText: { fontSize: 13, color: '#6b7280', textDecorationLine: 'underline' },
  itemRow: { marginBottom: 8 },
  inputDesc: { marginBottom: 4 },
  itemNumRow: { flexDirection: 'row', gap: 6 },
  inputNum: { flex: 1, minWidth: 0 },
  removeBtn: { justifyContent: 'center', paddingHorizontal: 6 },
  removeBtnText: { color: '#dc2626', fontSize: 16 },
  addItemBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  addItemBtnText: { color: '#2563eb', fontSize: 14, fontWeight: '600' },
  currencyRow: { flexDirection: 'row', gap: 8 },
  currencyChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  currencyChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  currencyChipText: { fontSize: 14, color: '#374151', fontWeight: '600' },
  currencyChipTextActive: { color: '#fff' },
  summary: {
    backgroundColor: '#fff',
    margin: 12,
    marginBottom: 0,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryRowBold: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 4,
    paddingTop: 8,
  },
  summaryLabel: { fontSize: 14, color: '#6b7280' },
  summaryValue: { fontSize: 14, color: '#374151' },
  summaryLabelBold: { fontSize: 15, fontWeight: '700', color: '#111827' },
  summaryValueBold: { fontSize: 15, fontWeight: '700', color: '#111827' },
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
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnOutline: { borderWidth: 1.5, borderColor: '#2563eb' },
  btnOutlineText: { color: '#2563eb', fontSize: 15, fontWeight: '700' },
  modal: { flex: 1, backgroundColor: '#f9fafb' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  modalClose: { fontSize: 15, color: '#2563eb', fontWeight: '600' },
  modalSearch: {
    margin: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    color: '#111827',
  },
  modalItem: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalItemText: { fontSize: 15, color: '#111827', fontWeight: '500' },
  modalItemSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  modalEmpty: { textAlign: 'center', marginTop: 40, color: '#9ca3af' },
});
