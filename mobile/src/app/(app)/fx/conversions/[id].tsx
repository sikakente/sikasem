import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { fxApi } from '../../../../lib/api/fx.api';

interface ConversionDetail {
  id: string;
  conversionReference: string;
  conversionDate: string;
  sourceCurrency: string;
  sourceAmount: number;
  destinationCurrency: string;
  destinationAmount: number;
  exchangeRate: number;
  feesGbp: number | null;
  notes: string | null;
  createdAt: string;
  createdByUser: { email: string };
  saleLinks: {
    id: string;
    amountGhsAllocated: number;
    sale: { id: string; totalGhs: number; createdAt: string } | null;
  }[];
}

export default function ConversionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [conversion, setConversion] = useState<ConversionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fxApi
      .getConversion(id)
      .then((res) => setConversion((res.data as any).data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <ActivityIndicator style={styles.loader} color="#2563eb" />;
  if (!conversion) return <Text style={styles.error}>Conversion not found</Text>;

  const netGbp = Number(conversion.destinationAmount) - Number(conversion.feesGbp ?? 0);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.ref}>{conversion.conversionReference}</Text>

      <View style={styles.card}>
        <Row label="Date" value={new Date(conversion.conversionDate).toLocaleDateString()} />
        <Row label="GHS In" value={`GHS ${Number(conversion.sourceAmount).toFixed(2)}`} />
        <Row
          label="GBP Received"
          value={`GBP ${Number(conversion.destinationAmount).toFixed(2)}`}
        />
        <Row label="Rate" value={`${Number(conversion.exchangeRate).toFixed(6)} GBP/GHS`} />
        {conversion.feesGbp != null && (
          <Row label="Fees" value={`GBP ${Number(conversion.feesGbp).toFixed(2)}`} />
        )}
        <Row label="Net GBP" value={`GBP ${netGbp.toFixed(2)}`} />
        {conversion.notes && <Row label="Notes" value={conversion.notes} />}
        <Row label="Recorded by" value={conversion.createdByUser.email} />
        <Row label="Created" value={new Date(conversion.createdAt).toLocaleString()} />
      </View>

      {conversion.saleLinks.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Linked Sales</Text>
          {conversion.saleLinks.map((link) => (
            <View key={link.id} style={styles.linkCard}>
              <Text style={styles.linkText}>
                GHS {Number(link.amountGhsAllocated).toFixed(2)} allocated
              </Text>
              {link.sale && (
                <Text style={styles.linkMeta}>
                  Sale total: GHS {Number(link.sale.totalGhs).toFixed(2)} ·{' '}
                  {new Date(link.sale.createdAt).toLocaleDateString()}
                </Text>
              )}
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  loader: { marginTop: 60 },
  error: { textAlign: 'center', marginTop: 60, color: '#9ca3af' },
  ref: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  rowLabel: { fontSize: 13, color: '#6b7280' },
  rowValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    flexShrink: 1,
    textAlign: 'right',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 8 },
  linkCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  linkText: { fontSize: 14, fontWeight: '600', color: '#1e40af' },
  linkMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
});
