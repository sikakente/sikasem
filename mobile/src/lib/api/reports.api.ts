import client from './client';

export interface ReportTypeMeta {
  type: string;
  title: string;
  description: string;
}

export interface ReportParams {
  dateFrom?: string;
  dateTo?: string;
  locationId?: string;
  supplierId?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
}

export const reportsApi = {
  list: () => client.get<ReportTypeMeta[]>('/reports'),

  run: (type: string, params: ReportParams) => client.get(`/reports/${type}`, { params }),

  export: (type: string, params: ReportParams, format: 'csv' | 'xlsx' | 'pdf') =>
    client.get(`/reports/${type}`, {
      params: { ...params, format },
      responseType: 'arraybuffer',
    }),
};
