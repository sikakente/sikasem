import client from './client';

export const usersApi = {
  list: (params?: Record<string, unknown>) => client.get('/users', { params }),
  get: (id: string) => client.get(`/users/${id}`),
  create: (data: Record<string, unknown>) => client.post('/users', data),
  update: (id: string, data: Record<string, unknown>) => client.patch(`/users/${id}`, data),
};

export const rolesApi = {
  list: () => client.get('/roles'),
  getPermissions: (roleId: string) => client.get(`/roles/${roleId}/permissions`),
  updatePermissions: (roleId: string, permissions: string[]) =>
    client.patch(`/roles/${roleId}/permissions`, { permissions }),
};
