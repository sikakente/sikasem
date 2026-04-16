import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { productsApi } from '../../../lib/api/products.api';

type Tab = 'stock' | 'purchases' | 'shipments' | 'sales';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [stock, setStock] = useState<any[]>([]);
  const [history, setHistory] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>('stock');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([productsApi.get(id), productsApi.getStock(id), productsApi.getHistory(id)])
      .then(([p, s, h]) => {
        setProduct((p.data as any)?.data);
        setStock((s.data as any)?.data ?? []);
        setHistory((h.data as any)?.data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color="#2563eb" />;
  if (!product) return <Text style={{ margin: 24 }}>Product not found</Text>;

  const totalStock = stock.reduce((sum: number, b: any) => sum + Number(b.quantityOnHand), 0);
  const isLowStock = totalStock < Number(product.minimumStockThreshold);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'stock', label: 'Stock' },
    { key: 'purchases', label: 'Purchases' },
    { key: 'shipments', label: 'Shipments' },
    { key: 'sales', label: 'Sales' },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.name}>{product.name}</Text>
            <Text style={styles.meta}>SKU: {product.sku}</Text>
            {product.barcode && <Text style={styles.meta}>Barcode: {product.barcode}</Text>}
            {product.category && <Text style={styles.meta}>Category: {product.category.name}</Text>}
            {product.brand && <Text style={styles.meta}>Brand: {product.brand}</Text>}
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push(`/(app)/products/${id}/edit`)}
          >
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {isLowStock && (
          <View style={styles.lowStockBanner}>
            <Text style={styles.lowStockText}>
              ⚠ Low Stock — {totalStock} remaining (min: {product.minimumStockThreshold})
            </Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.tabContent}>
        {activeTab === 'stock' && (
          <>
            {stock.map((b: any) => (
              <View key={b.id} style={styles.stockCard}>
                <Text style={styles.stockLocation}>{b.location?.name ?? b.locationId}</Text>
                <View>
                  <Text style={styles.stockQty}>{Number(b.quantityOnHand).toFixed(0)} on hand</Text>
                  <Text style={styles.stockSub}>
                    {Number(b.quantityAllocated).toFixed(0)} allocated ·{' '}
                    {Number(b.quantityAvailable).toFixed(0)} available
                  </Text>
                </View>
              </View>
            ))}
            {stock.length === 0 && (
              <Text style={styles.empty}>No stock data yet (see STEP-03)</Text>
            )}
          </>
        )}

        {activeTab === 'purchases' && (
          <>
            {history?.purchaseItems?.map((i: any) => (
              <View key={i.id} style={styles.histRow}>
                <Text style={styles.histRef}>{i.purchaseOrder?.referenceNo}</Text>
                <Text style={styles.histDate}>{i.purchaseOrder?.purchaseDate?.slice(0, 10)}</Text>
                <Text style={styles.histQty}>
                  ×{Number(i.quantity).toFixed(0)} @ £{Number(i.unitCostGbp).toFixed(2)}
                </Text>
              </View>
            ))}
            {!history?.purchaseItems?.length && <Text style={styles.empty}>No purchases yet</Text>}
          </>
        )}

        {activeTab === 'shipments' && (
          <>
            {history?.shipmentItems?.map((i: any) => (
              <View key={i.id} style={styles.histRow}>
                <Text style={styles.histRef}>{i.shipment?.shipmentReference}</Text>
                <Text style={styles.histDate}>{i.shipment?.dispatchDate?.slice(0, 10) ?? '—'}</Text>
                <Text style={styles.histQty}>×{Number(i.quantity).toFixed(0)}</Text>
              </View>
            ))}
            {!history?.shipmentItems?.length && <Text style={styles.empty}>No shipments yet</Text>}
          </>
        )}

        {activeTab === 'sales' && (
          <>
            {history?.saleItems?.map((i: any) => (
              <View key={i.id} style={styles.histRow}>
                <Text style={styles.histRef}>{i.sale?.saleReference}</Text>
                <Text style={styles.histDate}>{i.sale?.saleDatetime?.slice(0, 10)}</Text>
                <Text style={styles.histQty}>×{Number(i.quantity).toFixed(0)}</Text>
              </View>
            ))}
            {!history?.saleItems?.length && <Text style={styles.empty}>No sales yet</Text>}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#fff', padding: 20, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 },
  meta: { fontSize: 13, color: '#6b7280', marginBottom: 2 },
  editBtn: {
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  editBtnText: { color: '#2563eb', fontSize: 13, fontWeight: '600' },
  lowStockBanner: { marginTop: 12, backgroundColor: '#fef3c7', borderRadius: 8, padding: 10 },
  lowStockText: { color: '#92400e', fontSize: 13, fontWeight: '500' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderColor: '#2563eb' },
  tabText: { fontSize: 13, color: '#6b7280' },
  tabTextActive: { color: '#2563eb', fontWeight: '600' },
  tabContent: { padding: 16 },
  stockCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockLocation: { fontSize: 14, fontWeight: '600', color: '#111827' },
  stockQty: { fontSize: 14, color: '#111827', textAlign: 'right' },
  stockSub: { fontSize: 12, color: '#9ca3af', textAlign: 'right' },
  histRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#f3f4f6',
  },
  histRef: { fontSize: 13, color: '#374151', flex: 1 },
  histDate: { fontSize: 12, color: '#9ca3af', marginHorizontal: 8 },
  histQty: { fontSize: 13, fontWeight: '600', color: '#111827' },
  empty: {
    color: '#9ca3af',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
});
