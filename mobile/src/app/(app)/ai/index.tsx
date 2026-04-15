import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AiMessageBubble } from '../../../components/AiMessageBubble';
import { AiPromptSuggestions } from '../../../components/AiPromptSuggestions';
import { aiApi } from '../../../lib/api/ai.api';
import { AiMessage, useAiStore } from '../../../store/ai.store';

function TypingDots() {
  return (
    <View style={styles.typingContainer}>
      <ActivityIndicator size="small" color="#6b7280" />
      <Text style={styles.typingText}>AI is thinking…</Text>
    </View>
  );
}

export default function AiScreen() {
  const { messages, isLoading, addMessage, clearHistory, setLoading } = useAiStore();
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList<AiMessage>>(null);

  const sendMessage = async (text?: string) => {
    const messageText = (text ?? input).trim();
    if (!messageText || isLoading) return;

    setInput('');

    const userMessage: AiMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };
    addMessage(userMessage);
    setLoading(true);

    try {
      const res = await aiApi.chat(messageText);
      const response = (res.data as { data: typeof res.data }).data ?? res.data;
      const assistantMessage: AiMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      addMessage(assistantMessage);
    } catch {
      const errorMessage: AiMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: {
          rawText: 'Sorry, I encountered an error. Please try again.',
          toolsUsed: [],
          createdAt: new Date().toISOString(),
        },
        timestamp: new Date(),
      };
      addMessage(errorMessage);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <View style={styles.modelBadge}>
            <Text style={styles.modelBadgeText}>claude-sonnet-4-6</Text>
          </View>
        </View>
        {messages.length > 0 && (
          <TouchableOpacity onPress={clearHistory} style={styles.clearButton}>
            <Ionicons name="trash-outline" size={18} color="#6b7280" />
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Message list */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AiMessageBubble message={item} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubble-ellipses-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>Ask me anything about your business</Text>
              <AiPromptSuggestions onSelect={(p) => sendMessage(p)} />
            </View>
          }
          ListFooterComponent={isLoading ? <TypingDots /> : null}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Input bar */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about your business…"
            placeholderTextColor="#9ca3af"
            multiline
            maxLength={2000}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage()}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || isLoading}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modelBadge: {
    marginTop: 2,
    backgroundColor: '#eff6ff',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  modelBadgeText: { fontSize: 10, color: '#2563eb', fontWeight: '600' },
  clearButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  clearText: { fontSize: 13, color: '#6b7280' },
  listContent: { paddingVertical: 12, flexGrow: 1 },
  emptyContainer: { flex: 1, alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 24 },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  typingText: { fontSize: 13, color: '#6b7280', fontStyle: 'italic' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    backgroundColor: '#fff',
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: '#93c5fd' },
});
