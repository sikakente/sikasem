import client from './client';

export const customersApi = {
  list: (params?: Record<string, unknown>) => client.get('/customers', { params }),
  get: (id: string) => client.get(`/customers/${id}`),
  create: (data: Record<string, unknown>) => client.post('/customers', data),
  update: (id: string, data: Record<string, unknown>) => client.patch(`/customers/${id}`, data),
  getSales: (id: string, params?: Record<string, unknown>) =>
    client.get(`/customers/${id}/sales`, { params }),
};
