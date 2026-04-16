import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../../lib/api/admin.api';

interface AuditEntry {
  id: string;
  createdAt: string;
  userId?: string;
  userName?: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}

interface Filters {
  action: string;
  entityType: string;
}

const ACTION_TYPES = ['', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'];
const ENTITY_TYPES = [
  '',
  'user',
  'product',
  'inventory',
  'shipment',
  'sale',
  'purchase',
  'location',
];

const ACTION_COLORS: Record<string, string> = {
  CREATE: '#16a34a',
  UPDATE: '#2563eb',
  DELETE: '#dc2626',
  LOGIN: '#7c3aed',
  LOGOUT: '#9ca3af',
};

const formatJson = (obj: unknown) => JSON.stringify(obj, null, 2);

const formatDate = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
};

export default function AuditScreen() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ action: '', entityType: '' });
  const [pendingFilters, setPendingFilters] = useState<Filters>({ action: '', entityType: '' });
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  const fetchLogs = useCallback(
    async (pageNum: number, currentFilters: Filters, append: boolean) => {
      try {
        setFetchError(null);
        const params: Record<string, unknown> = { page: pageNum, limit: 20 };
        if (currentFilters.action) params.action = currentFilters.action;
        if (currentFilters.entityType) params.entityType = currentFilters.entityType;

        const response = await adminApi.getAuditLogs(params);
        const payload = (response.data as { data: unknown }).data ?? response.data;
        const items = Array.isArray(payload)
          ? (payload as AuditEntry[])
          : ((payload as { items?: AuditEntry[] })?.items ?? []);

        if (append) {
          setEntries((prev) => [...prev, ...items]);
        } else {
          setEntries(items);
        }
        setHasMore(items.length === 20);
      } catch {
        setFetchError('Failed to load audit logs.');
      }
    },
    [],
  );

  useEffect(() => {
    setLoading(true);
    fetchLogs(1, filters, false).finally(() => setLoading(false));
  }, [fetchLogs, filters]);

  const handleApplyFilters = () => {
    setPage(1);
    setFilters(pendingFilters);
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchLogs(nextPage, filters, true);
    setLoadingMore(false);
  };

  const renderEntry = ({ item }: { item: AuditEntry }) => {
    const actionColor = ACTION_COLORS[item.action] ?? '#6b7280';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setSelectedEntry(item)}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.actionBadge, { backgroundColor: actionColor + '20' }]}>
            <Text style={[styles.actionBadgeText, { color: actionColor }]}>{item.action}</Text>
          </View>
          <Text style={styles.entityType}>{item.entityType}</Text>
          <Text style={styles.timestamp}>{formatDate(item.createdAt)}</Text>
        </View>
        <Text style={styles.entityId} numberOfLines={1}>
          ID: {item.entityId}
        </Text>
        {item.userName || item.userId ? (
          <Text style={styles.userInfo}>{item.userName ?? item.userId}</Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Filter bar */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Action:</Text>
            <View style={styles.filterButtons}>
              {ACTION_TYPES.map((action) => (
                <TouchableOpacity
                  key={action || 'all'}
                  style={[
                    styles.filterChip,
                    pendingFilters.action === action && styles.filterChipActive,
                  ]}
                  onPress={() => setPendingFilters((prev) => ({ ...prev, action }))}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      pendingFilters.action === action && styles.filterChipTextActive,
                    ]}
                  >
                    {action || 'All'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Entity:</Text>
            <View style={styles.filterButtons}>
              {ENTITY_TYPES.map((entity) => (
                <TouchableOpacity
                  key={entity || 'all'}
                  style={[
                    styles.filterChip,
                    pendingFilters.entityType === entity && styles.filterChipActive,
                  ]}
                  onPress={() => setPendingFilters((prev) => ({ ...prev, entityType: entity }))}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      pendingFilters.entityType === entity && styles.filterChipTextActive,
                    ]}
                  >
                    {entity || 'All'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <TouchableOpacity
          style={styles.applyButton}
          onPress={handleApplyFilters}
          activeOpacity={0.8}
        >
          <Text style={styles.applyButtonText}>Apply</Text>
        </TouchableOpacity>
      </View>

      {fetchError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{fetchError}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlashList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={renderEntry}
          estimatedItemSize={80}
          contentContainerStyle={styles.listContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No audit logs found</Text>
              <Text style={styles.emptySubtitle}>Try adjusting your filters</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color="#2563eb" />
              </View>
            ) : null
          }
        />
      )}

      {/* Detail Modal */}
      <Modal
        visible={selectedEntry !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedEntry(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Audit Detail</Text>
            <TouchableOpacity onPress={() => setSelectedEntry(null)} activeOpacity={0.7}>
              <Text style={styles.modalClose}>Close</Text>
            </TouchableOpacity>
          </View>

          {selectedEntry && (
            <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalBody}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Action</Text>
                <Text style={styles.detailValue}>{selectedEntry.action}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Entity Type</Text>
                <Text style={styles.detailValue}>{selectedEntry.entityType}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Entity ID</Text>
                <Text style={styles.detailValue}>{selectedEntry.entityId}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Timestamp</Text>
                <Text style={styles.detailValue}>{formatDate(selectedEntry.createdAt)}</Text>
              </View>
              {selectedEntry.userName || selectedEntry.userId ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>User</Text>
                  <Text style={styles.detailValue}>
                    {selectedEntry.userName ?? selectedEntry.userId}
                  </Text>
                </View>
              ) : null}

              {selectedEntry.before !== undefined && selectedEntry.before !== null && (
                <View style={styles.jsonSection}>
                  <Text style={styles.jsonLabel}>Before</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator>
                    <Text style={styles.jsonText}>{formatJson(selectedEntry.before)}</Text>
                  </ScrollView>
                </View>
              )}

              {selectedEntry.after !== undefined && selectedEntry.after !== null && (
                <View style={styles.jsonSection}>
                  <Text style={styles.jsonLabel}>After</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator>
                    <Text style={styles.jsonText}>{formatJson(selectedEntry.after)}</Text>
                  </ScrollView>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
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
  },
  filterBar: {
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginRight: 4,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  filterChipActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  filterChipText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#2563eb',
  },
  applyButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
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
    padding: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
  loadingMore: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  actionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  entityType: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  timestamp: {
    fontSize: 11,
    color: '#9ca3af',
  },
  entityId: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  userInfo: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  modalClose: {
    fontSize: 15,
    color: '#2563eb',
    fontWeight: '500',
  },
  modalContent: {
    flex: 1,
  },
  modalBody: {
    padding: 16,
    paddingBottom: 40,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f3f4f6',
  },
  detailLabel: {
    width: 100,
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
  },
  jsonSection: {
    marginTop: 16,
  },
  jsonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  jsonText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#111827',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    lineHeight: 18,
  },
});
