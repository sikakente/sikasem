import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { purchasingApi } from '../../../lib/api/purchasing.api';

interface LineItem {
  productId: string;
  quantity: number;
  unitCostGbp: number;
  fxRatePurchase: number;
  totalCostGbp: number;
  totalCostGhsEquivalent: number;
}

export default function NewPurchaseScreen() {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showAddItem, setShowAddItem] = useState(false);
  const [newProductId, setNewProductId] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [newUnitCost, setNewUnitCost] = useState('');
  const [newFxRate, setNewFxRate] = useState('');
  const [addItemError, setAddItemError] = useState<string | null>(null);

  const totalGbp = items.reduce((sum, item) => sum + item.totalCostGbp, 0);

  const resetAddItemForm = () => {
    setNewProductId('');
    setNewQuantity('');
    setNewUnitCost('');
    setNewFxRate('');
    setAddItemError(null);
  };

  const handleAddItem = () => {
    setAddItemError(null);
    const qty = parseFloat(newQuantity);
    const cost = parseFloat(newUnitCost);
    const fx = parseFloat(newFxRate);

    if (!newProductId.trim()) {
      setAddItemError('Product ID is required.');
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      setAddItemError('Quantity must be a positive number.');
      return;
    }
    if (isNaN(cost) || cost <= 0) {
      setAddItemError('Unit cost (GBP) must be a positive number.');
      return;
    }
    if (isNaN(fx) || fx <= 0) {
      setAddItemError('FX rate must be a positive number.');
      return;
    }

    const totalCostGbp = qty * cost;
    const totalCostGhsEquivalent = totalCostGbp * fx;

    const newItem: LineItem = {
      productId: newProductId.trim(),
      quantity: qty,
      unitCostGbp: cost,
      fxRatePurchase: fx,
      totalCostGbp,
      totalCostGhsEquivalent,
    };

    setItems((prev) => [...prev, newItem]);
    resetAddItemForm();
    setShowAddItem(false);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const buildPayload = (status: 'draft' | 'confirmed') => ({
    supplierId: supplierId.trim(),
    purchaseDate: purchaseDate.trim(),
    notes: notes.trim() || undefined,
    status,
    items: items.map(
      ({
        productId,
        quantity,
        unitCostGbp,
        fxRatePurchase,
        totalCostGbp,
        totalCostGhsEquivalent,
      }) => ({
        productId,
        quantity,
        unitCostGbp,
        fxRatePurchase,
        totalCostGbp,
        totalCostGhsEquivalent,
      }),
    ),
  });

  const validate = (): boolean => {
    if (!supplierId.trim()) {
      setError('Supplier ID is required.');
      return false;
    }
    if (!purchaseDate.trim()) {
      setError('Purchase date is required.');
      return false;
    }
    if (items.length === 0) {
      setError('Add at least one line item.');
      return false;
    }
    return true;
  };

  const handleSaveDraft = async () => {
    setError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      await purchasingApi.create(buildPayload('draft') as Record<string, unknown>);
      router.back();
    } catch {
      setError('Failed to save purchase order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    setError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const response = await purchasingApi.create(buildPayload('draft') as Record<string, unknown>);
      const responseData = response.data as { id?: string; data?: { id?: string } };
      const id = responseData?.id || (responseData?.data as { id?: string } | undefined)?.id;
      if (!id) throw new Error('Failed to get purchase order ID from response');
      await purchasingApi.confirm(id);
      router.back();
    } catch {
      setError('Failed to confirm purchase order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Supplier */}
        <Text style={styles.label}>Supplier ID</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. supplier-uuid"
          placeholderTextColor="#9ca3af"
          value={supplierId}
          onChangeText={setSupplierId}
          autoCapitalize="none"
        />

        {/* Purchase Date */}
        <Text style={styles.label}>Purchase Date (ISO format)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 2024-01-15"
          placeholderTextColor="#9ca3af"
          value={purchaseDate}
          onChangeText={setPurchaseDate}
          autoCapitalize="none"
        />

        {/* Line Items */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Line Items</Text>
          <TouchableOpacity
            style={styles.addItemBtn}
            onPress={() => {
              resetAddItemForm();
              setShowAddItem(true);
            }}
          >
            <Text style={styles.addItemBtnText}>+ Add Item</Text>
          </TouchableOpacity>
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyItems}>
            <Text style={styles.emptyItemsText}>No items added yet</Text>
          </View>
        ) : (
          items.map((item, index) => (
            <View key={index} style={styles.lineItem}>
              <View style={styles.lineItemInfo}>
                <Text style={styles.lineItemProduct}>{item.productId}</Text>
                <Text style={styles.lineItemDetail}>
                  Qty: {item.quantity} × £{item.unitCostGbp.toFixed(2)} = £
                  {item.totalCostGbp.toFixed(2)}
                </Text>
                <Text style={styles.lineItemDetail}>
                  FX: {item.fxRatePurchase} | GHS: ₵{item.totalCostGhsEquivalent.toFixed(2)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleRemoveItem(index)} style={styles.removeBtn}>
                <Text style={styles.removeBtnText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Notes */}
        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Any notes about this purchase..."
          placeholderTextColor="#9ca3af"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {/* Footer totals */}
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>Total GBP</Text>
          <Text style={styles.totalsValue}>£{totalGbp.toFixed(2)}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.draftBtn, submitting && styles.btnDisabled]}
            onPress={handleSaveDraft}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#2563eb" />
            ) : (
              <Text style={styles.draftBtnText}>Save as Draft</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmBtn, submitting && styles.btnDisabled]}
            onPress={handleConfirm}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmBtnText}>Confirm Purchase</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Add Item Modal */}
      <Modal visible={showAddItem} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Line Item</Text>

            {addItemError && <Text style={styles.modalError}>{addItemError}</Text>}

            <Text style={styles.label}>Product ID</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. product-uuid"
              placeholderTextColor="#9ca3af"
              value={newProductId}
              onChangeText={setNewProductId}
              autoCapitalize="none"
            />

            <Text style={styles.label}>Quantity</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 10"
              placeholderTextColor="#9ca3af"
              value={newQuantity}
              onChangeText={setNewQuantity}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>Unit Cost (GBP)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 5.50"
              placeholderTextColor="#9ca3af"
              value={newUnitCost}
              onChangeText={setNewUnitCost}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>FX Rate (GHS per GBP)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 15.5"
              placeholderTextColor="#9ca3af"
              value={newFxRate}
              onChangeText={setNewFxRate}
              keyboardType="decimal-pad"
            />

            {newQuantity && newUnitCost && newFxRate && (
              <View style={styles.calcPreview}>
                <Text style={styles.calcText}>
                  Total GBP: £
                  {(parseFloat(newQuantity || '0') * parseFloat(newUnitCost || '0')).toFixed(2)}
                </Text>
                <Text style={styles.calcText}>
                  GHS equiv: ₵
                  {(
                    parseFloat(newQuantity || '0') *
                    parseFloat(newUnitCost || '0') *
                    parseFloat(newFxRate || '0')
                  ).toFixed(2)}
                </Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  resetAddItemForm();
                  setShowAddItem(false);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalAddBtn} onPress={handleAddItem}>
                <Text style={styles.modalAddText}>Add Item</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
    marginBottom: 14,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  addItemBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  addItemBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  emptyItems: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  emptyItemsText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  lineItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  lineItemInfo: {
    flex: 1,
  },
  lineItemProduct: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 3,
  },
  lineItemDetail: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  removeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fee2e2',
    borderRadius: 7,
    marginLeft: 10,
  },
  removeBtnText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '500',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginTop: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  totalsLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  totalsValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  draftBtn: {
    flex: 1,
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2563eb',
    backgroundColor: '#fff',
  },
  draftBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563eb',
  },
  confirmBtn: {
    flex: 1,
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  modalError: {
    color: '#dc2626',
    fontSize: 13,
    marginBottom: 10,
  },
  calcPreview: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    gap: 4,
  },
  calcText: {
    fontSize: 13,
    color: '#15803d',
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  modalCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  modalCancelText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  modalAddBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
  },
  modalAddText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
});
