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
import { suppliersApi } from '../../../lib/api/suppliers.api';

const SUPPLIER_TYPES = ['shop', 'wholesaler', 'importer', 'other'] as const;

export default function NewSupplierScreen() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', supplierType: 'shop', contactName: '', phone: '', email: '',
    addressLine1: '', city: '', country: '', currencyCode: 'GBP', notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: string) => (val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setError(null);
    if (!form.name || !form.country) { setError('Name and country are required'); return; }
    setLoading(true);
    try {
      await suppliersApi.create(form as Record<string, unknown>);
      router.back();
    } catch {
      setError('Failed to create supplier. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.section}>Basic Info</Text>
        {error && <Text style={styles.error}>{error}</Text>}

        <Text style={styles.label}>Name *</Text>
        <TextInput style={styles.input} value={form.name} onChangeText={set('name')} placeholder="Supplier name" placeholderTextColor="#9ca3af" />

        <Text style={styles.label}>Type</Text>
        <View style={styles.typeRow}>
          {SUPPLIER_TYPES.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeChip, form.supplierType === t && styles.typeChipActive]}
              onPress={() => setForm((f) => ({ ...f, supplierType: t }))}
            >
              <Text style={[styles.typeChipText, form.supplierType === t && styles.typeChipTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Contact Name</Text>
        <TextInput style={styles.input} value={form.contactName} onChangeText={set('contactName')} placeholder="Contact person" placeholderTextColor="#9ca3af" />

        <Text style={styles.label}>Phone</Text>
        <TextInput style={styles.input} value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" placeholder="+44..." placeholderTextColor="#9ca3af" />

        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" placeholder="email@example.com" placeholderTextColor="#9ca3af" />

        <Text style={styles.section}>Address</Text>
        <Text style={styles.label}>Address Line 1</Text>
        <TextInput style={styles.input} value={form.addressLine1} onChangeText={set('addressLine1')} placeholder="123 High Street" placeholderTextColor="#9ca3af" />

        <Text style={styles.label}>City</Text>
        <TextInput style={styles.input} value={form.city} onChangeText={set('city')} placeholder="London" placeholderTextColor="#9ca3af" />

        <Text style={styles.label}>Country *</Text>
        <TextInput style={styles.input} value={form.country} onChangeText={set('country')} placeholder="UK" placeholderTextColor="#9ca3af" />

        <Text style={styles.section}>Other</Text>
        <Text style={styles.label}>Currency</Text>
        <TextInput style={styles.input} value={form.currencyCode} onChangeText={set('currencyCode')} placeholder="GBP" autoCapitalize="characters" placeholderTextColor="#9ca3af" />

        <Text style={styles.label}>Notes</Text>
        <TextInput style={[styles.input, { height: 80 }]} value={form.notes} onChangeText={set('notes')} multiline placeholder="Any notes..." placeholderTextColor="#9ca3af" />

        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Supplier</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },
  section: { fontSize: 13, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 20, marginBottom: 8 },
  label: { fontSize: 14, color: '#374151', marginBottom: 4 },
  input: { height: 44, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, backgroundColor: '#fff', color: '#111827', marginBottom: 12 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff' },
  typeChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  typeChipText: { fontSize: 13, color: '#374151' },
  typeChipTextActive: { color: '#fff' },
  button: { height: 48, backgroundColor: '#2563eb', borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  error: { color: '#dc2626', fontSize: 13, marginBottom: 12 },
});
