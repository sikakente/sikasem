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
