// AQI color scale based on EPA standards
export const AQI_COLORS = {
  good: '#10b981',        // 0-50
  moderate: '#f59e0b',    // 51-100
  unhealthySensitive: '#f97316', // 101-150
  unhealthy: '#ef4444',   // 151-200
  veryUnhealthy: '#a855f7', // 201-300
  hazardous: '#7f1d1d',   // 301-500
} as const;

export const AQI_LABELS = {
  good: 'Good',
  moderate: 'Moderate',
  unhealthySensitive: 'Unhealthy for Sensitive Groups',
  unhealthy: 'Unhealthy',
  veryUnhealthy: 'Very Unhealthy',
  hazardous: 'Hazardous',
} as const;

export function getAQIColor(aqi: number): string {
  if (aqi <= 50) return AQI_COLORS.good;
  if (aqi <= 100) return AQI_COLORS.moderate;
  if (aqi <= 150) return AQI_COLORS.unhealthySensitive;
  if (aqi <= 200) return AQI_COLORS.unhealthy;
  if (aqi <= 300) return AQI_COLORS.veryUnhealthy;
  return AQI_COLORS.hazardous;
}

export function getAQILabel(aqi: number): string {
  if (aqi <= 50) return AQI_LABELS.good;
  if (aqi <= 100) return AQI_LABELS.moderate;
  if (aqi <= 150) return AQI_LABELS.unhealthySensitive;
  if (aqi <= 200) return AQI_LABELS.unhealthy;
  if (aqi <= 300) return AQI_LABELS.veryUnhealthy;
  return AQI_LABELS.hazardous;
}

// Pollution alert colors
export const ALERT_COLORS = {
  info: '#3b82f6',
  warning: '#f59e0b',
  critical: '#ef4444',
  success: '#10b981',
  muted: '#64748b',
} as const;

// Scientific readout colors (high contrast, monospace feel)
export const SCIENTIFIC_COLORS = {
  primary: '#10b981',
  secondary: '#06b6d4',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  background: '#0f172a',
  surface: '#1e293b',
  surfaceHighlight: '#334155',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  textDim: '#64748b',
  border: '#334155',
  grid: '#1e293b',
  monochrome: {
    high: '#f1f5f9',
    medium: '#94a3b8',
    low: '#64748b',
    dark: '#475569',
  },
} as const;

// Noise level colors
export const NOISE_COLORS = {
  safe: '#10b981',      // < 60 dB
  caution: '#f59e0b',   // 60-70 dB
  warning: '#f97316',   // 70-85 dB
  danger: '#ef4444',    // > 85 dB
} as const;

// Light level colors
export const LIGHT_COLORS = {
  dark: '#1e293b',      // < 10 lux
  dim: '#475569',       // 10-100 lux
  comfortable: '#10b981', // 100-500 lux
  bright: '#f59e0b',    // 500-1000 lux
  veryBright: '#ef4444', // > 1000 lux
} as const;

// Pollutant-specific colors
export const POLLUTANT_COLORS = {
  pm25: '#ef4444',
  pm10: '#f97316',
  co2: '#3b82f6',
  voc: '#a855f7',
  no2: '#f59e0b',
  o3: '#06b6d4',
  so2: '#eab308',
  co: '#64748b',
} as const;

// Theme export for backward compatibility
export const COLORS = {
  ...SCIENTIFIC_COLORS,
  aqi: AQI_COLORS,
  alert: ALERT_COLORS,
  noise: NOISE_COLORS,
  light: LIGHT_COLORS,
  pollutant: POLLUTANT_COLORS,
} as const;

export default COLORS;
