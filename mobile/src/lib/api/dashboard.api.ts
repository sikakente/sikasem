import client from './client';

export interface DashboardQueryParams {
  dateFrom?: string;
  dateTo?: string;
}

export const dashboardApi = {
  getSummary: (params?: DashboardQueryParams) => client.get('/dashboard/summary', { params }),
  getRevenue: (params?: DashboardQueryParams) => client.get('/dashboard/revenue', { params }),
  getShipments: () => client.get('/dashboard/shipments'),
  getFx: (params?: DashboardQueryParams) => client.get('/dashboard/fx', { params }),
  getTopProducts: (params?: DashboardQueryParams) => client.get(
    '/dashboard/top-products',
    { params },
  ),
  getRisks: () => client.get('/dashboard/risks'),
};
