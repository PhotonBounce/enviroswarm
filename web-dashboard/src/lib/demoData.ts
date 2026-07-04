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

export const demoPublicDatasets: PublicDataset[] = [
  {
    id: 'ds1',
    title: 'NYC Air Quality Summer 2026',
    description: 'Comprehensive air quality monitoring data from 45 stations across New York City, including PM2.5, PM10, CO2, and VOC readings.',
    creator: 'Dr. Sarah Chen',
    creator_id: 'u1',
    organization: 'NYC Environmental Health Lab',
    organization_slug: 'nyc-ehl',
    license: 'CC-BY-4.0',
    visibility: 'public',
    sensor_types: ['pm25', 'pm10', 'co2', 'voc'],
    region: 'North America',
    data_quality: 'excellent',
    station_count: 45,
    reading_count: 128450,
    stars: 342,
    forks: 28,
    downloads: 1567,
    citations: 89,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-07-03T00:00:00Z',
    tags: ['air-quality', 'urban', 'summer', 'new-york'],
    preview_data: Array.from({ length: 24 }, (_, i) => ({
      timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
      value: 15 + Math.random() * 25,
      sensor_type: 'pm25' as SensorType,
    })),
  },
  {
    id: 'ds2',
    title: 'Amazon Basin Water Quality',
    description: 'Water quality index measurements from 12 river monitoring stations in the Amazon Basin, tracking pH, turbidity, and dissolved oxygen.',
    creator: 'Prof. Maria Silva',
    creator_id: 'u2',
    organization: 'Amazon Research Institute',
    organization_slug: 'ari',
    license: 'CC-BY-SA-4.0',
    visibility: 'public',
    sensor_types: ['water_quality', 'temperature'],
    region: 'South America',
    data_quality: 'good',
    station_count: 12,
    reading_count: 45600,
    stars: 218,
    forks: 15,
    downloads: 892,
    citations: 56,
    created_at: '2026-05-15T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    tags: ['water-quality', 'amazon', 'rivers', 'biodiversity'],
    preview_data: Array.from({ length: 24 }, (_, i) => ({
      timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
      value: 70 + Math.random() * 25,
      sensor_type: 'water_quality' as SensorType,
    })),
  },
  {
    id: 'ds3',
    title: 'Tokyo Urban Heat Island',
    description: 'Temperature and humidity data documenting the urban heat island effect across Tokyo metropolitan area.',
    creator: 'Kenji Tanaka',
    creator_id: 'u3',
    organization: 'Tokyo Climate Observatory',
    organization_slug: 'tco',
    license: 'CC0',
    visibility: 'public',
    sensor_types: ['temperature', 'humidity'],
    region: 'Asia',
    data_quality: 'excellent',
    station_count: 30,
    reading_count: 87600,
    stars: 189,
    forks: 22,
    downloads: 723,
    citations: 45,
    created_at: '2026-04-20T00:00:00Z',
    updated_at: '2026-07-02T00:00:00Z',
    tags: ['temperature', 'urban-heat', 'tokyo', 'climate'],
    preview_data: Array.from({ length: 24 }, (_, i) => ({
      timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
      value: 25 + Math.random() * 8,
      sensor_type: 'temperature' as SensorType,
    })),
  },
  {
    id: 'ds4',
    title: 'European Radiation Baseline',
    description: 'Background radiation levels across 8 European countries using calibrated geiger counters.',
    creator: 'Dr. Hans Mueller',
    creator_id: 'u4',
    organization: 'European Radiation Monitoring Network',
    organization_slug: 'ermn',
    license: 'ODbL-1.0',
    visibility: 'public',
    sensor_types: ['radiation'],
    region: 'Europe',
    data_quality: 'excellent',
    station_count: 8,
    reading_count: 23400,
    stars: 156,
    forks: 10,
    downloads: 445,
    citations: 34,
    created_at: '2026-03-10T00:00:00Z',
    updated_at: '2026-06-28T00:00:00Z',
    tags: ['radiation', 'baseline', 'europe', 'safety'],
    preview_data: Array.from({ length: 24 }, (_, i) => ({
      timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
      value: 0.08 + Math.random() * 0.12,
      sensor_type: 'radiation' as SensorType,
    })),
  },
  {
    id: 'ds5',
    title: 'Sydney Noise Pollution Survey',
    description: 'Noise level monitoring at 20 locations across Sydney, capturing traffic, construction, and ambient noise patterns.',
    creator: 'Emily Watson',
    creator_id: 'u5',
    organization: 'Sydney Urban Planning',
    organization_slug: 'sup',
    license: 'CC-BY-4.0',
    visibility: 'public',
    sensor_types: ['noise_level'],
    region: 'Oceania',
    data_quality: 'good',
    station_count: 20,
    reading_count: 56200,
    stars: 134,
    forks: 8,
    downloads: 334,
    citations: 21,
    created_at: '2026-02-28T00:00:00Z',
    updated_at: '2026-06-15T00:00:00Z',
    tags: ['noise', 'urban', 'sydney', 'pollution'],
    preview_data: Array.from({ length: 24 }, (_, i) => ({
      timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
      value: 45 + Math.random() * 30,
      sensor_type: 'noise_level' as SensorType,
    })),
  },
  {
    id: 'ds6',
    title: 'Arctic CO2 Monitoring 2026',
    description: 'High-resolution CO2 measurements from remote Arctic stations, critical for climate change research.',
    creator: 'Dr. Ingrid Johansson',
    creator_id: 'u6',
    organization: 'Arctic Climate Research',
    organization_slug: 'acr',
    license: 'CC0',
    visibility: 'public',
    sensor_types: ['co2'],
    region: 'Arctic',
    data_quality: 'excellent',
    station_count: 5,
    reading_count: 18900,
    stars: 267,
    forks: 31,
    downloads: 678,
    citations: 72,
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-07-03T00:00:00Z',
    tags: ['co2', 'arctic', 'climate-change', 'greenhouse-gas'],
    preview_data: Array.from({ length: 24 }, (_, i) => ({
      timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
      value: 410 + Math.random() * 20,
      sensor_type: 'co2' as SensorType,
    })),
  },
]

export const demoProjects: Project[] = [
  {
    id: 'proj1',
    name: 'Urban Heat Island Research',
    description: 'Collaborative study on urban heat islands across major metropolitan areas.',
    visibility: 'public',
    owner: 'Dr. Sarah Chen',
    owner_id: 'u1',
    members: [
      { id: 'u1', name: 'Dr. Sarah Chen', email: 'sarah.chen@nyc-ehl.org', role: 'owner', joined_at: '2026-01-01T00:00:00Z' },
      { id: 'u2', name: 'Prof. Maria Silva', email: 'maria@ari.org', role: 'admin', joined_at: '2026-01-15T00:00:00Z' },
      { id: 'u3', name: 'Kenji Tanaka', email: 'kenji@tco.jp', role: 'editor', joined_at: '2026-02-01T00:00:00Z' },
      { id: 'u7', name: 'Alex Rivera', email: 'alex@enviroswarm.app', role: 'viewer', joined_at: '2026-03-01T00:00:00Z' },
    ],
    shared_station_ids: ['1', '2'],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-07-03T00:00:00Z',
    starred: true,
  },
  {
    id: 'proj2',
    name: 'Global Water Quality Initiative',
    description: 'International collaboration tracking water quality trends in major river systems.',
    visibility: 'organization',
    owner: 'Prof. Maria Silva',
    owner_id: 'u2',
    members: [
      { id: 'u2', name: 'Prof. Maria Silva', email: 'maria@ari.org', role: 'owner', joined_at: '2026-02-01T00:00:00Z' },
      { id: 'u5', name: 'Emily Watson', email: 'emily@sup.gov.au', role: 'admin', joined_at: '2026-02-15T00:00:00Z' },
      { id: 'u8', name: 'Jamie Liu', email: 'jamie@enviroswarm.app', role: 'editor', joined_at: '2026-04-01T00:00:00Z' },
    ],
    shared_station_ids: ['2'],
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-06-20T00:00:00Z',
    starred: false,
  },
]

export const demoActivities: ActivityItem[] = [
  { id: 'a1', type: 'dataset_added', actor: 'Dr. Sarah Chen', actor_id: 'u1', message: 'added 3 new stations to Urban Heat Island Research', target: 'Urban Heat Island Research', target_id: 'proj1', created_at: '2026-07-03T10:00:00Z' },
  { id: 'a2', type: 'commit', actor: 'Kenji Tanaka', actor_id: 'u3', message: 'published analysis notebook: "Tokyo Heat Correlation"', target: 'Urban Heat Island Research', target_id: 'proj1', created_at: '2026-07-03T09:30:00Z' },
  { id: 'a3', type: 'member_joined', actor: 'Alex Rivera', actor_id: 'u7', message: 'joined the project', target: 'Urban Heat Island Research', target_id: 'proj1', created_at: '2026-07-02T14:00:00Z' },
  { id: 'a4', type: 'fork', actor: 'Dr. Hans Mueller', actor_id: 'u4', message: 'forked NYC Air Quality Summer 2026', target: 'NYC Air Quality Summer 2026', target_id: 'ds1', created_at: '2026-07-02T11:00:00Z' },
  { id: 'a5', type: 'note_created', actor: 'Prof. Maria Silva', actor_id: 'u2', message: 'created note: "Amazon pH Anomalies"', target: 'Global Water Quality Initiative', target_id: 'proj2', created_at: '2026-07-01T16:00:00Z' },
  { id: 'a6', type: 'star', actor: 'Emily Watson', actor_id: 'u5', message: 'starred Arctic CO2 Monitoring 2026', target: 'Arctic CO2 Monitoring 2026', target_id: 'ds6', created_at: '2026-07-01T10:00:00Z' },
  { id: 'a7', type: 'comment', actor: 'Jamie Liu', actor_id: 'u8', message: 'commented on Sydney Noise Pollution Survey', target: 'Sydney Noise Pollution Survey', target_id: 'ds5', created_at: '2026-06-30T18:00:00Z' },
  { id: 'a8', type: 'commit', actor: 'Dr. Ingrid Johansson', actor_id: 'u6', message: 'updated dataset with June readings', target: 'Arctic CO2 Monitoring 2026', target_id: 'ds6', created_at: '2026-06-30T12:00:00Z' },
]

export const demoCommunityFeed: CommunityFeedItem[] = [
  { id: 'cf1', type: 'dataset', actor: 'Dr. Sarah Chen', actor_id: 'u1', actor_org: 'NYC Environmental Health Lab', title: 'NYC Air Quality Summer 2026', description: 'Comprehensive air quality monitoring from 45 NYC stations', stars: 342, comments: 28, tags: ['air-quality', 'urban'], created_at: '2026-07-03T08:00:00Z' },
  { id: 'cf2', type: 'project', actor: 'Prof. Maria Silva', actor_id: 'u2', actor_org: 'Amazon Research Institute', title: 'Global Water Quality Initiative', description: 'International water quality tracking across major rivers', stars: 89, comments: 12, tags: ['water-quality', 'collaboration'], created_at: '2026-07-02T14:00:00Z' },
  { id: 'cf3', type: 'dataset', actor: 'Dr. Ingrid Johansson', actor_id: 'u6', actor_org: 'Arctic Climate Research', title: 'Arctic CO2 Monitoring 2026', description: 'High-resolution Arctic CO2 for climate research', stars: 267, comments: 45, tags: ['co2', 'climate-change'], created_at: '2026-07-01T10:00:00Z' },
  { id: 'cf4', type: 'organization', actor: 'Tokyo Climate Observatory', actor_id: 'tco', actor_org: 'Tokyo Climate Observatory', title: 'Tokyo Climate Observatory', description: 'Now sharing 30 stations with the community', stars: 156, comments: 8, tags: ['organization', 'japan'], created_at: '2026-06-30T09:00:00Z' },
  { id: 'cf5', type: 'dataset', actor: 'Kenji Tanaka', actor_id: 'u3', actor_org: 'Tokyo Climate Observatory', title: 'Tokyo Urban Heat Island', description: 'Urban heat island effect across Tokyo metro', stars: 189, comments: 22, tags: ['temperature', 'urban'], created_at: '2026-06-28T11:00:00Z' },
  { id: 'cf6', type: 'dataset', actor: 'Dr. Hans Mueller', actor_id: 'u4', actor_org: 'European Radiation Monitoring Network', title: 'European Radiation Baseline', description: 'Background radiation across 8 European countries', stars: 156, comments: 15, tags: ['radiation', 'europe'], created_at: '2026-06-25T13:00:00Z' },
]

export const demoNotebooks: NotebookEntry[] = [
  {
    id: 'nb1',
    title: 'Tokyo Heat Correlation Analysis',
    content: '# Tokyo Heat Correlation Analysis\n\n## Overview\nThis notebook examines the correlation between temperature and humidity in Tokyo\'s urban heat island.\n\n## Key Findings\n- Peak temperatures occur 2-3 hours later in central districts\n- Humidity drops significantly during heat peaks\n- Nighttime cooling is 40% slower in dense urban areas\n\n## Methodology\nData collected from 30 monitoring stations across the Tokyo metropolitan area.',
    tags: ['temperature', 'urban-heat', 'tokyo', 'analysis'],
    author: 'Kenji Tanaka',
    author_id: 'u3',
    project_id: 'proj1',
    charts: [
      { title: 'Temperature vs Humidity', dataset_id: 'ds3', sensor_type: 'temperature' },
      { title: 'Daily Heat Patterns', dataset_id: 'ds3', sensor_type: 'humidity' },
    ],
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-03T00:00:00Z',
    shared_with: ['proj1'],
  },
  {
    id: 'nb2',
    title: 'Amazon pH Anomalies',
    content: '# Amazon pH Anomalies\n\n## Observations\nUnusual pH readings detected in upstream stations during the wet season.\n\n## Hypothesis\nIncreased agricultural runoff may be contributing to localized acidification.\n\n## Next Steps\n- Collect additional upstream samples\n- Correlate with rainfall data\n- Compare with historical baselines',
    tags: ['water-quality', 'amazon', 'ph', 'research'],
    author: 'Prof. Maria Silva',
    author_id: 'u2',
    project_id: 'proj2',
    charts: [
      { title: 'pH Trend Over Time', dataset_id: 'ds2', sensor_type: 'water_quality' },
    ],
    created_at: '2026-06-28T00:00:00Z',
    updated_at: '2026-06-30T00:00:00Z',
    shared_with: ['proj2'],
  },
]

export const demoComments: Comment[] = [
  { id: 'c1', author: 'Dr. Sarah Chen', author_id: 'u1', content: 'Excellent dataset! The temporal resolution is perfect for our urban heat correlation study.', created_at: '2026-07-03T12:00:00Z', likes: 8 },
  { id: 'c2', author: 'Prof. Maria Silva', author_id: 'u2', content: 'Would you consider adding VOC data to this collection? It would be valuable for our combined analysis.', created_at: '2026-07-02T10:00:00Z', likes: 5 },
  { id: 'c3', author: 'Kenji Tanaka', author_id: 'u3', content: 'I\'ve forked this for our Tokyo comparison. The methodology is very solid.', created_at: '2026-07-01T15:00:00Z', likes: 12 },
  { id: 'c4', author: 'Alex Rivera', author_id: 'u7', content: 'New to the community — this is exactly the kind of open data we need more of.', created_at: '2026-06-30T09:00:00Z', likes: 3 },
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
    publicDatasets: demoPublicDatasets,
    projects: demoProjects,
    activities: demoActivities,
    communityFeed: demoCommunityFeed,
    notebooks: demoNotebooks,
    comments: demoComments,
    loginResponse: {
      access_token: 'demo_token',
      token_type: 'Bearer',
    },
  }
}
