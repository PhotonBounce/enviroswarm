import axios, { AxiosError, AxiosResponse } from 'axios'

export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
  meta?: { page: number; limit: number; total: number }
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('enviroswarm_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<unknown>>) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('enviroswarm_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
