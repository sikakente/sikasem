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
import { useRouter } from 'expo-router';
import { customersApi } from '../../../lib/api/customers.api';

const CUSTOMER_TYPES = [
  { label: 'Retail', value: 'retail' },
  { label: 'Wholesale', value: 'wholesale' },
];

export default function NewCustomerScreen() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: '',
    customerType: 'retail',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: string) => (val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.fullName.trim()) {
      setError('Full name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await customersApi.create({
        fullName: form.fullName,
        customerType: form.customerType,
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        notes: form.notes || undefined,
      });
      router.back();
    } catch {
      setError('Failed to create customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            value={form.fullName}
            onChangeText={set('fullName')}
            placeholder="Customer name"
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Customer Type</Text>
          <View style={styles.typeRow}>
            {CUSTOMER_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[styles.typeChip, form.customerType === t.value && styles.typeChipActive]}
                onPress={() => setForm((f) => ({ ...f, customerType: t.value }))}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    form.customerType === t.value && styles.typeChipTextActive,
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={form.phone}
            onChangeText={set('phone')}
            placeholder="+233..."
            placeholderTextColor="#9ca3af"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={form.email}
            onChangeText={set('email')}
            placeholder="email@example.com"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={form.address}
            onChangeText={set('address')}
            placeholder="Physical address"
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={2}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={form.notes}
            onChangeText={set('notes')}
            placeholder="Optional notes"
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={2}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Save Customer</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  errorBanner: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: { color: '#dc2626', fontSize: 13 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    color: '#111827',
    fontSize: 15,
  },
  inputMultiline: { height: 72, paddingTop: 10, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  typeChipActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  typeChipText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  typeChipTextActive: { color: '#2563eb', fontWeight: '700' },
  saveBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 40,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
