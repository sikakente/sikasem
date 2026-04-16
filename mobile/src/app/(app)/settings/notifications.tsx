import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useState, useEffect } from 'react';
import { adminApi } from '../../../lib/api/admin.api';

interface NotificationSettings {
  alertEmail: boolean;
  emailRecipients: string;
  lowStockThresholdOverride: string;
  fxLossAlertThresholdGbp: string;
}

const EMPTY_SETTINGS: NotificationSettings = {
  alertEmail: false,
  emailRecipients: '',
  lowStockThresholdOverride: '',
  fxLossAlertThresholdGbp: '',
};

export default function NotificationSettingsScreen() {
  const [form, setForm] = useState<NotificationSettings>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setFetchError(null);
        const response = await adminApi.getNotificationSettings();
        const data =
          (response.data as { data: Record<string, unknown> }).data ??
          (response.data as Record<string, unknown>);
        if (data) {
          setForm({
            alertEmail: Boolean(data.alertEmail ?? false),
            emailRecipients: String(data.emailRecipients ?? ''),
            lowStockThresholdOverride:
              data.lowStockThresholdOverride != null ? String(data.lowStockThresholdOverride) : '',
            fxLossAlertThresholdGbp:
              data.fxLossAlertThresholdGbp != null ? String(data.fxLossAlertThresholdGbp) : '',
          });
        }
      } catch {
        setFetchError('Failed to load notification settings.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        alertEmail: form.alertEmail,
        emailRecipients: form.emailRecipients,
        lowStockThresholdOverride:
          form.lowStockThresholdOverride !== '' ? Number(form.lowStockThresholdOverride) : null,
        fxLossAlertThresholdGbp:
          form.fxLossAlertThresholdGbp !== '' ? Number(form.fxLossAlertThresholdGbp) : null,
      };
      await adminApi.updateNotificationSettings(payload);
      Alert.alert('Saved', 'Notification settings updated successfully.');
    } catch {
      Alert.alert('Error', 'Failed to save notification settings. Please try again.');
    } finally {
      setSaving(false);
    }
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
        <Text style={styles.sectionTitle}>Email Alerts</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Alert Email</Text>
              <Text style={styles.rowSubtitle}>Send alert notifications by email</Text>
            </View>
            <Switch
              value={form.alertEmail}
              onValueChange={(value) => setForm((prev) => ({ ...prev, alertEmail: value }))}
              trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
              thumbColor={form.alertEmail ? '#2563eb' : '#9ca3af'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.field}>
            <Text style={styles.label}>Email Recipients</Text>
            <Text style={styles.hint}>Separate multiple addresses with commas</Text>
            <TextInput
              style={styles.input}
              value={form.emailRecipients}
              onChangeText={(value) => setForm((prev) => ({ ...prev, emailRecipients: value }))}
              placeholder="alerts@example.com, ops@example.com"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thresholds</Text>

        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Low Stock Threshold Override</Text>
            <Text style={styles.hint}>
              Minimum quantity before triggering a low stock alert (overrides per-product default)
            </Text>
            <TextInput
              style={styles.input}
              value={form.lowStockThresholdOverride}
              onChangeText={(value) =>
                setForm((prev) => ({ ...prev, lowStockThresholdOverride: value }))
              }
              placeholder="e.g. 10"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.field}>
            <Text style={styles.label}>FX Loss Alert Threshold (GBP)</Text>
            <Text style={styles.hint}>Alert when FX loss exceeds this amount in GBP</Text>
            <TextInput
              style={styles.input}
              value={form.fxLossAlertThresholdGbp}
              onChangeText={(value) =>
                setForm((prev) => ({ ...prev, fxLossAlertThresholdGbp: value }))
              }
              placeholder="e.g. 500"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
            />
          </View>
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  rowContent: {
    flex: 1,
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  rowSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e7eb',
    marginVertical: 14,
  },
  field: {
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
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
