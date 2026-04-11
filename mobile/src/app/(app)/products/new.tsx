import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { productsApi } from '../../../lib/api/products.api';
import { BarcodeScanner } from '../../../components/BarcodeScanner';

const UNIT_TYPES = ['box', 'kg', 'litre', 'piece', 'pack', 'bag', 'carton'];

interface Category {
  id: string;
  name: string;
}

export default function NewProductScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    categoryId: '',
    brand: '',
    description: '',
    unitType: 'box',
    defaultCostPriceGbp: '',
    defaultSellingPriceGhs: '',
    minimumStockThreshold: '0',
    expiryTrackingEnabled: false,
    isActive: true,
  });

  useEffect(() => {
    productsApi.getCategories().then((res) => setCategories((res.data as any) ?? []));
  }, []);

  const set = (key: string) => (val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setError(null);
    if (!form.name || !form.sku || !form.unitType) {
      setError('Name, SKU and unit type are required');
      return;
    }
    setLoading(true);
    try {
      await productsApi.create({
        name: form.name,
        sku: form.sku,
        barcode: form.barcode || undefined,
        categoryId: form.categoryId || undefined,
        brand: form.brand || undefined,
        description: form.description || undefined,
        unitType: form.unitType,
        defaultCostPriceGbp: form.defaultCostPriceGbp
          ? Number(form.defaultCostPriceGbp)
          : undefined,
        defaultSellingPriceGhs: form.defaultSellingPriceGhs
          ? Number(form.defaultSellingPriceGhs)
          : undefined,
        minimumStockThreshold: Number(form.minimumStockThreshold) || 0,
        expiryTrackingEnabled: form.expiryTrackingEnabled,
        isActive: form.isActive,
      });
      router.back();
    } catch {
      setError('Failed to create product. Please try again.');
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
        {error && <Text style={styles.error}>{error}</Text>}

        <Text style={styles.section}>Basic Info</Text>
        <Text style={styles.label}>Name *</Text>
        <TextInput
          style={styles.input}
          value={form.name}
          onChangeText={set('name')}
          placeholder="Product name"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>SKU *</Text>
        <TextInput
          style={styles.input}
          value={form.sku}
          onChangeText={set('sku')}
          autoCapitalize="characters"
          placeholder="SKU-001"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Barcode</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            value={form.barcode}
            onChangeText={set('barcode')}
            keyboardType="number-pad"
            placeholder="Scan or type"
            placeholderTextColor="#9ca3af"
          />
          <TouchableOpacity style={styles.scanInline} onPress={() => setScannerOpen(true)}>
            <Text style={styles.scanText}>⊡</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 12 }} />

        <Text style={styles.label}>Brand</Text>
        <TextInput
          style={styles.input}
          value={form.brand}
          onChangeText={set('brand')}
          placeholder="Brand name"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={styles.chipRow}>
            {categories.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, form.categoryId === c.id && styles.chipActive]}
                onPress={() => setForm((f) => ({ ...f, categoryId: c.id }))}
              >
                <Text style={[styles.chipText, form.categoryId === c.id && styles.chipTextActive]}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Text style={styles.label}>Unit Type *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={styles.chipRow}>
            {UNIT_TYPES.map((u) => (
              <TouchableOpacity
                key={u}
                style={[styles.chip, form.unitType === u && styles.chipActive]}
                onPress={() => setForm((f) => ({ ...f, unitType: u }))}
              >
                <Text style={[styles.chipText, form.unitType === u && styles.chipTextActive]}>
                  {u}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Text style={styles.section}>Pricing</Text>
        <Text style={styles.label}>Cost Price (GBP)</Text>
        <TextInput
          style={styles.input}
          value={form.defaultCostPriceGbp}
          onChangeText={set('defaultCostPriceGbp')}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Selling Price (GHS)</Text>
        <TextInput
          style={styles.input}
          value={form.defaultSellingPriceGhs}
          onChangeText={set('defaultSellingPriceGhs')}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.section}>Stock Settings</Text>
        <Text style={styles.label}>Minimum Stock Threshold</Text>
        <TextInput
          style={styles.input}
          value={form.minimumStockThreshold}
          onChangeText={set('minimumStockThreshold')}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor="#9ca3af"
        />

        <View style={styles.toggleRow}>
          <Text style={styles.label}>Track Expiry</Text>
          <Switch
            value={form.expiryTrackingEnabled}
            onValueChange={(v) => setForm((f) => ({ ...f, expiryTrackingEnabled: v }))}
          />
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.label}>Active</Text>
          <Switch
            value={form.isActive}
            onValueChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Save Product</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <BarcodeScanner
        visible={scannerOpen}
        onScanned={(b) => {
          setForm((f) => ({ ...f, barcode: b }));
          setScannerOpen(false);
        }}
        onClose={() => setScannerOpen(false)}
      />
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
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  scanInline: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanText: { fontSize: 22 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 13, color: '#374151' },
  chipTextActive: { color: '#fff' },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
