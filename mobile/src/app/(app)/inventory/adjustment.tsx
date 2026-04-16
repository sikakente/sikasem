import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { inventoryApi } from '../../../lib/api/inventory.api';
import { productsApi } from '../../../lib/api/products.api';

type AdjustmentType = 'add' | 'remove';

interface ProductOption {
  id: string;
  name: string;
  sku: string;
}

interface LocationOption {
  id: string;
  name: string;
  quantityOnHand: number;
}

export default function AdjustmentScreen() {
  const { productId: initialProductId } = useLocalSearchParams<{ productId?: string }>();
  const router = useRouter();

  // Step tracking: product → location → details → confirm
  const [step, setStep] = useState<'product' | 'details'>(initialProductId ? 'details' : 'product');

  // Product search
  const [search, setSearch] = useState('');
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Selected values
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationOption | null>(null);
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);

  // Form
  const [type, setType] = useState<AdjustmentType>('add');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load pre-selected product from params
  useEffect(() => {
    if (!initialProductId) return;
    setLocationsLoading(true);
    Promise.all([productsApi.get(initialProductId), inventoryApi.getProductStock(initialProductId)])
      .then(([pRes, sRes]) => {
        const prod = (pRes.data as any)?.data;
        if (prod) {
          setSelectedProduct({ id: prod.id, name: prod.name, sku: prod.sku });
        }
        const balances: any[] = (sRes.data as any)?.data ?? [];
        setLocationOptions(
          balances.map((b: any) => ({
            id: b.locationId,
            name: b.location?.name ?? b.locationId,
            quantityOnHand: Number(b.quantityOnHand) || 0,
          })),
        );
        if (balances.length === 1) {
          setSelectedLocation({
            id: balances[0].locationId,
            name: balances[0].location?.name ?? balances[0].locationId,
            quantityOnHand: Number(balances[0].quantityOnHand) || 0,
          });
        }
      })
      .finally(() => setLocationsLoading(false));
  }, [initialProductId]);

  // Search products
  useEffect(() => {
    if (step !== 'product') return;
    const timeout = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await productsApi.list({ search: search || undefined, limit: 20 });
        const raw = (res.data as any)?.data;
        const items: any[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.products)
            ? raw.products
            : [];
        setProductOptions(items.map((p: any) => ({ id: p.id, name: p.name, sku: p.sku })));
      } catch {
        setProductOptions([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, step]);

  const handleSelectProduct = async (product: ProductOption) => {
    setSelectedProduct(product);
    setSelectedLocation(null);
    setLocationOptions([]);
    setLocationsLoading(true);
    setStep('details');
    try {
      const res = await inventoryApi.getProductStock(product.id);
      const balances: any[] = (res.data as any)?.data ?? [];
      const locs = balances.map((b: any) => ({
        id: b.locationId,
        name: b.location?.name ?? b.locationId,
        quantityOnHand: Number(b.quantityOnHand) || 0,
      }));
      setLocationOptions(locs);
      if (locs.length === 1) setSelectedLocation(locs[0]);
    } catch {
      setLocationOptions([]);
    } finally {
      setLocationsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedProduct) {
      setError('Select a product.');
      return;
    }
    if (!selectedLocation) {
      setError('Select a location.');
      return;
    }
    const qty = parseInt(quantity, 10);
    if (!quantity.trim() || isNaN(qty) || qty <= 0) {
      setError('Enter a valid quantity greater than 0.');
      return;
    }
    if (!reason.trim()) {
      setError('Reason is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await inventoryApi.createAdjustment({
        productId: selectedProduct.id,
        locationId: selectedLocation.id,
        type,
        quantity: qty,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      });
      setSuccess(true);
    } catch {
      setError('Failed to submit adjustment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ───────────────────────────────────────────────────────────
  if (success) {
    return (
      <View style={styles.centered}>
        <View style={styles.successCard}>
          <View style={styles.successIconWrap}>
            <Ionicons name="checkmark" size={36} color="#fff" />
          </View>
          <Text style={styles.successTitle}>Adjustment Saved</Text>
          <Text style={styles.successSubtitle}>
            {type === 'add' ? '+' : '-'}
            {quantity} units {type === 'add' ? 'added to' : 'removed from'} {selectedProduct?.name}{' '}
            at {selectedLocation?.name}
          </Text>
          <View style={styles.successActions}>
            <TouchableOpacity
              style={styles.successSecondary}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Text style={styles.successSecondaryText}>Back to Inventory</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.successPrimary}
              onPress={() => {
                setSuccess(false);
                setStep('product');
                setSelectedProduct(null);
                setSelectedLocation(null);
                setQuantity('');
                setReason('');
                setNotes('');
                setError(null);
                setSearch('');
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.successPrimaryText}>New Adjustment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ── Step 1: Product picker ───────────────────────────────────────────────────
  if (step === 'product') {
    return (
      <View style={styles.container}>
        <View style={styles.searchHeader}>
          <Text style={styles.stepTitle}>Select Product</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or SKU..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            autoFocus
            clearButtonMode="while-editing"
          />
        </View>
        {searchLoading ? (
          <ActivityIndicator style={{ marginTop: 32 }} color="#2563eb" />
        ) : (
          <FlatList
            data={productOptions}
            keyExtractor={(p) => p.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.productRow}
                onPress={() => handleSelectProduct(item)}
                activeOpacity={0.75}
              >
                <View style={styles.productAvatar}>
                  <Text style={styles.productAvatarText}>{item.name[0]?.toUpperCase()}</Text>
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{item.name}</Text>
                  <Text style={styles.productSku}>{item.sku}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {search ? 'No products match your search' : 'Start typing to search products'}
              </Text>
            }
          />
        )}
      </View>
    );
  }

  // ── Step 2: Details ──────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Selected product header */}
        <TouchableOpacity
          style={styles.selectedProductCard}
          onPress={() => setStep('product')}
          activeOpacity={0.8}
        >
          <View style={styles.selectedProductInfo}>
            <Text style={styles.selectedProductLabel}>Product</Text>
            <Text style={styles.selectedProductName}>{selectedProduct?.name}</Text>
            <Text style={styles.selectedProductSku}>{selectedProduct?.sku}</Text>
          </View>
          <View style={styles.changeChip}>
            <Text style={styles.changeChipText}>Change</Text>
          </View>
        </TouchableOpacity>

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Location selector */}
        <View style={styles.section}>
          <Text style={styles.label}>Location</Text>
          {locationsLoading ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : locationOptions.length === 0 ? (
            <Text style={styles.hintText}>No stock locations found for this product.</Text>
          ) : (
            <View style={styles.locationGrid}>
              {locationOptions.map((loc) => (
                <TouchableOpacity
                  key={loc.id}
                  style={[
                    styles.locationCard,
                    selectedLocation?.id === loc.id && styles.locationCardActive,
                  ]}
                  onPress={() => setSelectedLocation(loc)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="location-outline"
                    size={16}
                    color={selectedLocation?.id === loc.id ? '#2563eb' : '#94a3b8'}
                  />
                  <Text
                    style={[
                      styles.locationName,
                      selectedLocation?.id === loc.id && styles.locationNameActive,
                    ]}
                  >
                    {loc.name}
                  </Text>
                  <Text style={styles.locationStock}>{loc.quantityOnHand} on hand</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Add / Remove toggle */}
        <View style={styles.section}>
          <Text style={styles.label}>Adjustment Type</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeButton, type === 'add' && styles.typeButtonAdd]}
              onPress={() => setType('add')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="add-circle-outline"
                size={18}
                color={type === 'add' ? '#16a34a' : '#94a3b8'}
              />
              <Text style={[styles.typeText, type === 'add' && styles.typeTextAdd]}>Add Stock</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, type === 'remove' && styles.typeButtonRemove]}
              onPress={() => setType('remove')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="remove-circle-outline"
                size={18}
                color={type === 'remove' ? '#dc2626' : '#94a3b8'}
              />
              <Text style={[styles.typeText, type === 'remove' && styles.typeTextRemove]}>
                Remove Stock
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quantity */}
        <View style={styles.section}>
          <Text style={styles.label}>Quantity</Text>
          <TextInput
            style={styles.quantityInput}
            placeholder="0"
            placeholderTextColor="#cbd5e1"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="number-pad"
            returnKeyType="done"
          />
        </View>

        {/* Reason */}
        <View style={styles.section}>
          <Text style={styles.label}>Reason *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Damaged goods, Stock count correction"
            placeholderTextColor="#9ca3af"
            value={reason}
            onChangeText={setReason}
          />
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Notes <Text style={styles.optional}>(optional)</Text>
          </Text>
          <TextInput
            style={styles.textArea}
            placeholder="Additional notes..."
            placeholderTextColor="#9ca3af"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons
                name={type === 'add' ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline'}
                size={20}
                color="#fff"
              />
              <Text style={styles.submitButtonText}>{type === 'add' ? 'Add' : 'Remove'} Stock</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 16, paddingBottom: 48 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    padding: 24,
  },

  // Product search step
  searchHeader: {
    padding: 16,
    paddingBottom: 8,
    gap: 12,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  listContent: { padding: 16, paddingTop: 8, gap: 8 },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  productAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productAvatarText: { fontSize: 16, fontWeight: '800', color: '#2563EB' },
  productInfo: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  productSku: { fontSize: 12, color: '#64748B', marginTop: 1 },
  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 14,
    paddingTop: 32,
  },

  // Details step
  selectedProductCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  selectedProductInfo: { flex: 1 },
  selectedProductLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3B82F6',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  selectedProductName: { fontSize: 15, fontWeight: '800', color: '#1E3A8A' },
  selectedProductSku: { fontSize: 12, color: '#3B82F6', marginTop: 1 },
  changeChip: {
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  changeChipText: { fontSize: 12, fontWeight: '700', color: '#1D4ED8' },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: { color: '#DC2626', fontSize: 13, flex: 1 },

  section: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 8, letterSpacing: 0.1 },
  optional: { fontWeight: '400', color: '#94A3B8' },
  hintText: { fontSize: 13, color: '#94A3B8' },

  locationGrid: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  locationCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  locationCardActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  locationName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  locationNameActive: { color: '#1D4ED8' },
  locationStock: { fontSize: 12, color: '#94A3B8' },

  typeRow: { flexDirection: 'row', gap: 10 },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  typeButtonAdd: { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' },
  typeButtonRemove: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
  typeText: { fontSize: 14, fontWeight: '700', color: '#94A3B8' },
  typeTextAdd: { color: '#16A34A' },
  typeTextRemove: { color: '#DC2626' },

  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quantityInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 18,
    fontSize: 36,
    fontWeight: '800',
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    textAlign: 'center',
    letterSpacing: -1,
  },
  textArea: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 90,
  },

  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { fontSize: 16, fontWeight: '800', color: '#fff' },

  // Success
  successCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  successIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  successSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  successActions: { flexDirection: 'row', gap: 10, width: '100%' },
  successSecondary: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  successSecondaryText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  successPrimary: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  successPrimaryText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
