import axios, { AxiosError, AxiosResponse } from 'axios'

export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
  meta?: { page: number; limit: number; total: number }
}

const apiBaseUrl = import.meta.env.VITE_API_URL
if (!apiBaseUrl) {
  throw new Error('VITE_API_URL is not defined. Please set it in your environment.')
}

const api = axios.create({
  baseURL: `${apiBaseUrl}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// SECURITY WARNING: Storing JWT in localStorage is vulnerable to XSS attacks.
// In production, prefer httpOnly secure cookies or a service-worker token vault.
// The backend must support cookie-based auth for a true httpOnly solution.
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

let isRedirecting = false

api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<unknown>>) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('enviroswarm_token')
      if (!isRedirecting) {
        isRedirecting = true
        // Emit a custom event so the SPA can handle navigation without a full reload
        window.dispatchEvent(new CustomEvent('enviroswarm:unauthorized'))
        // Fallback: still redirect if nothing listens, but debounce to avoid loops
        setTimeout(() => {
          isRedirecting = false
          window.location.href = '/login'
        }, 100)
      }
    }
    return Promise.reject(error)
  }
)

export default api
