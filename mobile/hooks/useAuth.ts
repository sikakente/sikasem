import * as SecureStore from 'expo-secure-store';
import { useAuthStore, REFRESH_TOKEN_KEY } from '../store/auth.store';
import { authApi } from '../lib/api/auth.api';

export function useAuth() {
  const store = useAuthStore();

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    const { accessToken, refreshToken, user } = response.data.data;
    await store.setTokens(accessToken, refreshToken);
    store.setUser(user);
  };

  const logout = async () => {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Best-effort — clear local state regardless
      }
    }
    await store.clearTokens();
  };

  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    login,
    logout,
  };
}
