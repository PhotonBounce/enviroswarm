import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api, { type ApiResponse } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import type {
  User,
  SensorStation,
  SensorReading,
  ApiKey,
  ApiKeyCreateResponse,
  PricingTier,
  LoginResponse,
  RegisterRequest,
  LoginRequest,
  CreateStationRequest,
  DataQueryParams,
  NearbyQueryParams,
} from '@/types'

// Auth
export function useLogin() {
  return useMutation({
    mutationFn: async (data: LoginRequest) => {
      const res = await api.post<ApiResponse<LoginResponse>>('/auth/login', data)
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Login failed')
      }
      return res.data.data
    },
  })
}

export function useRegister() {
  return useMutation({
    mutationFn: async (data: RegisterRequest) => {
      const res = await api.post<ApiResponse<LoginResponse>>('/auth/register', data)
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Registration failed')
      }
      return res.data.data
    },
  })
}

export function useMe() {
  const { isAuthenticated } = useAuth()
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<User>>('/me')
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Failed to fetch user')
      }
      return res.data.data
    },
    enabled: isAuthenticated,
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<Pick<User, 'email'>>) => {
      const res = await api.patch<ApiResponse<User>>('/me', data)
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Update failed')
      }
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

// Stations
export function useStations() {
  return useQuery({
    queryKey: ['stations'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<SensorStation[]>>('/stations')
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Failed to fetch stations')
      }
      return res.data.data
    },
  })
}

export function useStation(id: string) {
  return useQuery({
    queryKey: ['stations', id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<SensorStation>>(`/stations/${id}`)
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Failed to fetch station')
      }
      return res.data.data
    },
    enabled: !!id,
  })
}

export function useCreateStation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateStationRequest) => {
      const res = await api.post<ApiResponse<SensorStation>>('/stations', data)
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Failed to create station')
      }
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stations'] })
    },
  })
}

// Data
export interface SensorDataResult {
  readings: SensorReading[]
  meta?: { page: number; limit: number; total: number }
}

export function useSensorData(params: DataQueryParams) {
  return useQuery({
    queryKey: ['sensorData', params],
    queryFn: async () => {
      const res = await api.get<ApiResponse<SensorReading[]>>('/data', {
        params,
      })
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Failed to fetch sensor data')
      }
      return { readings: res.data.data, meta: res.data.meta } as SensorDataResult
    },
  })
}

export function useNearbyData(params: NearbyQueryParams) {
  return useQuery({
    queryKey: ['nearbyData', params],
    queryFn: async () => {
      const res = await api.get<ApiResponse<SensorReading[]>>('/data/nearby', {
        params,
      })
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Failed to fetch nearby data')
      }
      return res.data.data
    },
  })
}

// API Keys
export function useApiKeys() {
  return useQuery({
    queryKey: ['apikeys'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<ApiKey[]>>('/apikeys')
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Failed to fetch API keys')
      }
      return res.data.data
    },
  })
}

export function useCreateApiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await api.post<ApiResponse<ApiKey>>('/apikeys', { name })
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Failed to create API key')
      }
      // Map the backend's `key` field (raw key shown once at creation) to `raw_key` for clarity
      return { ...res.data.data, raw_key: res.data.data.key } as ApiKeyCreateResponse
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apikeys'] })
    },
  })
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete<ApiResponse<unknown>>(`/apikeys/${id}`)
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Failed to delete API key')
      }
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apikeys'] })
    },
  })
}

// Pricing
export function usePricing() {
  return useQuery({
    queryKey: ['pricing'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<PricingTier[]>>('/pricing')
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Failed to fetch pricing')
      }
      return res.data.data
    },
  })
}

export function useSubscribe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (tier: string) => {
      const res = await api.post<ApiResponse<unknown>>('/subscribe', { tier })
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Subscription failed')
      }
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}
