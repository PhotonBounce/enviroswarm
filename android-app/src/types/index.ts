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
  | 'voc';

export const SENSOR_TYPES: SensorType[] = [
  'air_quality',
  'temperature',
  'humidity',
  'noise_level',
  'radiation',
  'water_quality',
  'co2',
  'pm25',
  'pm10',
  'voc',
];

export const SENSOR_UNITS: Record<SensorType, string> = {
  air_quality: 'AQI',
  temperature: '°C',
  humidity: '%',
  noise_level: 'dB',
  radiation: 'µSv/h',
  water_quality: 'WQI',
  co2: 'ppm',
  pm25: 'µg/m³',
  pm10: 'µg/m³',
  voc: 'ppb',
};

export interface User {
  id: string;
  email: string;
  tier: 'free' | 'pro' | 'enterprise';
  created_at: string;
}

export interface SensorStation {
  id: string;
  user_id: string;
  name: string;
  latitude: number;
  longitude: number;
  sensor_types: SensorType[];
  status: 'active' | 'inactive' | 'maintenance';
  created_at: string;
}

export interface SensorReading {
  id: string;
  station_id: string;
  sensor_type: SensorType;
  value: number;
  unit: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
}
