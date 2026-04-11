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
import { suppliersApi } from '../../../lib/api/suppliers.api';

interface Product {
  id: string;
  name: string;
  sku: string;
}
interface SpendEntry {
  month: string;
  totalGbp: number;
}

export default function SupplierDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [supplier, setSupplier] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [spend, setSpend] = useState<SpendEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([suppliersApi.get(id), suppliersApi.getProducts(id), suppliersApi.getSpend(id)])
      .then(([s, p, sp]) => {
        setSupplier(s.data as any);
        setProducts((p.data as any) ?? []);
        setSpend((sp.data as any) ?? []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color="#2563eb" />;
  if (!supplier) return <Text style={{ margin: 24 }}>Supplier not found</Text>;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{supplier.name}</Text>
        <Text style={styles.meta}>
          {supplier.supplierType} · {supplier.city ?? supplier.country}
        </Text>
        {supplier.contactName && <Text style={styles.meta}>Contact: {supplier.contactName}</Text>}
        {supplier.phone && <Text style={styles.meta}>📞 {supplier.phone}</Text>}
        {supplier.email && <Text style={styles.meta}>✉️ {supplier.email}</Text>}
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push(`/(app)/suppliers/${id}/edit`)}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Products ({products.length})</Text>
        {products.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={styles.chip}
            onPress={() => router.push(`/(app)/products/${p.id}`)}
          >
            <Text style={styles.chipText}>{p.name}</Text>
            <Text style={styles.chipSub}>{p.sku}</Text>
          </TouchableOpacity>
        ))}
        {products.length === 0 && <Text style={styles.empty}>No products linked yet</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Spend Summary (GBP)</Text>
        {spend.map((s) => (
          <View key={s.month} style={styles.spendRow}>
            <Text style={styles.spendMonth}>{s.month}</Text>
            <Text style={styles.spendAmount}>£{Number(s.totalGbp).toFixed(2)}</Text>
          </View>
        ))}
        {spend.length === 0 && <Text style={styles.empty}>No purchase history yet</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#fff', padding: 20, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  name: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  meta: { fontSize: 14, color: '#6b7280', marginBottom: 2 },
  editButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  editButtonText: { color: '#2563eb', fontSize: 14, fontWeight: '600' },
  section: { margin: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  chip: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chipText: { fontSize: 14, color: '#111827', fontWeight: '500' },
  chipSub: { fontSize: 12, color: '#9ca3af' },
  spendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#f3f4f6',
  },
  spendMonth: { fontSize: 14, color: '#374151' },
  spendAmount: { fontSize: 14, fontWeight: '600', color: '#111827' },
  empty: { color: '#9ca3af', fontSize: 14, fontStyle: 'italic' },
});
