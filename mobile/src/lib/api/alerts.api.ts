import client from './client';

export interface Alert {
  id: string;
  alertType: string;
  severity: string;
  title: string;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  status: string;
  createdAt: string;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
}

export interface AlertListParams {
  severity?: string;
  alertType?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export const alertsApi = {
  list: (params?: AlertListParams) => client.get<Alert[]>('/alerts', { params }),
  get: (id: string) => client.get<Alert>(`/alerts/${id}`),
  acknowledge: (id: string) => client.post(`/alerts/${id}/acknowledge`),
  resolve: (id: string) => client.post(`/alerts/${id}/resolve`),
  dismiss: (id: string) => client.post(`/alerts/${id}/dismiss`),
};
