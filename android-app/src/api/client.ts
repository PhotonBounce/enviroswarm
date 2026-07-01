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

let cachedToken: string | null = null;

apiClient.interceptors.request.use(
  async (config) => {
    if (cachedToken === null) {
      cachedToken = await SecureStore.getItemAsync('access_token');
    }
    if (cachedToken) {
      config.headers.Authorization = `Bearer ${cachedToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      cachedToken = null;
      await SecureStore.deleteItemAsync('access_token');
      authEvents.emitUnauthorized();
    }
    return Promise.reject(error);
  }
);
