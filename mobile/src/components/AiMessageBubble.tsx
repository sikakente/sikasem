import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AiChatResponse } from '../lib/api/ai.api';
import { AiMessage } from '../store/ai.store';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface SectionConfig {
  key: keyof AiChatResponse;
  label: string;
  icon: IconName;
  bg: string;
  border: string;
  labelColor: string;
}

const SECTIONS: SectionConfig[] = [
  {
    key: 'internalData',
    label: 'Data',
    icon: 'bar-chart-outline',
    bg: '#eff6ff',
    border: '#bfdbfe',
    labelColor: '#1d4ed8',
  },
  {
    key: 'externalTrend',
    label: 'Trend',
    icon: 'globe-outline',
    bg: '#f9fafb',
    border: '#e5e7eb',
    labelColor: '#374151',
  },
  {
    key: 'recommendation',
    label: 'Action',
    icon: 'arrow-forward-circle-outline',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    labelColor: '#15803d',
  },
  {
    key: 'risk',
    label: 'Risk',
    icon: 'warning-outline',
    bg: '#fef2f2',
    border: '#fecaca',
    labelColor: '#dc2626',
  },
  {
    key: 'opportunity',
    label: 'Opportunity',
    icon: 'bulb-outline',
    bg: '#fffbeb',
    border: '#fde68a',
    labelColor: '#d97706',
  },
];

const TRUNCATE_LENGTH = 300;

function AssistantCard({ response }: { response: AiChatResponse }) {
  const [expanded, setExpanded] = useState(false);

  const hasSections = SECTIONS.some((s) => response[s.key]);

  if (!hasSections) {
    const text = response.rawText;
    const shouldTruncate = text.length > TRUNCATE_LENGTH && !expanded;
    return (
      <View style={styles.assistantBubble}>
        <Text style={styles.plainText}>
          {shouldTruncate ? text.slice(0, TRUNCATE_LENGTH) + '…' : text}
        </Text>
        {text.length > TRUNCATE_LENGTH && (
          <TouchableOpacity onPress={() => setExpanded(!expanded)}>
            <Text style={styles.showMore}>{expanded ? 'Show less' : 'Show more'}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.assistantBubble}>
      {SECTIONS.map((section) => {
        const content = response[section.key];
        if (!content) return null;
        const shouldTruncate =
          !expanded && typeof content === 'string' && content.length > TRUNCATE_LENGTH;
        return (
          <View
            key={section.key}
            style={[
              styles.sectionCard,
              { backgroundColor: section.bg, borderColor: section.border },
            ]}
          >
            <View style={styles.sectionHeader}>
              <Ionicons name={section.icon} size={14} color={section.labelColor} />
              <Text style={[styles.sectionLabel, { color: section.labelColor }]}>
                {section.label}
              </Text>
            </View>
            <Text style={styles.sectionText}>
              {shouldTruncate && typeof content === 'string'
                ? content.slice(0, TRUNCATE_LENGTH) + '…'
                : (content as string)}
            </Text>
          </View>
        );
      })}
      {SECTIONS.some((s) => {
        const c = response[s.key];
        return typeof c === 'string' && c.length > TRUNCATE_LENGTH;
      }) && (
        <TouchableOpacity onPress={() => setExpanded(!expanded)}>
          <Text style={styles.showMore}>{expanded ? 'Show less' : 'Show more'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function AiMessageBubble({ message }: { message: AiMessage }) {
  if (message.role === 'user') {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{message.content as string}</Text>
        </View>
      </View>
    );
  }

  const response = message.content as AiChatResponse;
  return (
    <View style={styles.assistantRow}>
      <AssistantCard response={response} />
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  userBubble: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '80%',
  },
  userText: { color: '#fff', fontSize: 14 },
  assistantRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  assistantBubble: { maxWidth: '90%' },
  sectionCard: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 6 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 4 },
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionText: { fontSize: 13, color: '#1f2937', lineHeight: 18 },
  plainText: {
    fontSize: 14,
    color: '#1f2937',
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 12,
  },
  showMore: { fontSize: 12, color: '#2563eb', marginTop: 4, textAlign: 'center' },
});
