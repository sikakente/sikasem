import client from './client';

export const receiptsApi = {
  list: (params?: Record<string, unknown>) => client.get('/receipts', { params }),
  get: (id: string) => client.get(`/receipts/${id}`),
  getPdfUrl: (id: string) => client.get(`/receipts/${id}/pdf`),
};
