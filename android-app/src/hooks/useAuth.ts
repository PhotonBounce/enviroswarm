import { useState, useEffect, useCallback, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import { apiClient, authEvents } from '../api/client';
import { User, AuthTokens, ApiResponse } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isLoggingIn = useRef(false);

  const checkAuth = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      const res = await apiClient.get<ApiResponse<User>>('/me');
      if (res.data?.success) {
        setUser(res.data.data);
      } else {
        await SecureStore.deleteItemAsync('access_token');
        setUser(null);
      }
    } catch (err: any) {
      await SecureStore.deleteItemAsync('access_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Listen for 401 events from the API interceptor
  useEffect(() => {
    const unsubscribe = authEvents.onUnauthorized(() => {
      setUser(null);
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    if (isLoggingIn.current) return;
    isLoggingIn.current = true;
    try {
      const res = await apiClient.post<ApiResponse<AuthTokens>>('/auth/login', {
        email,
        password,
      });
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Login failed');
      }
      try {
        await SecureStore.setItemAsync('access_token', res.data.data.access_token);
      } catch (storeErr) {
        throw new Error('Failed to save session. Please check device storage.');
      }
      await checkAuth();
    } finally {
      isLoggingIn.current = false;
    }
  };

  const register = async (email: string, password: string): Promise<void> => {
    if (isLoggingIn.current) return;
    isLoggingIn.current = true;
    try {
      const res = await apiClient.post<ApiResponse<AuthTokens>>('/auth/register', {
        email,
        password,
      });
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Registration failed');
      }
      try {
        await SecureStore.setItemAsync('access_token', res.data.data.access_token);
      } catch (storeErr) {
        throw new Error('Failed to save session. Please check device storage.');
      }
      await checkAuth();
    } finally {
      isLoggingIn.current = false;
    }
  };

  const logout = async (): Promise<void> => {
    await SecureStore.deleteItemAsync('access_token');
    setUser(null);
  };

  return { user, loading, login, register, logout, refresh: checkAuth };
}
