import { useMemo, useState, useEffect } from 'react'
import { Radio, BarChart3, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useStations, useSensorData } from '@/hooks/useApi'
import { capitalize, formatDate, formatNumber } from '@/lib/utils'
import type { SensorStation } from '@/types'

export default function Dashboard() {
  const { data: stations, isLoading, error } = useStations()

  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const onFocus = () => setRefreshKey((k) => k + 1)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }, [refreshKey])

  const now = useMemo(() => new Date().toISOString(), [refreshKey])

  const { data: todayResponse, isLoading: readingsLoading } = useSensorData({
    start: today,
    end: now,
    limit: 10,
  })

  const stats = useMemo(() => {
    const stationCount = stations?.length ?? 0
    const activeSensorCount = stations?.filter(s => s.status === 'active').reduce((acc: number, s: SensorStation) => acc + s.sensor_types.length, 0) ?? 0
    const readingCount = todayResponse?.meta?.total ?? todayResponse?.readings?.length ?? 0
    return [
      { label: 'Stations', value: String(stationCount), icon: Radio, change: stationCount === 1 ? '1 station' : `${stationCount} stations` },
      { label: 'Readings Today', value: String(readingCount), icon: BarChart3, change: readingCount > 0 ? 'Data collected today' : 'No readings yet today' },
      { label: 'Active Sensors', value: String(activeSensorCount), icon: Zap, change: activeSensorCount > 0 ? 'Sensors on active stations' : 'No sensors configured' },
    ]
  }, [stations, todayResponse])

  const recentActivity = useMemo(() => {
    if (todayResponse?.readings && todayResponse.readings.length > 0) {
      const sorted = [...todayResponse.readings].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 4)
      return sorted.map((reading) => ({
        id: reading.id,
        title: `${capitalize(reading.sensor_type)}: ${typeof reading.value === 'number' ? formatNumber(reading.value, 2) : reading.value} ${reading.unit}`,
        time: formatDate(reading.timestamp),
        type: 'reading' as const,
      }))
    }
    if (!stations || stations.length === 0) return []
    const sorted = [...stations].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 4)
    return sorted.map((station) => ({
      id: station.id,
      title: `Station "${station.name}" created`,
      time: formatDate(station.created_at),
      type: 'station' as const,
    }))
  }, [todayResponse, stations])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your environmental monitoring network</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.change}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your Stations</CardTitle>
            <CardDescription>Active sensor stations in your network</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center text-muted-foreground py-8">Loading stations...</div>
            ) : error ? (
              <div className="text-center text-red-400 py-8">
                <p>Failed to load stations</p>
                <p className="text-xs">{error instanceof Error ? error.message : 'Unknown error'}</p>
              </div>
            ) : stations && stations.length > 0 ? (
              <div className="space-y-3">
                {stations.slice(0, 3).map((station: SensorStation) => (
                  <div key={station.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="font-medium">{station.name}</p>
                      <div className="mt-1 flex gap-1">
                        {station.sensor_types.map((t: string) => (
                          <Badge key={t} variant="outline" className="text-[10px]">
                            {capitalize(t)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Badge variant={station.status === 'active' ? 'success' : 'secondary'}>
                      {station.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Radio className="h-8 w-8 mb-2" />
                <p>No stations yet</p>
                <p className="text-xs">Create your first sensor station to start collecting data</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest events from your network</CardDescription>
          </CardHeader>
          <CardContent>
            {readingsLoading ? (
              <div className="text-center text-muted-foreground py-8">Loading activity...</div>
            ) : recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <p>No recent activity</p>
                <p className="text-xs">Create a station to see activity here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
