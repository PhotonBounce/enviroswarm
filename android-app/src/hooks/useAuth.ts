import { useState, useEffect, useCallback, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import { AxiosError } from 'axios';
import { apiClient, authEvents, clearCachedToken } from '../api/client';
import type { User, AuthTokens, ApiResponse } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isLoggingIn = useRef(false);

  const checkAuth = useCallback(async (): Promise<User | null> => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      if (!token) {
        setUser(null);
        return null;
      }
      const res = await apiClient.get<ApiResponse<User>>('/me');
      if (res.data?.success) {
        setUser(res.data.data);
        return res.data.data;
      } else {
        try {
          await SecureStore.deleteItemAsync('access_token');
        } catch (storeErr) {
          // ignore SecureStore errors; preserve original error
        }
        clearCachedToken();
        setUser(null);
        throw new Error(res.data?.error || 'Session validation failed');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Auth check failed:', message);
      // Only clear the session on 401 (unauthorized). For 403, 500, or network
      // errors, preserve the token so the user can retry later.
      if (err instanceof AxiosError && err.response?.status === 401) {
        try {
          await SecureStore.deleteItemAsync('access_token');
        } catch (storeErr) {
          // ignore SecureStore errors; preserve original error
        }
        clearCachedToken();
        setUser(null);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth().catch(() => {
      // Non-401 errors are intentionally swallowed on initial mount so the
      // token is preserved and the user can retry later.
    });
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
      const userData = await checkAuth();
      if (!userData) {
        throw new Error('Session validation failed after login. Please try again.');
      }
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
      const userData = await checkAuth();
      if (!userData) {
        throw new Error('Session validation failed after registration. Please try again.');
      }
    } finally {
      isLoggingIn.current = false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync('access_token');
    } catch (storeErr) {
      // ignore SecureStore errors; proceed with clearing React state
    }
    clearCachedToken();
    setUser(null);
  };

  return { user, loading, login, register, logout, refresh: checkAuth };
}
