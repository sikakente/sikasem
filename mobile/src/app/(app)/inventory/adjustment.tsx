import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { inventoryApi } from '../../../lib/api/inventory.api';

type AdjustmentType = 'add' | 'remove';

export default function AdjustmentScreen() {
  const [productId, setProductId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [type, setType] = useState<AdjustmentType>('add');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setProductId('');
    setLocationId('');
    setType('add');
    setQuantity('');
    setReason('');
    setNotes('');
    setError(null);
  };

  const handleSubmit = async () => {
    if (!productId.trim()) {
      setError('Product ID is required.');
      return;
    }
    if (!locationId.trim()) {
      setError('Location ID is required.');
      return;
    }
    const qty = parseInt(quantity, 10);
    if (!quantity.trim() || isNaN(qty) || qty <= 0) {
      setError('Enter a valid quantity greater than 0.');
      return;
    }
    if (!reason.trim()) {
      setError('Reason is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await inventoryApi.createAdjustment({
        productId: productId.trim(),
        locationId: locationId.trim(),
        type,
        quantity: qty,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      });
      setSuccess(true);
      resetForm();
    } catch {
      setError('Failed to submit adjustment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <View style={styles.centered}>
        <View style={styles.successCard}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successTitle}>Adjustment Submitted</Text>
          <Text style={styles.successSubtitle}>Stock has been updated successfully.</Text>
          <TouchableOpacity
            style={styles.newAdjustmentButton}
            onPress={() => setSuccess(false)}
            activeOpacity={0.85}
          >
            <Text style={styles.newAdjustmentButtonText}>New Adjustment</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>Product ID</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. prod-001"
            placeholderTextColor="#9ca3af"
            value={productId}
            onChangeText={setProductId}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Location ID</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. loc-uk"
            placeholderTextColor="#9ca3af"
            value={locationId}
            onChangeText={setLocationId}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Type</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleButton, type === 'add' && styles.toggleButtonActive]}
              onPress={() => setType('add')}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.toggleButtonText, type === 'add' && styles.toggleButtonTextActive]}
              >
                Add
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, type === 'remove' && styles.toggleButtonActiveRemove]}
              onPress={() => setType('remove')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  type === 'remove' && styles.toggleButtonTextActiveRemove,
                ]}
              >
                Remove
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Quantity</Text>
          <TextInput
            style={styles.quantityInput}
            placeholder="0"
            placeholderTextColor="#9ca3af"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            returnKeyType="done"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Reason</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Damaged goods, Stock count correction"
            placeholderTextColor="#9ca3af"
            value={reason}
            onChangeText={setReason}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>
            Notes <Text style={styles.optional}>(optional)</Text>
          </Text>
          <TextInput
            style={styles.textArea}
            placeholder="Additional notes..."
            placeholderTextColor="#9ca3af"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Adjustment</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    padding: 24,
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  optional: {
    fontWeight: '400',
    color: '#9ca3af',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  quantityInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 18,
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    textAlign: 'center',
  },
  textArea: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 100,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  toggleButtonActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  toggleButtonActiveRemove: {
    backgroundColor: '#fff1f2',
    borderColor: '#e11d48',
  },
  toggleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  toggleButtonTextActive: {
    color: '#2563eb',
  },
  toggleButtonTextActiveRemove: {
    color: '#e11d48',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  successCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    width: '100%',
  },
  successIcon: {
    fontSize: 48,
    color: '#16a34a',
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  newAdjustmentButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  newAdjustmentButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
