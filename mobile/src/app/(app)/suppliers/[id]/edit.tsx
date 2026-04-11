import { useEffect, useState } from 'react';
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
import { suppliersApi } from '../../../../lib/api/suppliers.api';

export default function EditSupplierScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    suppliersApi
      .get(id)
      .then((res) => {
        const s = res.data as any;
        setForm({
          name: s.name ?? '',
          supplierType: s.supplierType ?? 'shop',
          contactName: s.contactName ?? '',
          phone: s.phone ?? '',
          email: s.email ?? '',
          addressLine1: s.addressLine1 ?? '',
          city: s.city ?? '',
          country: s.country ?? '',
          currencyCode: s.currencyCode ?? 'GBP',
          notes: s.notes ?? '',
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const set = (key: string) => (val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!id) return;
    setError(null);
    setSaving(true);
    try {
      await suppliersApi.update(id, form as Record<string, unknown>);
      router.back();
    } catch {
      setError('Failed to update supplier.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color="#2563eb" />;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {error && <Text style={styles.error}>{error}</Text>}

        {(
          [
            ['name', 'Name *'],
            ['contactName', 'Contact Name'],
            ['phone', 'Phone'],
            ['email', 'Email'],
            ['addressLine1', 'Address'],
            ['city', 'City'],
            ['country', 'Country *'],
            ['currencyCode', 'Currency'],
            ['notes', 'Notes'],
          ] as [string, string][]
        ).map(([key, label]) => (
          <View key={key}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
              style={[styles.input, key === 'notes' && { height: 80 }]}
              value={form[key] ?? ''}
              onChangeText={set(key)}
              multiline={key === 'notes'}
              autoCapitalize={key === 'email' ? 'none' : 'sentences'}
              placeholderTextColor="#9ca3af"
            />
          </View>
        ))}

        <TouchableOpacity
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },
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
