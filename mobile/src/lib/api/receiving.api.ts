import client from './client';

export const receivingApi = {
  getQueue: () => client.get('/receiving/queue'),
  list: (params?: Record<string, unknown>) => client.get('/receiving', { params }),
  get: (id: string) => client.get(`/receiving/${id}`),
  create: (data: Record<string, unknown>) => client.post('/receiving', data),
  update: (id: string, data: Record<string, unknown>) => client.patch(`/receiving/${id}`, data),
  submit: (id: string) => client.post(`/receiving/${id}/submit`),
};
