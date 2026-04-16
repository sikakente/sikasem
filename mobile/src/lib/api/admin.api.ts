import client from './client';

export const adminApi = {
  getAuditLogs: (params?: Record<string, unknown>) => client.get('/audit-logs', { params }),
  getLocations: () => client.get('/locations'),
  createLocation: (data: Record<string, unknown>) => client.post('/locations', data),
  updateLocation: (id: string, data: Record<string, unknown>) =>
    client.patch(`/locations/${id}`, data),
  getBusinessProfile: () => client.get('/settings/business-profile'),
  updateBusinessProfile: (data: Record<string, unknown>) =>
    client.patch('/settings/business-profile', data),
  getNotificationSettings: () => client.get('/settings/notifications'),
  updateNotificationSettings: (data: Record<string, unknown>) =>
    client.patch('/settings/notifications', data),
};
