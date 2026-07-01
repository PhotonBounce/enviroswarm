import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatNumber(value: number, decimals = 2): string {
  if (!isFinite(value)) return '—'
  return value.toFixed(decimals)
}

export function capitalize(str: string): string {
  if (typeof str !== 'string') return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function getSensorTypeColor(sensorType: string): string {
  const colors: Record<string, string> = {
    air_quality: '#10b981',
    temperature: '#f59e0b',
    humidity: '#3b82f6',
    noise_level: '#8b5cf6',
    radiation: '#ef4444',
    water_quality: '#06b6d4',
    co2: '#6b7280',
    pm25: '#f97316',
    pm10: '#ec4899',
    voc: '#84cc16',
  }
  return colors[sensorType] ?? '#10b981'
}

export function getSensorUnit(sensorType: string): string {
  const units: Record<string, string> = {
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
  }
  return units[sensorType] ?? ''
}
