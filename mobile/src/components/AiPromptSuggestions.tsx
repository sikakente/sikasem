import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

const SUGGESTIONS = [
  'Top selling products',
  'Shipping costs this month',
  'FX impact',
  'What risks need attention?',
  'Slow-moving stock',
  'Which supplier costs most?',
];

interface AiPromptSuggestionsProps {
  onSelect: (prompt: string) => void;
}

export function AiPromptSuggestions({ onSelect }: AiPromptSuggestionsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {SUGGESTIONS.map((suggestion) => (
        <TouchableOpacity key={suggestion} style={styles.chip} onPress={() => onSelect(suggestion)}>
          <Text style={styles.chipText}>{suggestion}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  chip: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: { fontSize: 13, color: '#1d4ed8', fontWeight: '500' },
});
