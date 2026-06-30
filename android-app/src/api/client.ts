import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';

// Use Expo public env var for production builds
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.enviroswarm.example.com';

export const apiClient: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Simple event emitter for auth state changes
const authListeners = new Set<() => void>();
export const authEvents = {
  onUnauthorized: (cb: () => void) => {
    authListeners.add(cb);
    return () => authListeners.delete(cb);
  },
  emitUnauthorized: () => {
    authListeners.forEach((cb) => cb());
  },
};

apiClient.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('access_token');
      authEvents.emitUnauthorized();
    }
    return Promise.reject(error);
  }
);
