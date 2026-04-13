import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { dashboardApi } from '../../../lib/api/dashboard.api';

interface ProductEntry {
  id: string;
  name: string;
  sku: string;
  totalQuantity: number;
  totalRevenueGhs: number;
}

interface TopProductsData {
  bestSelling: ProductEntry[];
  highRevenue: ProductEntry[];
  slowMoving: ProductEntry[];
}

function ProductList({ products, label }: { products: ProductEntry[]; label: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{label}</Text>
      {products.length === 0 ? (
        <Text style={styles.empty}>No data</Text>
      ) : (
        products.map((p, i) => (
          <View key={p.id} style={styles.productRow}>
            <Text style={styles.rank}>#{i + 1}</Text>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{p.name}</Text>
              <Text style={styles.productSku}>{p.sku}</Text>
            </View>
            <View style={styles.productStats}>
              <Text style={styles.statValue}>{p.totalQuantity.toLocaleString()} units</Text>
              <Text style={styles.statSub}>GHS {p.totalRevenueGhs.toLocaleString()}</Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

export default function ProductsDrilldownScreen() {
  const [data, setData] = useState<TopProductsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi
      .getTopProducts()
      .then((res) => setData((res.data as any).data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Product Profitability</Text>
      <ProductList products={data?.bestSelling ?? []} label="Best Selling (by Quantity)" />
      <ProductList products={data?.highRevenue ?? []} label="Best by Revenue" />
      <ProductList products={data?.slowMoving ?? []} label="Slowest Moving" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  empty: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 12 },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 10,
  },
  rank: { fontSize: 14, fontWeight: '700', color: '#9ca3af', width: 24 },
  productInfo: { flex: 1 },
  productName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  productSku: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  productStats: { alignItems: 'flex-end' },
  statValue: { fontSize: 13, fontWeight: '700', color: '#111827' },
  statSub: { fontSize: 11, color: '#6b7280', marginTop: 2 },
});
