import client from './client';

interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
}

interface AuthResponse {
  data: {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
  };
}

export const authApi = {
  login: (email: string, password: string) =>
    client.post<AuthResponse>('/auth/login', { email, password }),

  refresh: (refreshToken: string) => client.post<AuthResponse>('/auth/refresh', { refreshToken }),

  logout: (refreshToken: string) => client.post('/auth/logout', { refreshToken }),

  forgotPassword: (email: string) => client.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    client.post('/auth/reset-password', { token, newPassword }),
};
