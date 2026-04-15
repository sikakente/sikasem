import client from './client';

export interface AiChatResponse {
  internalData?: string;
  externalTrend?: string;
  recommendation?: string;
  risk?: string;
  opportunity?: string;
  rawText: string;
  toolsUsed: string[];
  createdAt: string;
}

export interface AiHistoryItem {
  id: string;
  promptText: string;
  responseText: string;
  insightType: string;
  createdAt: string;
}

export interface AiHistoryParams {
  page?: number;
  limit?: number;
}

export const aiApi = {
  chat: (message: string) => client.post<AiChatResponse>('/ai/chat', { message }),
  getHistory: (params?: AiHistoryParams) => client.get<AiHistoryItem[]>('/ai/history', { params }),
};
