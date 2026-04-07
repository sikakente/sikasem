import client from './client';

export interface InventoryResponse {
  data: unknown;
}

export const inventoryApi = {
  list: (params?: Record<string, unknown>) =>
    client.get<InventoryResponse>('/inventory', { params }),

  getMovements: (params?: Record<string, unknown>) =>
    client.get<InventoryResponse>('/inventory/movements', { params }),

  createAdjustment: (data: Record<string, unknown>) =>
    client.post<InventoryResponse>('/inventory/adjustments', data),

  getProductStock: (productId: string) =>
    client.get<InventoryResponse>(`/inventory/product/${productId}`),
};
