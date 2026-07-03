export type UserTier = 'free' | 'pro' | 'enterprise'

export interface User {
  id: string
  email: string
  tier: UserTier
  created_at: string
  updated_at: string
}

export type SensorType =
  | 'air_quality'
  | 'temperature'
  | 'humidity'
  | 'noise_level'
  | 'radiation'
  | 'water_quality'
  | 'co2'
  | 'pm25'
  | 'pm10'
  | 'voc'

export type StationStatus = 'active' | 'inactive' | 'maintenance'

export interface SensorStation {
  id: string
  user_id: string
  name: string
  latitude: number
  longitude: number
  sensor_types: SensorType[]
  status: StationStatus
  created_at: string
  updated_at: string
}

export interface SensorReading {
  id: string
  station_id: string
  sensor_type: SensorType
  value: number
  unit: string
  timestamp: string
  metadata?: Record<string, unknown>
}

export interface ApiKeyCreateResponse {
  id: string
  user_id: string
  name: string
  raw_key: string
  permissions: { read: boolean; write: boolean }
  rate_limit_per_min: number
  last_used_at?: string
  expires_at?: string
  created_at: string
}

export interface ApiKey {
  id: string
  user_id: string
  name: string
  key_hash: string
  permissions: { read: boolean; write: boolean }
  rate_limit_per_min: number
  last_used_at?: string
  expires_at?: string
  created_at: string
}

export interface Subscription {
  id: string
  user_id: string
  tier: UserTier
  start_date: string
  end_date: string
  payment_status: string
}

export interface PricingTier {
  name: string
  tier: UserTier
  price: number
  description: string
  features: string[]
}

export interface LoginResponse {
  access_token: string
  token_type: string
}

export interface RegisterRequest {
  email: string
  password: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface CreateStationRequest {
  name: string
  latitude: number
  longitude: number
  sensor_types: SensorType[]
}

export interface DataQueryParams {
  station_id?: string
  sensor_type?: SensorType
  start?: string
  end?: string
  limit?: number
  page?: number
  aggregate?: string
}

export interface NearbyQueryParams {
  lat: number
  lon: number
  radius_km: number
  sensor_type?: SensorType
}

export interface Alert {
  id: string
  station_id: string
  sensor_type: SensorType
  condition: string
  threshold: number
  message: string
  status: string
  created_at: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  role: string
  member_count: number
  station_count: number
  created_at: string
}

export interface WebhookConfig {
  id: string
  url: string
  events: string[]
  secret: string
  active: boolean
  created_at: string
}
