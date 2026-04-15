import { create } from 'zustand';
import { AiChatResponse } from '../lib/api/ai.api';

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string | AiChatResponse;
  timestamp: Date;
}

interface AiState {
  messages: AiMessage[];
  isLoading: boolean;
  addMessage: (message: AiMessage) => void;
  clearHistory: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAiStore = create<AiState>((set) => ({
  messages: [],
  isLoading: false,

  addMessage: (message: AiMessage) => set((state) => ({ messages: [...state.messages, message] })),

  clearHistory: () => set({ messages: [] }),

  setLoading: (loading: boolean) => set({ isLoading: loading }),
}));
