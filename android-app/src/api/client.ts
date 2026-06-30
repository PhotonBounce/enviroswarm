import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.API_URL || 'http://localhost:8000';

export const apiClient: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

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
    }
    return Promise.reject(error);
  }
);
