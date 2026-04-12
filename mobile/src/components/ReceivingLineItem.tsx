import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export interface ReceivingLineItemProps {
  productName: string;
  sku: string;
  expectedQuantity: number;
  receivedQuantity: number;
  damagedQuantity: number;
  lostQuantity: number;
  onChangeReceived: (value: number) => void;
  onChangeDamaged: (value: number) => void;
  onChangeLost: (value: number) => void;
}

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <TouchableOpacity
          style={styles.stepperBtn}
          onPress={() => onChange(Math.max(0, value - 1))}
        >
          <Text style={styles.stepperBtnText}>−</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.stepperInput}
          value={String(value)}
          keyboardType="numeric"
          onChangeText={(t) => {
            const parsed = parseInt(t, 10);
            onChange(isNaN(parsed) ? 0 : Math.max(0, parsed));
          }}
        />
        <TouchableOpacity style={styles.stepperBtn} onPress={() => onChange(value + 1)}>
          <Text style={styles.stepperBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function ReceivingLineItem({
  productName,
  sku,
  expectedQuantity,
  receivedQuantity,
  damagedQuantity,
  lostQuantity,
  onChangeReceived,
  onChangeDamaged,
  onChangeLost,
}: ReceivingLineItemProps) {
  const accounted = receivedQuantity + damagedQuantity + lostQuantity;
  const hasShortage = accounted < expectedQuantity;

  return (
    <View style={[styles.card, hasShortage && styles.cardShortage]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.productName}>{productName}</Text>
          <Text style={styles.sku}>{sku}</Text>
        </View>
        <View style={styles.expectedBadge}>
          <Text style={styles.expectedLabel}>Expected</Text>
          <Text style={styles.expectedValue}>{expectedQuantity}</Text>
        </View>
      </View>

      {hasShortage && (
        <View style={styles.shortageBanner}>
          <Text style={styles.shortageText}>
            Shortage: {expectedQuantity - accounted} unit
            {expectedQuantity - accounted !== 1 ? 's' : ''} unaccounted
          </Text>
        </View>
      )}

      <Stepper label="Received" value={receivedQuantity} onChange={onChangeReceived} />
      <Stepper label="Damaged" value={damagedQuantity} onChange={onChangeDamaged} />
      <Stepper label="Lost" value={lostQuantity} onChange={onChangeLost} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardShortage: {
    borderColor: '#fca5a5',
    backgroundColor: '#fff7f7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  sku: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  expectedBadge: {
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  expectedLabel: {
    fontSize: 10,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  expectedValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  shortageBanner: {
    backgroundColor: '#fee2e2',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  shortageText: {
    fontSize: 13,
    color: '#dc2626',
    fontWeight: '500',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  stepperLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    width: 72,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: 20,
    color: '#374151',
    lineHeight: 24,
  },
  stepperInput: {
    width: 56,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
});
