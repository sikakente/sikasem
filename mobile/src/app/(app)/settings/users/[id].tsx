import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { usersApi } from '../../../../lib/api/users.api';
import { authApi } from '../../../../lib/api/auth.api';

const ROLES = ['admin', 'operations', 'warehouse', 'pos_cashier', 'finance', 'viewer'] as const;
type Role = (typeof ROLES)[number];

interface UserForm {
  fullName: string;
  email: string;
  password: string;
  selectedRole: Role;
  isActive: boolean;
}

const EMPTY_FORM: UserForm = {
  fullName: '',
  email: '',
  password: '',
  selectedRole: 'viewer',
  isActive: true,
};

export default function EditUserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        setFetchError(null);
        const response = await usersApi.get(id);
        const data =
          (response.data as { data: Record<string, unknown> }).data ??
          (response.data as Record<string, unknown>);
        if (data) {
          const roles = Array.isArray(data.roles) ? (data.roles as string[]) : [];
          const firstRole = roles[0] as Role | undefined;
          setForm({
            fullName: String(data.fullName ?? ''),
            email: String(data.email ?? ''),
            password: '',
            selectedRole: ROLES.includes(firstRole as Role) ? (firstRole as Role) : 'viewer',
            isActive: Boolean(data.isActive ?? true),
          });
        }
      } catch {
        setFetchError('Failed to load user details.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const update = (field: keyof UserForm) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!id) return;
    if (!form.fullName.trim()) {
      Alert.alert('Validation', 'Full name is required.');
      return;
    }
    if (!form.email.trim()) {
      Alert.alert('Validation', 'Email is required.');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        roles: [form.selectedRole],
        isActive: form.isActive,
      };
      if (form.password) {
        payload.password = form.password;
      }
      await usersApi.update(id, payload);
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to update user. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = () => {
    if (!form.email) return;
    Alert.alert('Reset Password', `Send a password reset email to ${form.email}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send',
        onPress: async () => {
          try {
            await authApi.forgotPassword(form.email);
            Alert.alert('Sent', 'Password reset email has been sent.');
          } catch {
            Alert.alert('Error', 'Failed to send reset email. Please try again.');
          }
        },
      },
    ]);
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

      <View style={styles.card}>
        <View style={styles.field}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={form.fullName}
            onChangeText={update('fullName')}
            placeholder="Jane Smith"
            placeholderTextColor="#9ca3af"
            autoCapitalize="words"
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={form.email}
            onChangeText={update('email')}
            placeholder="jane@example.com"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.field}>
          <Text style={styles.label}>New Password (optional)</Text>
          <TextInput
            style={styles.input}
            value={form.password}
            onChangeText={update('password')}
            placeholder="Leave blank to keep current"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.label}>Active</Text>
            <Text style={styles.hint}>Inactive users cannot log in</Text>
          </View>
          <Switch
            value={form.isActive}
            onValueChange={(value) => setForm((prev) => ({ ...prev, isActive: value }))}
            trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
            thumbColor={form.isActive ? '#2563eb' : '#9ca3af'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Role</Text>
        <View style={styles.card}>
          {ROLES.map((role, index) => (
            <View key={role}>
              <TouchableOpacity
                style={styles.roleRow}
                onPress={() => setForm((prev) => ({ ...prev, selectedRole: role }))}
                activeOpacity={0.7}
              >
                <Text style={styles.roleLabel}>{role}</Text>
                <View
                  style={[
                    styles.radioOuter,
                    form.selectedRole === role && styles.radioOuterSelected,
                  ]}
                >
                  {form.selectedRole === role && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
              {index < ROLES.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={styles.resetButton}
        onPress={handleResetPassword}
        activeOpacity={0.8}
      >
        <Text style={styles.resetButtonText}>Reset Password</Text>
      </TouchableOpacity>

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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12,
    borderRadius: 8,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  field: {
    paddingVertical: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  hint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
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
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e7eb',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  roleLabel: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: '#2563eb',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563eb',
  },
  resetButton: {
    marginTop: 20,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  resetButtonText: {
    color: '#b45309',
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    marginTop: 12,
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
