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
  timeout: 30000,
})

// CRITICAL SECURITY WARNING: Reading the JWT from sessionStorage and attaching it
// to every request exposes the token to XSS. The long-term fix is to move to
// httpOnly secure cookies managed by the backend, so the browser sends the
// cookie automatically and the token is never accessible to JavaScript.
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('enviroswarm_token')
    if (token && config.headers && !config.headers.Authorization) {
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
      sessionStorage.removeItem('enviroswarm_token')
      if (!isRedirecting) {
        isRedirecting = true
        // Emit a custom event so the SPA can handle navigation without a full reload
        window.dispatchEvent(new CustomEvent('enviroswarm:unauthorized'))
        // Reset flag after a short delay to allow future re-auth attempts
        setTimeout(() => {
          isRedirecting = false
        }, 100)
      }
    }
    return Promise.reject(error)
  }
)

export default api
