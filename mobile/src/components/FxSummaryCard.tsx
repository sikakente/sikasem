import { StyleSheet, Text, View } from 'react-native';

interface FxSummaryCardProps {
  label: string;
  rate?: number | null;
  sourceAmount?: number | null;
  targetAmount?: number | null;
  sourceCurrency?: string;
  targetCurrency?: string;
  gainLoss?: number | null;
}

export default function FxSummaryCard({
  label,
  rate,
  sourceAmount,
  targetAmount,
  sourceCurrency = 'GHS',
  targetCurrency = 'GBP',
  gainLoss,
}: FxSummaryCardProps) {
  const hasGainLoss = gainLoss != null;
  const isGain = hasGainLoss && gainLoss >= 0;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      {rate != null && (
        <Text style={styles.rate}>
          Rate: {rate.toFixed(6)} {targetCurrency}/{sourceCurrency}
        </Text>
      )}
      <View style={styles.row}>
        {sourceAmount != null && (
          <Text style={styles.amount}>
            {sourceCurrency} {sourceAmount.toFixed(2)}
          </Text>
        )}
        {targetAmount != null && (
          <Text style={styles.amount}>
            → {targetCurrency} {targetAmount.toFixed(2)}
          </Text>
        )}
      </View>
      {hasGainLoss && (
        <View style={[styles.gainLossBadge, isGain ? styles.gainBg : styles.lossBg]}>
          <Text style={[styles.gainLossText, isGain ? styles.gainText : styles.lossText]}>
            {isGain ? '+' : ''}
            {gainLoss!.toFixed(2)} {targetCurrency}
          </Text>
        </View>
      )}
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
  label: { fontSize: 13, fontWeight: '600', color: '#6b7280', marginBottom: 4 },
  rate: { fontSize: 12, color: '#9ca3af', marginBottom: 6 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 6 },
  amount: { fontSize: 15, fontWeight: '700', color: '#111827' },
  gainLossBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gainBg: { backgroundColor: '#d1fae5' },
  lossBg: { backgroundColor: '#fee2e2' },
  gainText: { color: '#065f46', fontWeight: '700', fontSize: 13 },
  lossText: { color: '#991b1b', fontWeight: '700', fontSize: 13 },
});
