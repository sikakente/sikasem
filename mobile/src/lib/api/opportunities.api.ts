import client from './client';

export interface OpportunityRecord {
  id: string;
  opportunityType: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  score: number | null;
  summary: string;
  recommendation: string | null;
  detectedAt: string;
  status: string;
}

export interface OpportunityListParams {
  opportunityType?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export const opportunitiesApi = {
  list: (params?: OpportunityListParams) =>
    client.get<OpportunityRecord[]>('/opportunities', { params }),
  get: (id: string) => client.get<OpportunityRecord>(`/opportunities/${id}`),
  updateStatus: (id: string, status: string) =>
    client.patch(`/opportunities/${id}/status`, { status }),
};
