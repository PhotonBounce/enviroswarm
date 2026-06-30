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

  // Group data by sensor_type for the chart
  const chartData = data.map((r) => ({
    timestamp: new Date(r.timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    value: r.value,
    sensor_type: r.sensor_type,
    unit: r.unit,
  }))

  const ChartComponent = type === 'area' ? AreaChart : LineChart
  const DataComponent = type === 'area' ? Area : Line

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ChartComponent data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="timestamp" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
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
          formatter={(value: number) => [formatNumber(value, 2), 'Value']}
        />
        {showLegend && <Legend />}
        {type === 'area' ? (
          <Area type="monotone" dataKey="value" stroke={getSensorTypeColor(data[0]?.sensor_type ?? 'air_quality')} fill={getSensorTypeColor(data[0]?.sensor_type ?? 'air_quality')} fillOpacity={0.2} strokeWidth={2} dot={false} />
        ) : (
          <Line type="monotone" dataKey="value" stroke={getSensorTypeColor(data[0]?.sensor_type ?? 'air_quality')} strokeWidth={2} dot={false} />
        )}
      </ChartComponent>
    </ResponsiveContainer>
  )
}
