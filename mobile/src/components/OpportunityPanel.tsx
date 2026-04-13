import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { OpportunityRecord } from '../store/dashboard.store';

interface OpportunityPanelProps {
  opportunities: OpportunityRecord[];
  onPress: (opp: OpportunityRecord) => void;
}

export default function OpportunityPanel({ opportunities, onPress }: OpportunityPanelProps) {
  if (opportunities.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No open opportunities</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {opportunities.slice(0, 3).map((opp) => (
        <TouchableOpacity
          key={opp.id}
          style={styles.card}
          onPress={() => onPress(opp)}
          activeOpacity={0.75}
        >
          <View style={styles.indicator} />
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
          {opp.score != null && (
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreText}>{Math.round(Number(opp.score))}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    gap: 10,
  },
  indicator: { width: 4, minHeight: 40, borderRadius: 2, backgroundColor: '#2563eb' },
  content: { flex: 1 },
  title: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 2 },
  sub: { fontSize: 12, color: '#6b7280', lineHeight: 16 },
  scoreBadge: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  scoreText: { fontSize: 12, fontWeight: '700', color: '#1d4ed8' },
  empty: { padding: 12 },
  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
});
