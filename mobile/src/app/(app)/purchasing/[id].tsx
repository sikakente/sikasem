import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { purchasingApi } from '../../../lib/api/purchasing.api';

interface PurchaseLineItem {
  id: string;
  productId: string;
  quantity: number;
  unitCostGbp: number;
  totalCostGbp: number;
  fxRatePurchase: number;
  totalCostGhsEquivalent: number;
}

interface PurchaseOrder {
  id: string;
  supplierId: string;
  purchaseDate: string;
  status: 'draft' | 'confirmed';
  notes?: string;
  items: PurchaseLineItem[];
}

export default function PurchaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const response = await purchasingApi.get(id);
      const data = response.data as { data?: PurchaseOrder } | PurchaseOrder;
      if (data && (data as { data?: PurchaseOrder }).data) {
        setOrder((data as { data: PurchaseOrder }).data);
      } else {
        setOrder(data as PurchaseOrder);
      }
    } catch {
      setError('Failed to load purchase order.');
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    fetchOrder().finally(() => setLoading(false));
  }, [fetchOrder]);

  const handleConfirm = async () => {
    if (!id) return;
    setConfirming(true);
    try {
      await purchasingApi.confirm(id);
      await fetchOrder();
    } catch {
      setError('Failed to confirm purchase order. Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  const totalGbp = order?.items?.reduce((sum, item) => sum + (item.totalCostGbp || 0), 0) ?? 0;
  const totalGhs =
    order?.items?.reduce((sum, item) => sum + (item.totalCostGhsEquivalent || 0), 0) ?? 0;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error && !order) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorSubtitle}>{error}</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => {
            setLoading(true);
            fetchOrder().finally(() => setLoading(false));
          }}
        >
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Order not found</Text>
      </View>
    );
  }

  const isConfirmed = order.status === 'confirmed';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      {/* Status Badge */}
      <View style={styles.statusRow}>
        <View style={[styles.badge, isConfirmed ? styles.badgeConfirmed : styles.badgeDraft]}>
          <Text
            style={[
              styles.badgeText,
              isConfirmed ? styles.badgeTextConfirmed : styles.badgeTextDraft,
            ]}
          >
            {order.status}
          </Text>
        </View>
      </View>

      {/* Order Info */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Supplier ID</Text>
          <Text style={styles.infoValue}>{order.supplierId || '—'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Purchase Date</Text>
          <Text style={styles.infoValue}>
            {order.purchaseDate ? new Date(order.purchaseDate).toLocaleDateString() : '—'}
          </Text>
        </View>
        {order.notes ? (
          <>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Notes</Text>
              <Text style={[styles.infoValue, styles.notesText]}>{order.notes}</Text>
            </View>
          </>
        ) : null}
      </View>

      {/* Items Table */}
      <Text style={styles.sectionTitle}>Line Items</Text>
      <View style={styles.tableCard}>
        {/* Table Header */}
        <View style={[styles.tableRow, styles.tableHeader]}>
          <Text style={[styles.tableCell, styles.tableHeaderText, styles.cellProduct]}>
            Product
          </Text>
          <Text style={[styles.tableCell, styles.tableHeaderText, styles.cellQty]}>Qty</Text>
          <Text style={[styles.tableCell, styles.tableHeaderText, styles.cellGbp]}>Unit £</Text>
          <Text style={[styles.tableCell, styles.tableHeaderText, styles.cellGbp]}>Total £</Text>
          <Text style={[styles.tableCell, styles.tableHeaderText, styles.cellGhs]}>GHS ₵</Text>
        </View>

        {order.items && order.items.length > 0 ? (
          order.items.map((item, index) => (
            <View
              key={item.id || index}
              style={[styles.tableRow, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}
            >
              <Text style={[styles.tableCell, styles.cellProduct]} numberOfLines={1}>
                {item.productId}
              </Text>
              <Text style={[styles.tableCell, styles.cellQty]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, styles.cellGbp]}>
                £{(item.unitCostGbp || 0).toFixed(2)}
              </Text>
              <Text style={[styles.tableCell, styles.cellGbp]}>
                £{(item.totalCostGbp || 0).toFixed(2)}
              </Text>
              <Text style={[styles.tableCell, styles.cellGhs]}>
                ₵{(item.totalCostGhsEquivalent || 0).toFixed(2)}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyItems}>
            <Text style={styles.emptyItemsText}>No items</Text>
          </View>
        )}
      </View>

      {/* Totals Footer */}
      <View style={styles.totalsCard}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total GBP</Text>
          <Text style={styles.totalValue}>£{totalGbp.toFixed(2)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total GHS Equivalent</Text>
          <Text style={styles.totalValue}>₵{totalGhs.toFixed(2)}</Text>
        </View>
      </View>

      {/* Confirm button for drafts */}
      {!isConfirmed && (
        <TouchableOpacity
          style={[styles.confirmBtn, confirming && styles.btnDisabled]}
          onPress={handleConfirm}
          disabled={confirming}
        >
          {confirming ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmBtnText}>Confirm Purchase Order</Text>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
  },
  errorBannerText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
  statusRow: {
    marginBottom: 14,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeDraft: {
    backgroundColor: '#fff7ed',
  },
  badgeConfirmed: {
    backgroundColor: '#f0fdf4',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  badgeTextDraft: {
    color: '#ea580c',
  },
  badgeTextConfirmed: {
    color: '#16a34a',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  notesText: {
    fontWeight: '400',
    color: '#374151',
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 10,
  },
  tableCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 20,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  tableHeader: {
    backgroundColor: '#f3f4f6',
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  tableCell: {
    fontSize: 12,
    color: '#374151',
  },
  rowEven: {
    backgroundColor: '#fff',
  },
  rowOdd: {
    backgroundColor: '#f9fafb',
  },
  cellProduct: {
    flex: 2,
    paddingRight: 4,
  },
  cellQty: {
    flex: 1,
    textAlign: 'center',
  },
  cellGbp: {
    flex: 1.2,
    textAlign: 'right',
    paddingRight: 4,
  },
  cellGhs: {
    flex: 1.5,
    textAlign: 'right',
  },
  emptyItems: {
    padding: 20,
    alignItems: 'center',
  },
  emptyItemsText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  totalsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  totalLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  confirmBtn: {
    height: 52,
    backgroundColor: '#16a34a',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
