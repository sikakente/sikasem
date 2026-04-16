import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RiskRecord } from '../store/dashboard.store';

interface RiskPanelProps {
  risks: RiskRecord[];
  onPress: (risk: RiskRecord) => void;
}

function riskLevel(score: number): { label: string; color: string; bg: string } {
  if (score >= 75) return { label: 'HIGH', color: '#DC2626', bg: '#FEE2E2' };
  if (score >= 40) return { label: 'MED', color: '#D97706', bg: '#FEF3C7' };
  return { label: 'LOW', color: '#64748B', bg: '#F1F5F9' };
}

export default function RiskPanel({ risks, onPress }: RiskPanelProps) {
  if (risks.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="shield-checkmark-outline" size={24} color="#94A3B8" />
        <Text style={styles.emptyText}>No open risks</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {risks.slice(0, 3).map((risk) => {
        const score = risk.score != null ? Math.round(Number(risk.score)) : null;
        const level = score != null ? riskLevel(score) : null;

        return (
          <TouchableOpacity
            key={risk.id}
            style={styles.card}
            onPress={() => onPress(risk)}
            activeOpacity={0.78}
            accessibilityRole="button"
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <View style={styles.iconWrap}>
              <Ionicons name="warning-outline" size={18} color="#DC2626" />
            </View>
            <View style={styles.content}>
              <Text style={styles.title} numberOfLines={1}>
                {risk.summary}
              </Text>
              {risk.recommendation && (
                <Text style={styles.sub} numberOfLines={2}>
                  {risk.recommendation}
                </Text>
              )}
            </View>
            {level && (
              <View style={[styles.badge, { backgroundColor: level.bg }]}>
                <Text style={[styles.badgeText, { color: level.color }]}>{level.label}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1 },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 3,
    letterSpacing: -0.1,
  },
  sub: { fontSize: 12, color: '#64748B', lineHeight: 17 },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 44,
    alignItems: 'center',
  },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  empty: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  emptyText: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },
});
