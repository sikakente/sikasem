import client from './client';

export const salesApi = {
  list: (params?: Record<string, unknown>) => client.get('/sales', { params }),
  get: (id: string) => client.get(`/sales/${id}`),
  create: (data: Record<string, unknown>) => client.post('/sales', data),
  void: (id: string, data: Record<string, unknown>) => client.post(`/sales/${id}/void`, data),
};
