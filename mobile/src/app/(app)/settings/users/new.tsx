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
import { router } from 'expo-router';
import { useState } from 'react';
import { usersApi } from '../../../../lib/api/users.api';

const ROLES = ['admin', 'operations', 'warehouse', 'pos_cashier', 'finance', 'viewer'] as const;
type Role = (typeof ROLES)[number];

interface UserForm {
  fullName: string;
  email: string;
  password: string;
  selectedRole: Role;
}

const EMPTY_FORM: UserForm = {
  fullName: '',
  email: '',
  password: '',
  selectedRole: 'viewer',
};

export default function NewUserScreen() {
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const update = (field: keyof UserForm) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.fullName.trim()) {
      Alert.alert('Validation', 'Full name is required.');
      return;
    }
    if (!form.email.trim()) {
      Alert.alert('Validation', 'Email is required.');
      return;
    }
    if (!form.password) {
      Alert.alert('Validation', 'Password is required.');
      return;
    }

    setSaving(true);
    try {
      await usersApi.create({
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        roles: [form.selectedRole],
      });
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to create user. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
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
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={form.password}
            onChangeText={update('password')}
            placeholder="Minimum 8 characters"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
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
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Create User</Text>
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
    padding: 16,
    paddingBottom: 40,
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
  saveButton: {
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
