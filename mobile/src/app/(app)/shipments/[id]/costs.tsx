import { useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { shipmentsApi } from '../../../../lib/api/shipments.api';

const COST_TYPES = [
  'freight',
  'customs',
  'transport',
  'insurance',
  'packaging',
  'handling',
  'other',
] as const;

export default function ShipmentCostsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState({
    costType: 'freight',
    amountGbp: '',
    costDate: '',
    vendorName: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: string) => (val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setError(null);
    if (!form.amountGbp || !form.costDate) {
      setError('Amount and date are required');
      return;
    }
    const amount = Number(form.amountGbp);
    if (!amount || amount <= 0) {
      setError('Amount must be a positive number');
      return;
    }
    setLoading(true);
    try {
      await shipmentsApi.addCost(id, {
        costType: form.costType,
        amountGbp: amount,
        costDate: form.costDate,
        vendorName: form.vendorName || undefined,
        description: form.description || undefined,
      });
      router.back();
    } catch {
      setError('Failed to save cost. Please try again.');
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
        <Text style={styles.section}>Cost Type</Text>
        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.chipGrid}>
          {COST_TYPES.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.chip, form.costType === t && styles.chipActive]}
              onPress={() => setForm((f) => ({ ...f, costType: t }))}
            >
              <Text style={[styles.chipText, form.costType === t && styles.chipTextActive]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.section}>Details</Text>

        <Text style={styles.label}>Amount (£) *</Text>
        <TextInput
          style={styles.input}
          value={form.amountGbp}
          onChangeText={set('amountGbp')}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Date (YYYY-MM-DD) *</Text>
        <TextInput
          style={styles.input}
          value={form.costDate}
          onChangeText={set('costDate')}
          placeholder="2025-06-01"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Vendor Name</Text>
        <TextInput
          style={styles.input}
          value={form.vendorName}
          onChangeText={set('vendorName')}
          placeholder="Optional"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, { height: 80 }]}
          value={form.description}
          onChangeText={set('description')}
          multiline
          placeholder="Optional notes..."
          placeholderTextColor="#9ca3af"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Save Cost</Text>
          )}
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
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 13, color: '#374151' },
  chipTextActive: { color: '#fff' },
  button: {
    height: 48,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  error: { color: '#dc2626', fontSize: 13, marginBottom: 12 },
});
