import React, { useState, useMemo } from 'react'
import { Map as MapIcon, Radio } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { cn, getSensorTypeColor } from '@/lib/utils'
import type { SensorStation, SensorReading, SensorType } from '@/types'

interface HeatmapViewProps {
  stations: SensorStation[]
  readings: SensorReading[]
}

const sensorOptions: SensorType[] = [
  'air_quality', 'temperature', 'humidity', 'noise_level', 'radiation',
  'water_quality', 'co2', 'pm25', 'pm10', 'voc',
]

export default function HeatmapView({ stations, readings }: HeatmapViewProps) {
  const [selectedSensor, setSelectedSensor] = useState<SensorType>('temperature')

  const stationData = useMemo(() => {
    const latestByStation: Map<string, SensorReading> = new Map()
    for (const r of readings) {
      if (r.sensor_type !== selectedSensor) continue
      const existing = latestByStation.get(r.station_id)
      if (!existing || new Date(r.timestamp) > new Date(existing.timestamp)) {
        latestByStation.set(r.station_id, r)
      }
    }

    return stations.map((s) => ({
      ...s,
      latestReading: latestByStation.get(s.id),
      hasSensor: s.sensor_types.includes(selectedSensor),
    }))
  }, [stations, readings, selectedSensor])

  const values = stationData
    .filter((s) => s.latestReading)
    .map((s) => s.latestReading!.value)

  const minVal = values.length > 0 ? Math.min(...values) : 0
  const maxVal = values.length > 0 ? Math.max(...values) : 1

  const getIntensity = (value: number) => {
    if (maxVal === minVal) return 0.5
    return (value - minVal) / (maxVal - minVal)
  }

  const getColor = (intensity: number) => {
    const baseColor = getSensorTypeColor(selectedSensor)
    // Parse hex to rgba and vary opacity
    const r = parseInt(baseColor.slice(1, 3), 16)
    const g = parseInt(baseColor.slice(3, 5), 16)
    const b = parseInt(baseColor.slice(5, 7), 16)
    const opacity = 0.2 + intensity * 0.7
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
  }

  // Compute pseudo-map bounds for SVG viewBox
  const lats = stations.map((s) => s.latitude)
  const lons = stations.map((s) => s.longitude)
  const minLat = lats.length ? Math.min(...lats) - 0.02 : 40.7
  const maxLat = lats.length ? Math.max(...lats) + 0.02 : 40.75
  const minLon = lons.length ? Math.min(...lons) - 0.02 : -74.02
  const maxLon = lons.length ? Math.max(...lons) + 0.02 : -73.98

  const latRange = maxLat - minLat || 1
  const lonRange = maxLon - minLon || 1

  const project = (lat: number, lon: number) => {
    const x = ((lon - minLon) / lonRange) * 100
    const y = 100 - ((lat - minLat) / latRange) * 100
    return { x, y }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MapIcon className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Geographic Heatmap</h3>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Sensor:</label>
          <Select
            value={selectedSensor}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedSensor(e.target.value as SensorType)}
            className="w-40"
          >
            {sensorOptions.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ')}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-hidden rounded-xl">
          <div className="relative w-full aspect-[16/10] bg-muted/30">
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Grid background */}
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.2" className="text-border" />
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#grid)" />

              {/* Heatmap circles */}
              {stationData.map((s) => {
                const { x, y } = project(s.latitude, s.longitude)
                const intensity = s.latestReading ? getIntensity(s.latestReading.value) : 0
                const radius = s.hasSensor ? 8 + intensity * 12 : 4
                return (
                  <g key={s.id}>
                    {s.hasSensor && s.latestReading && (
                      <circle
                        cx={x}
                        cy={y}
                        r={radius}
                        fill={getColor(intensity)}
                        stroke={getSensorTypeColor(selectedSensor)}
                        strokeWidth="0.5"
                        className="transition-all duration-500"
                      />
                    )}
                    <circle
                      cx={x}
                      cy={y}
                      r="2"
                      fill={s.hasSensor ? getSensorTypeColor(selectedSensor) : '#6b7280'}
                      stroke="#1f2937"
                      strokeWidth="0.5"
                    />
                  </g>
                )
              })}
            </svg>

            {/* Legend overlay */}
            <div className="absolute bottom-3 left-3 rounded-lg border border-border bg-card/90 backdrop-blur px-3 py-2 space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Intensity</p>
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-20 rounded-full"
                  style={{
                    background: `linear-gradient(to right, ${getColor(0)}, ${getColor(1)})`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{formatNumber(minVal, 1)}</span>
                <span>{formatNumber(maxVal, 1)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Station legend */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {stationData.map((s) => (
          <div
            key={s.id}
            className={cn(
              'flex items-center justify-between rounded-lg border border-border p-3',
              !s.hasSensor && 'opacity-50'
            )}
          >
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{s.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}
                </p>
              </div>
            </div>
            {s.latestReading ? (
              <Badge variant="outline" className="font-mono text-xs">
                {formatNumber(s.latestReading.value, 1)} {s.latestReading.unit}
              </Badge>
            ) : s.hasSensor ? (
              <Badge variant="secondary" className="text-[10px]">No data</Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">No sensor</Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function formatNumber(value: number, decimals = 2): string {
  if (!isFinite(value)) return '—'
  return value.toFixed(decimals)
}
