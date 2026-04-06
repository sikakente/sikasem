import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { useAuthStore, REFRESH_TOKEN_KEY } from '../store/auth.store';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export default function RootLayout() {
  const { isAuthenticated, setTokens, setUser } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    async function restoreSession() {
      try {
        const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        if (refreshToken) {
          const response = await axios.post<{
            data: {
              accessToken: string;
              refreshToken: string;
              user: { id: string; email: string; fullName: string; roles: string[] };
            };
          }>(`${API_URL}/auth/refresh`, { refreshToken });

          const { accessToken, refreshToken: newRefresh, user } = response.data.data;
          await setTokens(accessToken, newRefresh);
          setUser(user);
        }
      } catch {
        // Session expired or invalid — stay on auth screens
      } finally {
        setIsReady(true);
      }
    }

    restoreSession();
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(app)');
    }
  }, [isAuthenticated, isReady, segments]);

  if (!isReady) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}
