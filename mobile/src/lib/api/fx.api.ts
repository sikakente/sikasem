import client from './client';

export const fxApi = {
  list: (params?: Record<string, unknown>) => client.get('/fx', { params }),
  getSummary: (params?: Record<string, unknown>) => client.get('/fx/summary', { params }),
  getLatestRate: () => client.get('/fx/latest-rate'),
  get: (id: string) => client.get(`/fx/${id}`),
  createConversion: (data: Record<string, unknown>) => client.post('/fx/conversions', data),
  listConversions: (params?: Record<string, unknown>) => client.get('/fx/conversions', { params }),
  getConversion: (id: string) => client.get(`/fx/conversions/${id}`),
};
