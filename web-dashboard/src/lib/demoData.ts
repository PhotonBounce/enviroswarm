/**
 * Demo Mode — Standalone data that works without a backend API.
 * When the backend is unreachable, all hooks fall back to this data.
 */

import type { User, SensorStation, SensorReading, ApiKey, PricingTier, Alert, Organization, WebhookConfig } from '@/types'

export const demoUser: User = {
  id: 'demo-id',
  email: 'demo@enviroswarm.app',
  tier: 'enterprise',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
}

export const demoStations: SensorStation[] = [
  {
    id: '1',
    user_id: 'demo-id',
    name: 'Central Park Air Monitor',
    latitude: 40.7128,
    longitude: -74.006,
    sensor_types: ['temperature', 'humidity', 'co2', 'pm25', 'pm10'],
    status: 'active',
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
  },
  {
    id: '2',
    user_id: 'demo-id',
    name: 'Riverside Water Station',
    latitude: 40.758,
    longitude: -73.9855,
    sensor_types: ['temperature', 'noise_level', 'voc', 'water_quality'],
    status: 'active',
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
  },
  {
    id: '3',
    user_id: 'demo-id',
    name: 'Downtown Noise Logger',
    latitude: 40.7484,
    longitude: -73.9857,
    sensor_types: ['noise_level', 'voc', 'radiation'],
    status: 'maintenance',
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
  },
]

export const demoReadings: SensorReading[] = (() => {
  const readings: SensorReading[] = []
  let idCounter = 1
  const baseDate = new Date('2026-07-01T00:00:00Z')

  // Generate readings for 10 days across 3 stations
  for (let day = 0; day < 10; day++) {
    const dayDate = new Date(baseDate)
    dayDate.setDate(dayDate.getDate() + day)

    // Station 1: temperature, humidity, co2, pm25, pm10 (hourly for 8 hours)
    for (let hour = 0; hour < 8; hour++) {
      const ts = new Date(dayDate)
      ts.setHours(hour)
      readings.push(
        { id: `r${idCounter++}`, station_id: '1', sensor_type: 'temperature', value: 20 + Math.random() * 10, unit: '°C', timestamp: ts.toISOString() },
        { id: `r${idCounter++}`, station_id: '1', sensor_type: 'humidity', value: 50 + Math.random() * 30, unit: '%', timestamp: ts.toISOString() },
        { id: `r${idCounter++}`, station_id: '1', sensor_type: 'co2', value: 400 + Math.random() * 100, unit: 'ppm', timestamp: ts.toISOString() },
        { id: `r${idCounter++}`, station_id: '1', sensor_type: 'pm25', value: 5 + Math.random() * 20, unit: 'µg/m³', timestamp: ts.toISOString() },
        { id: `r${idCounter++}`, station_id: '1', sensor_type: 'pm10', value: 10 + Math.random() * 30, unit: 'µg/m³', timestamp: ts.toISOString() },
      )
    }

    // Station 2: temperature, noise_level, voc, water_quality (every 3 hours)
    for (let hour = 0; hour < 24; hour += 3) {
      const ts = new Date(dayDate)
      ts.setHours(hour)
      readings.push(
        { id: `r${idCounter++}`, station_id: '2', sensor_type: 'temperature', value: 18 + Math.random() * 8, unit: '°C', timestamp: ts.toISOString() },
        { id: `r${idCounter++}`, station_id: '2', sensor_type: 'noise_level', value: 40 + Math.random() * 40, unit: 'dB', timestamp: ts.toISOString() },
        { id: `r${idCounter++}`, station_id: '2', sensor_type: 'voc', value: 100 + Math.random() * 200, unit: 'ppb', timestamp: ts.toISOString() },
        { id: `r${idCounter++}`, station_id: '2', sensor_type: 'water_quality', value: 70 + Math.random() * 30, unit: 'WQI', timestamp: ts.toISOString() },
      )
    }

    // Station 3: noise_level, voc, radiation (every 6 hours, fewer data points)
    for (let hour = 0; hour < 24; hour += 6) {
      const ts = new Date(dayDate)
      ts.setHours(hour)
      readings.push(
        { id: `r${idCounter++}`, station_id: '3', sensor_type: 'noise_level', value: 50 + Math.random() * 35, unit: 'dB', timestamp: ts.toISOString() },
        { id: `r${idCounter++}`, station_id: '3', sensor_type: 'voc', value: 80 + Math.random() * 150, unit: 'ppb', timestamp: ts.toISOString() },
        { id: `r${idCounter++}`, station_id: '3', sensor_type: 'radiation', value: 0.05 + Math.random() * 0.15, unit: 'µSv/h', timestamp: ts.toISOString() },
      )
    }
  }

  return readings
})()

export const demoApiKeys: ApiKey[] = [
  {
    id: '1',
    user_id: 'demo-id',
    name: 'Production API Key',
    key_hash: 'pk_live_****',
    permissions: { read: true, write: true },
    rate_limit_per_min: 1000,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: '2',
    user_id: 'demo-id',
    name: 'Development Key',
    key_hash: 'pk_test_****',
    permissions: { read: true, write: false },
    rate_limit_per_min: 100,
    created_at: '2026-03-01T00:00:00Z',
  },
]

export const demoPricing: PricingTier[] = [
  { name: 'Free', tier: 'free', price: 0, description: 'For hobbyists and small projects', features: ['3 stations', 'Basic charts', 'Email alerts', '7-day data retention'] },
  { name: 'Pro', tier: 'pro', price: 29, description: 'For growing teams and businesses', features: ['25 stations', 'Advanced analytics', 'Real-time alerts', 'API access', '30-day data retention'] },
  { name: 'Enterprise', tier: 'enterprise', price: 99, description: 'For large organizations', features: ['Unlimited stations', 'Custom dashboards', 'Priority support', 'White-label', '1-year data retention'] },
]

export const demoAlerts: Alert[] = [
  { id: '1', station_id: '1', sensor_type: 'air_quality', condition: '>', threshold: 50, message: 'Air quality exceeds safe levels', status: 'active', created_at: '2026-01-01T00:00:00Z' },
  { id: '2', station_id: '1', sensor_type: 'temperature', condition: '>', threshold: 30, message: 'Temperature above normal range', status: 'active', created_at: '2026-02-01T00:00:00Z' },
  { id: '3', station_id: '1', sensor_type: 'co2', condition: '>', threshold: 1000, message: 'CO2 concentration high', status: 'triggered', created_at: '2026-03-01T00:00:00Z' },
]

export const demoOrganizations: Organization[] = [
  { id: '1', name: 'Acme Corp', slug: 'acme-corp', role: 'admin', member_count: 5, station_count: 12, created_at: '2026-01-01T00:00:00Z' },
  { id: '2', name: 'GreenTech Labs', slug: 'greentech-labs', role: 'member', member_count: 3, station_count: 5, created_at: '2026-02-01T00:00:00Z' },
]

export const demoWebhooks: WebhookConfig[] = [
  { id: '1', url: 'https://hooks.example.com/alert', events: ['alert.triggered'], secret: 'whsec_****', active: true, created_at: '2026-01-01T00:00:00Z' },
]

// ---------------------------------------------------------------------------
// Demo mode helpers
// ---------------------------------------------------------------------------

let _demoMode = false

export function enableDemoMode() {
  _demoMode = true
  localStorage.setItem('enviroswarm_demo', '1')
}

export function disableDemoMode() {
  _demoMode = false
  localStorage.removeItem('enviroswarm_demo')
}

export function isDemoMode(): boolean {
  if (typeof window !== 'undefined') {
    return _demoMode || localStorage.getItem('enviroswarm_demo') === '1'
  }
  return _demoMode
}

export function getDemoData() {
  return {
    user: demoUser,
    stations: demoStations,
    readings: demoReadings,
    apiKeys: demoApiKeys,
    pricing: demoPricing,
    alerts: demoAlerts,
    organizations: demoOrganizations,
    webhooks: demoWebhooks,
    loginResponse: {
      access_token: 'demo_token',
      token_type: 'Bearer',
    },
  }
}
