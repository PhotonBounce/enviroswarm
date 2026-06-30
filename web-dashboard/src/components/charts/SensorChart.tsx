import { useMemo } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { getSensorTypeColor, formatNumber } from '@/lib/utils'
import type { SensorReading } from '@/types'

interface SensorChartProps {
  data: SensorReading[]
  type?: 'line' | 'area'
  showLegend?: boolean
}

export default function SensorChart({ data, type = 'area', showLegend = true }: SensorChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No data available
      </div>
    )
  }

  // Group data by full ISO timestamp and sensor_type for multi-line chart.
  // Using the full timestamp prevents data loss when multiple readings occur
  // within the same minute (previously collisions were caused by minute-level
  // formatting used as the Map key).
  const chartData = useMemo(() => {
    const timestamps = new Map<string, Record<string, number>>()
    for (const r of data) {
      const ts = r.timestamp
      if (!timestamps.has(ts)) timestamps.set(ts, {})
      timestamps.get(ts)![r.sensor_type] = r.value
    }
    return Array.from(timestamps.entries()).map(([timestamp, values]) => ({
      timestamp,
      ...values,
    }))
  }, [data])

  const types = useMemo(() => {
    const set = new Set<string>()
    for (const r of data) set.add(r.sensor_type)
    return Array.from(set)
  }, [data])

  const ChartComponent = type === 'area' ? AreaChart : LineChart
  const DataComponent = type === 'area' ? Area : Line

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ChartComponent data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="timestamp"
          stroke="#9ca3af"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          angle={-45}
          height={60}
          tickFormatter={(ts: string) =>
            new Date(ts).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          }
        />
        <YAxis
          stroke="#9ca3af"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) => formatNumber(value, 1)}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '0.5rem',
            color: '#f3f4f6',
          }}
          formatter={(value: number, name: string) => [formatNumber(value, 2), name]}
        />
        {showLegend && <Legend />}
        {types.map((sensorType) => (
          type === 'area' ? (
            <Area
              key={sensorType}
              type="monotone"
              dataKey={sensorType}
              stroke={getSensorTypeColor(sensorType)}
              fill={getSensorTypeColor(sensorType)}
              fillOpacity={0.2}
              strokeWidth={2}
              dot={false}
            />
          ) : (
            <Line
              key={sensorType}
              type="monotone"
              dataKey={sensorType}
              stroke={getSensorTypeColor(sensorType)}
              strokeWidth={2}
              dot={false}
            />
          )
        ))}
      </ChartComponent>
    </ResponsiveContainer>
  )
}
