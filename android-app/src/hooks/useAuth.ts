import { useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '../api/client';
import { User, AuthTokens, ApiResponse } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      const res = await apiClient.get<ApiResponse<User>>('/me');
      if (res.data.success) {
        setUser(res.data.data);
      } else {
        await SecureStore.deleteItemAsync('access_token');
        setUser(null);
      }
    } catch {
      await SecureStore.deleteItemAsync('access_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string): Promise<void> => {
    const res = await apiClient.post<ApiResponse<AuthTokens>>('/auth/login', {
      email,
      password,
    });
    if (!res.data.success) {
      throw new Error(res.data.error || 'Login failed');
    }
    await SecureStore.setItemAsync('access_token', res.data.data.access_token);
    await checkAuth();
  };

  const register = async (email: string, password: string): Promise<void> => {
    const res = await apiClient.post<ApiResponse<AuthTokens>>('/auth/register', {
      email,
      password,
    });
    if (!res.data.success) {
      throw new Error(res.data.error || 'Registration failed');
    }
    await SecureStore.setItemAsync('access_token', res.data.data.access_token);
    await checkAuth();
  };

  const logout = async (): Promise<void> => {
    await SecureStore.deleteItemAsync('access_token');
    setUser(null);
  };

  return { user, loading, login, register, logout, refresh: checkAuth };
}
