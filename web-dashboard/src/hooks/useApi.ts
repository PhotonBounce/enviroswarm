import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api, { type ApiResponse } from '@/lib/api'
import type {
  User,
  SensorStation,
  SensorReading,
  ApiKey,
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
      return res.data.data
    },
  })
}

export function useRegister() {
  return useMutation({
    mutationFn: async (data: RegisterRequest) => {
      const res = await api.post<ApiResponse<LoginResponse>>('/auth/register', data)
      return res.data.data
    },
  })
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<User>>('/me')
      return res.data.data
    },
    enabled: !!localStorage.getItem('enviroswarm_token'),
  })
}

// Stations
export function useStations() {
  return useQuery({
    queryKey: ['stations'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<SensorStation[]>>('/stations')
      return res.data.data
    },
  })
}

export function useStation(id: string) {
  return useQuery({
    queryKey: ['stations', id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<SensorStation>>(`/stations/${id}`)
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
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stations'] })
    },
  })
}

// Data
export function useSensorData(params: DataQueryParams) {
  return useQuery({
    queryKey: ['sensorData', params],
    queryFn: async () => {
      const res = await api.get<ApiResponse<SensorReading[]>>('/data', {
        params,
      })
      return res.data.data
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
      return res.data.data
    },
  })
}

export function useCreateApiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await api.post<ApiResponse<ApiKey>>('/apikeys', { name })
      return res.data.data
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
      return res.data.data
    },
  })
}

export function useSubscribe() {
  return useMutation({
    mutationFn: async (tier: string) => {
      const res = await api.post<ApiResponse<unknown>>('/subscribe', { tier })
      return res.data.data
    },
  })
}
