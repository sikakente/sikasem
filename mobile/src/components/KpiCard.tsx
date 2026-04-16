import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface KpiCardProps {
  label: string;
  value: string;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendPercent?: number;
  onPress?: () => void;
  color?: 'default' | 'warning' | 'danger' | 'success';
}

// Design tokens — Analytics Dashboard palette
const TOKENS = {
  default: {
    accent: '#3B82F6',
    tint: '#FFFFFF',
    badge: '#EFF6FF',
    badgeText: '#1D4ED8',
  },
  success: {
    accent: '#16A34A',
    tint: '#F0FDF4',
    badge: '#DCFCE7',
    badgeText: '#15803D',
  },
  warning: {
    accent: '#D97706',
    tint: '#FFFBEB',
    badge: '#FEF3C7',
    badgeText: '#92400E',
  },
  danger: {
    accent: '#DC2626',
    tint: '#FEF2F2',
    badge: '#FEE2E2',
    badgeText: '#991B1B',
  },
};

const TREND_COLORS = {
  up: { bg: '#DCFCE7', text: '#15803D', icon: 'arrow-up' as const },
  down: { bg: '#FEE2E2', text: '#991B1B', icon: 'arrow-down' as const },
  neutral: { bg: '#F1F5F9', text: '#64748B', icon: 'remove' as const },
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
  const token = TOKENS[color];
  const trendToken = trend ? TREND_COLORS[trend] : null;

  const content = (
    <View style={[styles.card, { backgroundColor: token.tint }]}>
      {/* Accent bar */}
      <View style={[styles.accentBar, { backgroundColor: token.accent }]} />

      <View style={styles.body}>
        {/* Label */}
        <Text style={styles.label} numberOfLines={1}>
          {label.toUpperCase()}
        </Text>

        {/* Value */}
        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
          {value}
        </Text>

        {/* Footer row */}
        {(subValue || (trendToken && trendPercent != null)) && (
          <View style={styles.footer}>
            {trendToken && trendPercent != null && (
              <View style={[styles.trendPill, { backgroundColor: trendToken.bg }]}>
                <Ionicons name={trendToken.icon} size={10} color={trendToken.text} />
                <Text style={[styles.trendText, { color: trendToken.text }]}>
                  {Math.abs(trendPercent).toFixed(1)}%
                </Text>
              </View>
            )}
            {subValue && (
              <Text style={styles.subValue} numberOfLines={1}>
                {subValue}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Chevron for interactive cards */}
      {onPress && (
        <View style={styles.chevronWrap}>
          <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.78}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    minHeight: 80,
  },
  accentBar: {
    width: 4,
    backgroundColor: '#3B82F6',
  },
  body: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
  },
  subValue: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  chevronWrap: {
    justifyContent: 'center',
    paddingRight: 12,
    paddingLeft: 4,
  },
});
