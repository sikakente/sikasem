import client from './client';

export interface RiskRecord {
  id: string;
  riskType: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  score: number | null;
  summary: string;
  recommendation: string | null;
  detectedAt: string;
  status: string;
}

export interface RiskListParams {
  riskType?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export const risksApi = {
  list: (params?: RiskListParams) => client.get<RiskRecord[]>('/risks', { params }),
  get: (id: string) => client.get<RiskRecord>(`/risks/${id}`),
  updateStatus: (id: string, status: string) => client.patch(`/risks/${id}/status`, { status }),
};
