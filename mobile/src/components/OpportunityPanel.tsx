import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OpportunityRecord } from '../store/dashboard.store';

interface OpportunityPanelProps {
  opportunities: OpportunityRecord[];
  onPress: (opp: OpportunityRecord) => void;
}

function oppScore(score: number): { label: string; color: string; bg: string } {
  if (score >= 75) return { label: 'HOT', color: '#16A34A', bg: '#DCFCE7' };
  if (score >= 40) return { label: 'WARM', color: '#2563EB', bg: '#EFF6FF' };
  return { label: 'COOL', color: '#64748B', bg: '#F1F5F9' };
}

export default function OpportunityPanel({ opportunities, onPress }: OpportunityPanelProps) {
  if (opportunities.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="bulb-outline" size={24} color="#94A3B8" />
        <Text style={styles.emptyText}>No open opportunities</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {opportunities.slice(0, 3).map((opp) => {
        const score = opp.score != null ? Math.round(Number(opp.score)) : null;
        const level = score != null ? oppScore(score) : null;

        return (
          <TouchableOpacity
            key={opp.id}
            style={styles.card}
            onPress={() => onPress(opp)}
            activeOpacity={0.78}
            accessibilityRole="button"
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <View style={styles.iconWrap}>
              <Ionicons name="trending-up-outline" size={18} color="#16A34A" />
            </View>
            <View style={styles.content}>
              <Text style={styles.title} numberOfLines={1}>
                {opp.summary}
              </Text>
              {opp.recommendation && (
                <Text style={styles.sub} numberOfLines={2}>
                  {opp.recommendation}
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
    backgroundColor: '#F0FDF4',
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
