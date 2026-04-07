import client from './client';

export interface PurchaseResponse {
  data: unknown;
}

export const purchasingApi = {
  list: (params?: Record<string, unknown>) =>
    client.get<PurchaseResponse>('/purchases', { params }),

  get: (id: string) =>
    client.get<PurchaseResponse>(`/purchases/${id}`),

  create: (data: Record<string, unknown>) =>
    client.post<PurchaseResponse>('/purchases', data),

  update: (id: string, data: Record<string, unknown>) =>
    client.patch<PurchaseResponse>(`/purchases/${id}`, data),

  confirm: (id: string) =>
    client.post<PurchaseResponse>(`/purchases/${id}/confirm`),
};
