import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { productsApi } from '../../../lib/api/products.api';
import { usePosStore } from '../../../store/pos.store';

interface ProductResult {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  retailPriceGhs: number | null;
}

export default function PosScreen() {
  const router = useRouter();
  const store = usePosStore();
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<ProductResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await productsApi.list({ search: text, limit: 20 });
        setSearchResults((res.data as any).data ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  const handleAddProduct = (product: ProductResult) => {
    store.addItem({
      productId: product.id,
      productName: product.name,
      barcode: product.barcode ?? '',
      unitPriceGhs: product.retailPriceGhs ?? 0,
    });
    setSearch('');
    setSearchResults([]);
  };

  const renderCartItem = ({ item }: { item: (typeof store.cartItems)[0] }) => {
    const lineTotal = item.unitPriceGhs * item.quantity - item.discountAmountGhs;
    return (
      <View style={styles.cartItem}>
        <View style={styles.cartItemInfo}>
          <Text style={styles.cartItemName}>{item.productName}</Text>
          <Text style={styles.cartItemPrice}>GHS {item.unitPriceGhs.toFixed(2)} each</Text>
          {item.discountAmountGhs > 0 && (
            <Text style={styles.cartItemDiscount}>
              Discount: -GHS {item.discountAmountGhs.toFixed(2)}
            </Text>
          )}
        </View>
        <View style={styles.cartItemRight}>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => store.updateQuantity(item.productId, item.quantity - 1)}
              accessibilityLabel={`Decrease ${item.productName} quantity`}
              accessibilityRole="button"
            >
              <Text style={styles.stepBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.stepQty}>{item.quantity}</Text>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => store.updateQuantity(item.productId, item.quantity + 1)}
              accessibilityLabel={`Increase ${item.productName} quantity`}
              accessibilityRole="button"
            >
              <Text style={styles.stepBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.cartItemLineTotal}>GHS {lineTotal.toFixed(2)}</Text>
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => store.removeItem(item.productId)}
            accessibilityLabel={`Remove ${item.productName} from cart`}
            accessibilityRole="button"
          >
            <Text style={styles.removeBtnText}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchWrapper}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={handleSearch}
        />
        {searching && (
          <ActivityIndicator style={styles.searchSpinner} color="#2563eb" size="small" />
        )}
      </View>

      {/* Search results dropdown */}
      {searchResults.length > 0 && (
        <View style={styles.searchDropdown}>
          {searchResults.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={styles.searchResultItem}
              onPress={() => handleAddProduct(product)}
            >
              <Text style={styles.searchResultName}>{product.name}</Text>
              <Text style={styles.searchResultMeta}>
                {product.sku} · GHS {(product.retailPriceGhs ?? 0).toFixed(2)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Cart */}
      {store.cartItems.length === 0 ? (
        <View style={styles.emptyCart}>
          <Text style={styles.emptyCartText}>Your cart is empty</Text>
          <Text style={styles.emptyCartSub}>Search for products above to add them</Text>
        </View>
      ) : (
        <FlatList
          data={store.cartItems}
          keyExtractor={(item) => item.productId}
          renderItem={renderCartItem}
          contentContainerStyle={styles.cartList}
          style={styles.cartScroll}
        />
      )}

      {/* Sticky bottom bar */}
      {store.cartItems.length > 0 && (
        <View style={styles.bottomBar}>
          <View style={styles.bottomBarInfo}>
            <Text style={styles.bottomBarLabel}>
              {store.cartItems.length} item{store.cartItems.length !== 1 ? 's' : ''}
            </Text>
            <Text style={styles.bottomBarTotal}>Total: GHS {store.total().toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={styles.chargeBtn}
            onPress={() => router.push('/(app)/pos/payment')}
          >
            <Text style={styles.chargeBtnText}>Charge</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  searchWrapper: {
    margin: 16,
    marginBottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    color: '#111827',
    fontSize: 15,
  },
  searchSpinner: { position: 'absolute', right: 12 },
  searchDropdown: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    marginTop: 4,
    maxHeight: 220,
    overflow: 'hidden',
    zIndex: 10,
  },
  searchResultItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  searchResultName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  searchResultMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  emptyCart: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyCartText: { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 8 },
  emptyCartSub: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
  cartScroll: { flex: 1 },
  cartList: { padding: 16, paddingBottom: 120 },
  cartItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cartItemInfo: { flex: 1 },
  cartItemName: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  cartItemPrice: { fontSize: 13, color: '#6b7280' },
  cartItemDiscount: { fontSize: 12, color: '#dc2626', marginTop: 2 },
  cartItemRight: { alignItems: 'flex-end', gap: 6, marginLeft: 12 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    overflow: 'hidden',
  },
  stepBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  stepBtnText: { fontSize: 18, color: '#374151', lineHeight: 22 },
  stepQty: {
    width: 36,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  cartItemLineTotal: { fontSize: 15, fontWeight: '700', color: '#111827' },
  removeBtn: { paddingVertical: 2 },
  removeBtnText: { fontSize: 12, color: '#dc2626' },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 28,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 8,
  },
  bottomBarInfo: { flex: 1 },
  bottomBarLabel: { fontSize: 12, color: '#6b7280' },
  bottomBarTotal: { fontSize: 18, fontWeight: '700', color: '#111827' },
  chargeBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 10,
  },
  chargeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
