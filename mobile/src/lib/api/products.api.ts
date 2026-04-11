import client from './client';

export const productsApi = {
  list: (params?: Record<string, unknown>) => client.get('/products', { params }),

  get: (id: string) => client.get(`/products/${id}`),

  getByBarcode: (barcode: string) => client.get(`/products/barcode/${barcode}`),

  create: (data: Record<string, unknown>) => client.post('/products', data),

  update: (id: string, data: Record<string, unknown>) => client.patch(`/products/${id}`, data),

  getStock: (id: string) => client.get(`/products/${id}/stock`),

  getHistory: (id: string) => client.get(`/products/${id}/history`),

  getCategories: () => client.get('/products/categories'),

  createCategory: (data: { name: string; description?: string }) =>
    client.post('/products/categories', data),
};
