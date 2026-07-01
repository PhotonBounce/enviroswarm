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
  withCredentials: true,  // Send httpOnly cookies with cross-origin requests
})

// The backend uses httpOnly cookies for web auth. The browser sends
// the cookie automatically via withCredentials: true.
// Mobile/API clients configure their own axios instance with Authorization headers.
api.interceptors.request.use(
  (config) => {
    // No manual token handling needed — httpOnly cookies are sent automatically
    return config
  },
  (error) => Promise.reject(error)
)

let isRedirecting = false

api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<unknown>>) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    if (error.response?.status === 401) {
      if (!isRedirecting) {
        isRedirecting = true
        window.dispatchEvent(new CustomEvent('enviroswarm:unauthorized'))
        setTimeout(() => {
          isRedirecting = false
        }, 100)
      }
    }
    return Promise.reject(error)
  }
)

export default api
