import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface KpiCardProps {
  label: string;
  value: string;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendPercent?: number;
  onPress?: () => void;
  color?: 'default' | 'warning' | 'danger' | 'success';
}

const TREND_COLORS = { up: '#16a34a', down: '#dc2626', neutral: '#6b7280' };
const CARD_BORDER = {
  default: '#e5e7eb',
  warning: '#fbbf24',
  danger: '#f87171',
  success: '#34d399',
};

export default function KpiCard({
  label,
  value,
  subValue,
  trend,
  trendPercent,
  onPress,
  color = 'default',
}: KpiCardProps) {
  const trendArrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '';
  const trendColor = trend ? TREND_COLORS[trend] : '#6b7280';
  const borderColor = CARD_BORDER[color];

  const content = (
    <View style={[styles.card, { borderLeftColor: borderColor }]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {(subValue || (trend && trendPercent != null)) && (
        <View style={styles.footer}>
          {trend && trendPercent != null && (
            <Text style={[styles.trend, { color: trendColor }]}>
              {trendArrow} {Math.abs(trendPercent).toFixed(1)}%
            </Text>
          )}
          {subValue && <Text style={styles.subValue}>{subValue}</Text>}
        </View>
      )}
      {onPress && <Text style={styles.chevron}>›</Text>}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    position: 'relative',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trend: { fontSize: 12, fontWeight: '600' },
  subValue: { fontSize: 11, color: '#9ca3af' },
  chevron: { position: 'absolute', right: 12, top: '50%', fontSize: 20, color: '#9ca3af' },
});
