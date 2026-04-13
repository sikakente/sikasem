import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { invoicesApi } from '../../../lib/api/invoices.api';
import { InvoiceStatusBadge } from '../../../components/InvoiceStatusBadge';

interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  currencyCode: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingTotal: number;
  total: number;
  status: string;
  pdfUrl: string | null;
  notes: string | null;
  customer: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
  };
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    lineTotal: number;
    product: { id: string; name: string; sku: string } | null;
  }>;
  sale: { id: string; saleReference: string } | null;
}

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await invoicesApi.get(id);
      setInvoice((res.data as any).data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleOpenPdf = async () => {
    if (!invoice) return;
    setPdfLoading(true);
    try {
      const res = await invoicesApi.getPdfUrl(invoice.id);
      const url = (res.data as any).data?.url;
      if (url) await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Could not load PDF. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!invoice) return;
    Alert.alert('Mark as Paid', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark Paid',
        onPress: async () => {
          try {
            await invoicesApi.markPaid(invoice.id);
            load();
          } catch {
            Alert.alert('Error', 'Failed to mark invoice as paid.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 40 }} color="#2563eb" />;
  }

  if (!invoice) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Invoice not found</Text>
      </View>
    );
  }

  const isOverdue = invoice.status !== 'paid' && new Date(invoice.dueDate) < new Date();
  const effectiveStatus = isOverdue && invoice.status !== 'paid' ? 'overdue' : invoice.status;

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
          <InvoiceStatusBadge status={effectiveStatus} />
        </View>
        <Text style={styles.meta}>
          Invoice date: {new Date(invoice.invoiceDate).toLocaleDateString()}
        </Text>
        <Text style={styles.meta}>Due: {new Date(invoice.dueDate).toLocaleDateString()}</Text>
        {invoice.sale && <Text style={styles.meta}>Sale: {invoice.sale.saleReference}</Text>}
      </View>

      {/* Customer */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bill To</Text>
        <Text style={styles.customerName}>{invoice.customer.fullName}</Text>
        {invoice.customer.email && (
          <Text style={styles.customerMeta}>{invoice.customer.email}</Text>
        )}
        {invoice.customer.phone && (
          <Text style={styles.customerMeta}>{invoice.customer.phone}</Text>
        )}
      </View>

      {/* Line Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Items</Text>
        {invoice.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemDesc}>{item.description}</Text>
              {item.product && <Text style={styles.itemSku}>{item.product.sku}</Text>}
            </View>
            <Text style={styles.itemQty}>{Number(item.quantity)}×</Text>
            <Text style={styles.itemTotal}>
              {invoice.currencyCode} {Number(item.lineTotal).toFixed(2)}
            </Text>
          </View>
        ))}
      </View>

      {/* Totals */}
      <View style={styles.section}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>
            {invoice.currencyCode} {Number(invoice.subtotal).toFixed(2)}
          </Text>
        </View>
        {Number(invoice.discountTotal) > 0 && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Discount</Text>
            <Text style={[styles.totalValue, { color: '#10b981' }]}>
              − {invoice.currencyCode} {Number(invoice.discountTotal).toFixed(2)}
            </Text>
          </View>
        )}
        {Number(invoice.shippingTotal) > 0 && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Shipping</Text>
            <Text style={styles.totalValue}>
              {invoice.currencyCode} {Number(invoice.shippingTotal).toFixed(2)}
            </Text>
          </View>
        )}
        {Number(invoice.taxTotal) > 0 && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax</Text>
            <Text style={styles.totalValue}>
              {invoice.currencyCode} {Number(invoice.taxTotal).toFixed(2)}
            </Text>
          </View>
        )}
        <View style={[styles.totalRow, styles.totalRowBold]}>
          <Text style={styles.totalLabelBold}>Total</Text>
          <Text style={styles.totalValueBold}>
            {invoice.currencyCode} {Number(invoice.total).toFixed(2)}
          </Text>
        </View>
      </View>

      {/* PDF */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Document</Text>
        <TouchableOpacity style={styles.pdfBtn} onPress={handleOpenPdf} disabled={pdfLoading}>
          {pdfLoading ? (
            <ActivityIndicator color="#2563eb" />
          ) : (
            <Text style={styles.pdfBtnText}>View / Download PDF</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Notes */}
      {invoice.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notes}>{invoice.notes}</Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
          <TouchableOpacity style={styles.markPaidBtn} onPress={handleMarkPaid}>
            <Text style={styles.markPaidBtnText}>Mark as Paid</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.sendBtn}
          onPress={() =>
            Alert.alert('Coming Soon', 'Email sending will be available in a future update.')
          }
        >
          <Text style={styles.sendBtnText}>Send (Coming Soon)</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { color: '#6b7280', fontSize: 16 },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  invoiceNumber: { fontSize: 20, fontWeight: '700', color: '#111827' },
  meta: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  section: {
    backgroundColor: '#fff',
    margin: 12,
    marginBottom: 0,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  customerName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  customerMeta: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemDesc: { fontSize: 14, color: '#111827', fontWeight: '500' },
  itemSku: { fontSize: 11, color: '#9ca3af' },
  itemQty: { fontSize: 13, color: '#6b7280', marginRight: 8, width: 32, textAlign: 'right' },
  itemTotal: { fontSize: 14, fontWeight: '600', color: '#111827', width: 100, textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalRowBold: { borderTopWidth: 1, borderTopColor: '#e5e7eb', marginTop: 4, paddingTop: 8 },
  totalLabel: { fontSize: 14, color: '#6b7280' },
  totalValue: { fontSize: 14, color: '#374151' },
  totalLabelBold: { fontSize: 15, fontWeight: '700', color: '#111827' },
  totalValueBold: { fontSize: 15, fontWeight: '700', color: '#111827' },
  pdfBtn: {
    height: 44,
    borderWidth: 1.5,
    borderColor: '#2563eb',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfBtnText: { color: '#2563eb', fontWeight: '600', fontSize: 14 },
  notes: { fontSize: 14, color: '#374151', lineHeight: 20 },
  actions: { padding: 16, paddingBottom: 32, gap: 10 },
  markPaidBtn: {
    height: 48,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markPaidBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  sendBtn: {
    height: 48,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: { color: '#9ca3af', fontWeight: '600', fontSize: 15 },
});
