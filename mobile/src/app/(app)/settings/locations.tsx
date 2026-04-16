import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Switch,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../../lib/api/admin.api';

const LOCATION_TYPES = ['UK Warehouse', 'Ghana Warehouse', 'Ghana Shop', 'Shipment'] as const;
type LocationType = (typeof LOCATION_TYPES)[number];

interface Location {
  id: string;
  name: string;
  locationType: string;
  country: string;
  city?: string;
  isActive: boolean;
}

interface LocationForm {
  name: string;
  locationType: LocationType;
  country: string;
  city: string;
  isActive: boolean;
}

const EMPTY_FORM: LocationForm = {
  name: '',
  locationType: 'UK Warehouse',
  country: '',
  city: '',
  isActive: true,
};

export default function LocationsScreen() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LocationForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
    try {
      setFetchError(null);
      const response = await adminApi.getLocations();
      const data = (response.data as { data: Location[] }).data ?? (response.data as Location[]);
      setLocations(Array.isArray(data) ? data : []);
    } catch {
      setFetchError('Failed to load locations.');
    }
  }, []);

  useEffect(() => {
    fetchLocations().finally(() => setLoading(false));
  }, [fetchLocations]);

  const handleAddNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const handleEdit = (location: Location) => {
    setEditingId(location.id);
    setForm({
      name: location.name,
      locationType: (LOCATION_TYPES.includes(location.locationType as LocationType)
        ? location.locationType
        : 'UK Warehouse') as LocationType,
      country: location.country ?? '',
      city: location.city ?? '',
      isActive: location.isActive ?? true,
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Validation', 'Location name is required.');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        locationType: form.locationType,
        country: form.country.trim(),
        city: form.city.trim() || undefined,
        isActive: form.isActive,
      };
      if (editingId) {
        await adminApi.updateLocation(editingId, payload);
      } else {
        await adminApi.createLocation(payload);
      }
      await fetchLocations();
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      Alert.alert('Saved', editingId ? 'Location updated.' : 'Location created.');
    } catch {
      Alert.alert('Error', 'Failed to save location. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const update = (field: keyof LocationForm) => (value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const renderLocation = ({ item }: { item: Location }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleEdit(item)} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.locationName}>{item.name}</Text>
          <View style={[styles.badge, item.isActive ? styles.badgeActive : styles.badgeInactive]}>
            <Text
              style={[
                styles.badgeText,
                item.isActive ? styles.badgeTextActive : styles.badgeTextInactive,
              ]}
            >
              {item.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
        <Text style={styles.locationType}>{item.locationType}</Text>
        <Text style={styles.locationAddress}>
          {[item.city, item.country].filter(Boolean).join(', ')}
        </Text>
      </View>
    </TouchableOpacity>
  );

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

      {showForm ? (
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>{editingId ? 'Edit Location' : 'New Location'}</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={update('name')}
              placeholder="Location name"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Location Type</Text>
            <View style={styles.typeButtons}>
              {LOCATION_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeButton, form.locationType === type && styles.typeButtonActive]}
                  onPress={() => setForm((prev) => ({ ...prev, locationType: type }))}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      form.locationType === type && styles.typeButtonTextActive,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Country</Text>
            <TextInput
              style={styles.input}
              value={form.country}
              onChangeText={update('country')}
              placeholder="e.g. United Kingdom"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>City (optional)</Text>
            <TextInput
              style={styles.input}
              value={form.city}
              onChangeText={update('city')}
              placeholder="e.g. London"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.label}>Active</Text>
            <Switch
              value={form.isActive}
              onValueChange={(value) => setForm((prev) => ({ ...prev, isActive: value }))}
              trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
              thumbColor={form.isActive ? '#2563eb' : '#9ca3af'}
            />
          </View>

          <View style={styles.formActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
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
                <Text style={styles.saveButtonText}>{editingId ? 'Update' : 'Create'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <FlatList
          data={locations}
          keyExtractor={(item) => item.id}
          renderItem={renderLocation}
          contentContainerStyle={locations.length === 0 ? styles.listEmpty : styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No locations yet</Text>
              <Text style={styles.emptySubtitle}>Tap + to add your first location</Text>
            </View>
          }
        />
      )}

      {!showForm && (
        <TouchableOpacity style={styles.fab} onPress={handleAddNew} activeOpacity={0.85}>
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}
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
  listContent: {
    padding: 16,
    gap: 12,
  },
  listEmpty: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    gap: 4,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  locationType: {
    fontSize: 13,
    color: '#6b7280',
  },
  locationAddress: {
    fontSize: 13,
    color: '#9ca3af',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeActive: {
    backgroundColor: '#f0fdf4',
  },
  badgeInactive: {
    backgroundColor: '#f3f4f6',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextActive: {
    color: '#16a34a',
  },
  badgeTextInactive: {
    color: '#6b7280',
  },
  formContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  field: {
    marginBottom: 16,
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
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  typeButtonActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  typeButtonText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: '#2563eb',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
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
    fontSize: 15,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  fabIcon: {
    fontSize: 28,
    color: '#fff',
    lineHeight: 32,
  },
});
