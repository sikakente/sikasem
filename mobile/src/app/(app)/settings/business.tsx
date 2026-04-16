import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useState, useEffect } from 'react';
import { adminApi } from '../../../lib/api/admin.api';

interface BusinessProfile {
  businessName: string;
  contactEmail: string;
  contactPhone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  country: string;
  taxNumber: string;
  receiptFooter: string;
  invoiceFooter: string;
  logoUrl: string;
}

const EMPTY_PROFILE: BusinessProfile = {
  businessName: '',
  contactEmail: '',
  contactPhone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  country: '',
  taxNumber: '',
  receiptFooter: '',
  invoiceFooter: '',
  logoUrl: '',
};

export default function BusinessProfileScreen() {
  const [form, setForm] = useState<BusinessProfile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setFetchError(null);
        const response = await adminApi.getBusinessProfile();
        const data = (response.data as { data: BusinessProfile }).data ?? response.data;
        if (data) {
          setForm({
            businessName: data.businessName ?? '',
            contactEmail: data.contactEmail ?? '',
            contactPhone: data.contactPhone ?? '',
            addressLine1: data.addressLine1 ?? '',
            addressLine2: data.addressLine2 ?? '',
            city: data.city ?? '',
            country: data.country ?? '',
            taxNumber: data.taxNumber ?? '',
            receiptFooter: data.receiptFooter ?? '',
            invoiceFooter: data.invoiceFooter ?? '',
            logoUrl: data.logoUrl ?? '',
          });
        }
      } catch {
        setFetchError('Failed to load business profile.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminApi.updateBusinessProfile(form as unknown as Record<string, unknown>);
      Alert.alert('Saved', 'Business profile updated successfully.');
    } catch {
      Alert.alert('Error', 'Failed to save business profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const update = (field: keyof BusinessProfile) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {fetchError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{fetchError}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Business Details</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Business Name</Text>
          <TextInput
            style={styles.input}
            value={form.businessName}
            onChangeText={update('businessName')}
            placeholder="Enter business name"
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Contact Email</Text>
          <TextInput
            style={styles.input}
            value={form.contactEmail}
            onChangeText={update('contactEmail')}
            placeholder="contact@example.com"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Contact Phone</Text>
          <TextInput
            style={styles.input}
            value={form.contactPhone}
            onChangeText={update('contactPhone')}
            placeholder="+44 20 1234 5678"
            placeholderTextColor="#9ca3af"
            keyboardType="phone-pad"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Address</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Address Line 1</Text>
          <TextInput
            style={styles.input}
            value={form.addressLine1}
            onChangeText={update('addressLine1')}
            placeholder="Street address"
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Address Line 2 (optional)</Text>
          <TextInput
            style={styles.input}
            value={form.addressLine2}
            onChangeText={update('addressLine2')}
            placeholder="Apartment, suite, etc."
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>City</Text>
          <TextInput
            style={styles.input}
            value={form.city}
            onChangeText={update('city')}
            placeholder="City"
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Country</Text>
          <TextInput
            style={styles.input}
            value={form.country}
            onChangeText={update('country')}
            placeholder="Country"
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tax & Invoicing</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Tax Number (optional)</Text>
          <TextInput
            style={styles.input}
            value={form.taxNumber}
            onChangeText={update('taxNumber')}
            placeholder="VAT / Tax ID"
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Logo URL (optional)</Text>
          <TextInput
            style={styles.input}
            value={form.logoUrl}
            onChangeText={update('logoUrl')}
            placeholder="https://example.com/logo.png"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Receipt Footer (optional)</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={form.receiptFooter}
            onChangeText={update('receiptFooter')}
            placeholder="Text to appear at the bottom of receipts"
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Invoice Footer (optional)</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={form.invoiceFooter}
            onChangeText={update('invoiceFooter')}
            placeholder="Text to appear at the bottom of invoices"
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Changes</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 8,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  multiline: {
    minHeight: 80,
    paddingTop: 10,
  },
  saveButton: {
    marginHorizontal: 16,
    marginTop: 28,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
