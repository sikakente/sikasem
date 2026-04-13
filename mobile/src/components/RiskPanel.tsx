import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RiskRecord } from '../store/dashboard.store';

interface RiskPanelProps {
  risks: RiskRecord[];
  onPress: (risk: RiskRecord) => void;
}

export default function RiskPanel({ risks, onPress }: RiskPanelProps) {
  if (risks.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No open risks</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {risks.slice(0, 3).map((risk) => (
        <TouchableOpacity
          key={risk.id}
          style={styles.card}
          onPress={() => onPress(risk)}
          activeOpacity={0.75}
        >
          <View style={styles.indicator} />
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
          {risk.score != null && (
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreText}>{Math.round(Number(risk.score))}</Text>
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
  indicator: { width: 4, minHeight: 40, borderRadius: 2, backgroundColor: '#dc2626' },
  content: { flex: 1 },
  title: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 2 },
  sub: { fontSize: 12, color: '#6b7280', lineHeight: 16 },
  scoreBadge: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  scoreText: { fontSize: 12, fontWeight: '700', color: '#991b1b' },
  empty: { padding: 12 },
  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
});
