import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Radio, BarChart3, Zap, Wind, Shield, MapPin, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { useStations, useSensorData } from '@/hooks/useApi'
import { capitalize, formatDate, formatNumber } from '@/lib/utils'
import { demoAQIHistory, getAQIClass, getAQIColor, getAQILabel } from '@/lib/demoData'
import AQIGauge from '@/components/pollution/AQIGauge'
import PollutantBreakdown from '@/components/pollution/PollutantBreakdown'
import HealthAdvisory from '@/components/pollution/HealthAdvisory'
import ExposureTracker from '@/components/pollution/ExposureTracker'
import type { SensorStation } from '@/types'
import { cn } from '@/lib/utils'

import { useAuth } from '@/hooks/useAuth'

export default function Dashboard() {
  const { trial, isTrialActive, tier } = useAuth()
  const { data: stations, isLoading, error } = useStations()

  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const onFocus = () => setRefreshKey((k) => k + 1)
    window.addEventListener('focus', onFocus)
    const interval = setInterval(() => setRefreshKey((k) => k + 1), 60000)
    return () => {
      window.removeEventListener('focus', onFocus)
      clearInterval(interval)
    }
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
    const activeSensorCount = stations?.filter(s => s.status === 'active')?.reduce((acc: number, s: SensorStation) => acc + s.sensor_types.length, 0) ?? 0
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

  const currentAQI = useMemo(() => {
    const latest = demoAQIHistory[demoAQIHistory.length - 1]
    return latest?.aqi ?? 58
  }, [])

  const aqiColor = getAQIColor(currentAQI)
  const aqiLabel = getAQILabel(currentAQI)
  const aqiClass = getAQIClass(currentAQI)

  const chartData = useMemo(() => {
    return demoAQIHistory.map((d) => ({
      time: new Date(d.timestamp).getHours().toString().padStart(2, '0') + ':00',
      aqi: d.aqi,
      pm25: d.pm25,
    }))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Pollution monitoring overview and health insights</p>
      </div>

      {/* Trial Banner */}
      {isTrialActive && (
        <div className="rounded-xl bg-gradient-to-r from-teal-500 to-sky-500 p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5" />
              <div>
                <p className="font-semibold">Free Trial Active — All Features Unlocked!</p>
                <p className="text-sm opacity-90">
                  {trial?.daysRemaining} day{trial?.daysRemaining !== 1 ? 's' : ''} remaining. 
                  Upgrade anytime to keep enterprise access.
                </p>
              </div>
            </div>
            <Link to="/pricing">
              <Button variant="secondary" size="sm" className="bg-white text-teal-600 hover:bg-white/90">
                Upgrade
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Stats */}
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

      {/* Pollution Widgets Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* AQI Gauge */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wind className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Current AQI</h3>
          </div>
          <div className="flex items-center justify-center">
            <AQIGauge aqi={currentAQI} size={140} />
          </div>
          <div className="mt-3 text-center">
            <p className={cn('text-sm font-bold', aqiClass)}>
              {aqiLabel}
            </p>
            <p className="text-xs text-muted-foreground">
              Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
        </GlassCard>

        {/* Pollutant Breakdown */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Pollutant Breakdown</h3>
          </div>
          <PollutantBreakdown />
        </GlassCard>

        {/* Health Advisory */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Health Advisory</h3>
          </div>
          <HealthAdvisory aqi={currentAQI} />
        </GlassCard>
      </div>

      {/* Trend + Exposure + Map Preview Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Pollution Trend */}
        <GlassCard className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">24h AQI Trend</h3>
            </div>
            <span className={cn('text-xs font-bold px-2 py-1 rounded-full bg-muted', aqiClass)}>
              AQI {currentAQI}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="aqiGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={aqiColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={aqiColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                  color: '#f3f4f6',
                }}
              />
              <Area
                type="monotone"
                dataKey="aqi"
                stroke={aqiColor}
                fill="url(#aqiGradient)"
                strokeWidth={2}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="pm25"
                stroke="#f97316"
                fill="transparent"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 justify-center text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-4 rounded" style={{ backgroundColor: aqiColor }} />
              AQI
            </span>
            <span className="flex items-center gap-1">
              <span className="h-0.5 w-4 rounded" style={{ borderTop: '2px dashed #f97316' }} />
              PM2.5
            </span>
          </div>
        </GlassCard>

        {/* Exposure Summary */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Exposure Summary</h3>
          </div>
          <ExposureTracker todayAQI={currentAQI} />
        </GlassCard>
      </div>

      {/* Community Map Preview */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Community Map Preview</h3>
          </div>
          <Link to="/map">
            <Button variant="outline" size="sm">
              View Full Map
            </Button>
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { name: 'Central Park', aqi: 52, type: 'air' },
            { name: 'Downtown', aqi: 85, type: 'noise' },
            { name: 'Riverside', aqi: 38, type: 'water' },
            { name: 'Industrial', aqi: 22, type: 'radiation' },
          ].map((station) => (
            <motion.div
              key={station.name}
              className={cn(
                'rounded-lg border p-3 transition-all cursor-pointer hover:opacity-90',
                station.aqi <= 50 && 'border-emerald-500/30 bg-emerald-500/5',
                station.aqi > 50 && station.aqi <= 100 && 'border-yellow-500/30 bg-yellow-500/5',
                station.aqi > 100 && station.aqi <= 150 && 'border-orange-500/30 bg-orange-500/5',
                station.aqi > 150 && 'border-red-500/30 bg-red-500/5'
              )}
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">{station.name}</span>
                <span className={cn('text-xs font-bold', getAQIClass(station.aqi))}>
                  {station.aqi}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min((station.aqi / 200) * 100, 100)}%`,
                    backgroundColor: getAQIColor(station.aqi),
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground capitalize">{station.type} monitoring</p>
            </motion.div>
          ))}
        </div>
      </GlassCard>

      {/* Existing content */}
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
