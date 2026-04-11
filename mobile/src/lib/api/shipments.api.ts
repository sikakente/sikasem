import client from './client';

export const shipmentsApi = {
  list: (params?: Record<string, unknown>) => client.get('/shipments', { params }),
  get: (id: string) => client.get(`/shipments/${id}`),
  create: (data: Record<string, unknown>) => client.post('/shipments', data),
  update: (id: string, data: Record<string, unknown>) => client.patch(`/shipments/${id}`, data),
  addItem: (id: string, data: Record<string, unknown>) =>
    client.post(`/shipments/${id}/items`, data),
  removeItem: (id: string, itemId: string) => client.delete(`/shipments/${id}/items/${itemId}`),
  dispatch: (id: string) => client.post(`/shipments/${id}/dispatch`),
  addCost: (id: string, data: Record<string, unknown>) =>
    client.post(`/shipments/${id}/costs`, data),
  getCosts: (id: string) => client.get(`/shipments/${id}/costs`),
  getStatusHistory: (id: string) => client.get(`/shipments/${id}/status-history`),
};
