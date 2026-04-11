import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { shipmentsApi } from '../../../../lib/api/shipments.api';
import { ShipmentStatusBadge } from '../../../../components/ShipmentStatusBadge';

export default function ShipmentStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    shipmentsApi.get(id).then((res) => {
      setStatus((res.data as any).data?.status ?? null);
      setLoading(false);
    });
  }, [id]);

  const handleDispatch = () => {
    Alert.alert('Dispatch Shipment', 'Mark this shipment as dispatched?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Dispatch',
        onPress: async () => {
          setActionLoading(true);
          try {
            await shipmentsApi.dispatch(id);
            router.back();
          } catch {
            Alert.alert('Error', 'Failed to dispatch shipment.');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 40 }} color="#2563eb" />;
  }

  const canDispatch = status === 'draft' || status === 'packed';

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Current Status</Text>
      {status && <ShipmentStatusBadge status={status} />}

      <View style={styles.spacer} />

      {canDispatch && (
        <TouchableOpacity
          style={[styles.bigBtn, actionLoading && styles.bigBtnDisabled]}
          onPress={handleDispatch}
          disabled={actionLoading}
        >
          {actionLoading ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <Text style={styles.bigBtnText}>Mark as Dispatched</Text>
          )}
        </TouchableOpacity>
      )}

      {!canDispatch && (
        <Text style={styles.noAction}>No status actions available for this shipment.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  spacer: { flex: 1 },
  bigBtn: {
    height: 64,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  bigBtnDisabled: { opacity: 0.6 },
  bigBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  noAction: { color: '#9ca3af', fontSize: 15, textAlign: 'center', marginBottom: 32 },
});
