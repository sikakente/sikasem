import client from './client';

export const suppliersApi = {
  list: (params?: Record<string, unknown>) =>
    client.get('/suppliers', { params }),

  get: (id: string) =>
    client.get(`/suppliers/${id}`),

  create: (data: Record<string, unknown>) =>
    client.post('/suppliers', data),

  update: (id: string, data: Record<string, unknown>) =>
    client.patch(`/suppliers/${id}`, data),

  getProducts: (id: string) =>
    client.get(`/suppliers/${id}/products`),

  getSpend: (id: string, params?: { from?: string; to?: string }) =>
    client.get(`/suppliers/${id}/spend`, { params }),
};
