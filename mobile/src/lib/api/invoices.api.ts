import client from './client';

export const invoicesApi = {
  list: (params?: Record<string, unknown>) => client.get('/invoices', { params }),
  get: (id: string) => client.get(`/invoices/${id}`),
  create: (data: Record<string, unknown>) => client.post('/invoices', data),
  update: (id: string, data: Record<string, unknown>) => client.patch(`/invoices/${id}`, data),
  markPaid: (id: string) => client.post(`/invoices/${id}/mark-paid`),
  getPdfUrl: (id: string) => client.get(`/invoices/${id}/pdf`),
};
