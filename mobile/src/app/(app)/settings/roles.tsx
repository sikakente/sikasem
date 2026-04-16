import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { rolesApi } from '../../../lib/api/users.api';

const PERMISSIONS = [
  'inventory.adjust',
  'inventory.override_negative',
  'sales.void',
  'sales.refund',
  'sales.discount',
  'shipments.dispatch',
  'shipments.receive',
  'reports.export',
  'users.manage',
  'fx.convert',
] as const;

type Permission = (typeof PERMISSIONS)[number];

const PERM_ABBR: Record<Permission, string> = {
  'inventory.adjust': 'inv.adj',
  'inventory.override_negative': 'inv.neg',
  'sales.void': 'sls.vd',
  'sales.refund': 'sls.ref',
  'sales.discount': 'sls.dis',
  'shipments.dispatch': 'shp.dsp',
  'shipments.receive': 'shp.rcv',
  'reports.export': 'rpt.exp',
  'users.manage': 'usr.mgr',
  'fx.convert': 'fx.cvt',
};

interface Role {
  id: string;
  name: string;
}

interface PermissionMatrix {
  [roleId: string]: Set<Permission>;
}

export default function RolesScreen() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [matrix, setMatrix] = useState<PermissionMatrix>({});
  const [original, setOriginal] = useState<PermissionMatrix>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setFetchError(null);
      const rolesResponse = await rolesApi.list();
      const rolesData =
        (rolesResponse.data as { data: Role[] }).data ?? (rolesResponse.data as Role[]);
      const roleList = Array.isArray(rolesData) ? rolesData : [];
      setRoles(roleList);

      const newMatrix: PermissionMatrix = {};
      await Promise.all(
        roleList.map(async (role) => {
          try {
            const permResponse = await rolesApi.getPermissions(role.id);
            const permData =
              (permResponse.data as { data: string[] }).data ?? (permResponse.data as string[]);
            newMatrix[role.id] = new Set((Array.isArray(permData) ? permData : []) as Permission[]);
          } catch {
            newMatrix[role.id] = new Set();
          }
        }),
      );

      setMatrix(newMatrix);
      setOriginal(Object.fromEntries(Object.entries(newMatrix).map(([k, v]) => [k, new Set(v)])));
    } catch {
      setFetchError('Failed to load roles and permissions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const togglePermission = (roleId: string, perm: Permission) => {
    setMatrix((prev) => {
      const updated = { ...prev };
      const perms = new Set(updated[roleId] ?? []);
      if (perms.has(perm)) {
        perms.delete(perm);
      } else {
        perms.add(perm);
      }
      updated[roleId] = perms;
      return updated;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Promise<unknown>[] = [];
      for (const role of roles) {
        const current = matrix[role.id] ?? new Set();
        const orig = original[role.id] ?? new Set();
        const changed = current.size !== orig.size || [...current].some((p) => !orig.has(p));
        if (changed) {
          updates.push(rolesApi.updatePermissions(role.id, [...current]));
        }
      }
      await Promise.all(updates);
      setOriginal(Object.fromEntries(Object.entries(matrix).map(([k, v]) => [k, new Set(v)])));
      Alert.alert('Saved', 'Permissions updated successfully.');
    } catch {
      Alert.alert('Error', 'Failed to save permissions. Please try again.');
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
    <View style={styles.container}>
      {fetchError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{fetchError}</Text>
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View>
            {/* Header row */}
            <View style={styles.tableRow}>
              <View style={styles.roleCell}>
                <Text style={styles.headerText}>Role</Text>
              </View>
              {PERMISSIONS.map((perm) => (
                <View key={perm} style={styles.permCell}>
                  <Text style={styles.permHeader}>{PERM_ABBR[perm]}</Text>
                </View>
              ))}
            </View>

            {/* Data rows */}
            {roles.map((role, rowIndex) => (
              <View
                key={role.id}
                style={[styles.tableRow, rowIndex % 2 === 0 && styles.tableRowAlt]}
              >
                <View style={styles.roleCell}>
                  <Text style={styles.roleName}>{role.name}</Text>
                </View>
                {PERMISSIONS.map((perm) => {
                  const hasPermission = matrix[role.id]?.has(perm) ?? false;
                  return (
                    <View key={perm} style={styles.permCell}>
                      <TouchableOpacity
                        style={[styles.checkbox, hasPermission && styles.checkboxChecked]}
                        onPress={() => togglePermission(role.id, perm)}
                        activeOpacity={0.7}
                      >
                        {hasPermission && <Text style={styles.checkmark}>✓</Text>}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </ScrollView>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Permissions</Text>
        )}
      </TouchableOpacity>
    </View>
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
  errorBanner: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  tableRowAlt: {
    backgroundColor: '#f9fafb',
  },
  roleCell: {
    width: 110,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#e5e7eb',
  },
  permCell: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  permHeader: {
    fontSize: 9,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
  },
  roleName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
    textTransform: 'capitalize',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  checkmark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },
  saveButton: {
    margin: 16,
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
