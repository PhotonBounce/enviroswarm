import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import api, { type ApiResponse } from '@/lib/api'
import { isDemoMode, getDemoData } from '@/lib/demoData'
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

const demo = getDemoData()

async function demoDelay(ms = 300) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Auth
export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: LoginRequest) => {
      if (isDemoMode()) {
        await demoDelay()
        return demo.loginResponse
      }
      const res = await api.post<ApiResponse<LoginResponse>>('/auth/login', data)
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Login failed')
      }
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useDemo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      if (isDemoMode()) {
        await demoDelay()
        return { ...demo.loginResponse, user: demo.user, message: 'Welcome to demo mode!' }
      }
      const res = await api.post<ApiResponse<LoginResponse & { user: User; message: string }>>('/auth/demo')
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Demo access failed')
      }
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: RegisterRequest) => {
      if (isDemoMode()) {
        await demoDelay()
        return demo.loginResponse
      }
      const res = await api.post<ApiResponse<LoginResponse>>('/auth/register', data)
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Registration failed')
      }
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      if (isDemoMode()) {
        await demoDelay(200)
        return demo.user
      }
      const res = await api.get<ApiResponse<User>>('/me')
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Failed to fetch user')
      }
      return res.data.data
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<Pick<User, 'email'>>) => {
      if (isDemoMode()) {
        await demoDelay()
        return { ...demo.user, ...data }
      }
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
  const { user } = useAuth()
  return useQuery({
    queryKey: ['stations', user?.id],
    queryFn: async () => {
      if (isDemoMode()) {
        await demoDelay(300)
        return demo.stations
      }
      const res = await api.get<ApiResponse<SensorStation[]>>('/stations')
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Failed to fetch stations')
      }
      return res.data.data
    },
  })
}

export function useStation(id: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['stations', id, user?.id],
    queryFn: async () => {
      if (isDemoMode()) {
        await demoDelay(200)
        const station = demo.stations.find((s) => s.id === id)
        if (!station) throw new Error('Station not found')
        return station
      }
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
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (data: CreateStationRequest) => {
      if (isDemoMode()) {
        await demoDelay()
        const newStation: SensorStation = {
          id: `stn-${Date.now()}`,
          user_id: user?.id || 'demo-user-001',
          name: data.name,
          latitude: data.latitude,
          longitude: data.longitude,
          sensor_types: data.sensor_types,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        demo.stations.push(newStation)
        return newStation
      }
      const res = await api.post<ApiResponse<SensorStation>>('/stations', data)
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Failed to create station')
      }
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stations', user?.id] })
    },
  })
}

// Data
export interface SensorDataResult {
  readings: SensorReading[]
  meta?: { page: number; limit: number; total: number }
}

export function useSensorData(params: DataQueryParams) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['sensorData', user?.id, params],
    queryFn: async () => {
      if (isDemoMode()) {
        await demoDelay(300)
        let filtered = [...demo.readings]
        if (params.station_id) {
          filtered = filtered.filter((r) => r.station_id === params.station_id)
        }
        if (params.sensor_type) {
          filtered = filtered.filter((r) => r.sensor_type === params.sensor_type)
        }
        if (params.start) {
          const startDate = new Date(params.start)
          filtered = filtered.filter((r) => new Date(r.timestamp) >= startDate)
        }
        if (params.end) {
          const endDate = new Date(params.end)
          filtered = filtered.filter((r) => new Date(r.timestamp) <= endDate)
        }
        const limit = params.limit ?? 50
        const page = params.page ?? 1
        const total = filtered.length
        const start = (page - 1) * limit
        const paged = filtered.slice(start, start + limit)
        return { readings: paged, meta: { page, limit, total } } as SensorDataResult
      }
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
  const { user } = useAuth()
  return useQuery({
    queryKey: ['nearbyData', user?.id, params],
    queryFn: async () => {
      if (isDemoMode()) {
        await demoDelay(300)
        return demo.readings.slice(0, 10)
      }
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
  const { user } = useAuth()
  return useQuery({
    queryKey: ['apikeys', user?.id],
    queryFn: async () => {
      if (isDemoMode()) {
        await demoDelay(200)
        return demo.apiKeys
      }
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
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (name: string) => {
      if (isDemoMode()) {
        await demoDelay()
        const newKey: ApiKeyCreateResponse = {
          id: `key-${Date.now()}`,
          user_id: user?.id || 'demo-id',
          name,
          raw_key: 'es_demo_' + Math.random().toString(36).substring(2, 18),
          permissions: { read: true, write: true },
          rate_limit_per_min: 1000,
          created_at: new Date().toISOString(),
        }
        return newKey
      }
      const res = await api.post<ApiResponse<ApiKeyCreateResponse>>('/apikeys', { name })
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Failed to create API key')
      }
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apikeys', user?.id] })
    },
  })
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode()) {
        await demoDelay()
        return { success: true }
      }
      const res = await api.delete<ApiResponse<unknown>>(`/apikeys/${id}`)
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Failed to delete API key')
      }
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apikeys', user?.id] })
    },
  })
}

// Pricing
export function usePricing() {
  return useQuery({
    queryKey: ['pricing'],
    queryFn: async () => {
      if (isDemoMode()) {
        await demoDelay(200)
        return demo.pricing
      }
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
      if (isDemoMode()) {
        await demoDelay()
        demo.user.tier = tier as any
        return { success: true, tier }
      }
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
