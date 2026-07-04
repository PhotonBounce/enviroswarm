import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  MapPin,
  Filter,
  BellRing,
  BellOff,
  History,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Wind,
  Volume2,
  Sun,
  Droplets,
  Radio,
  Thermometer,
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import PollutionAlertCard from '@/components/pollution/PollutionAlert'
import { demoPollutionAlerts } from '@/lib/demoData'
import type { PollutionAlert } from '@/lib/demoData'
import { cn } from '@/lib/utils'

const typeIcons = {
  air: Wind,
  noise: Volume2,
  light: Sun,
  water: Droplets,
  radiation: Radio,
  thermal: Thermometer,
}

const typeColors = {
  air: '#22c55e',
  noise: '#8b5cf6',
  light: '#eab308',
  water: '#06b6d4',
  radiation: '#ef4444',
  thermal: '#f97316',
}

const severityIcons = {
  low: CheckCircle2,
  moderate: AlertTriangle,
  high: ShieldAlert,
  critical: AlertTriangle,
}

export default function CommunityAlerts() {
  const [alerts, setAlerts] = useState<PollutionAlert[]>(demoPollutionAlerts)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [filterLocation, setFilterLocation] = useState<string>('all')
  const [showResolved, setShowResolved] = useState(true)
  const [subscribed, setSubscribed] = useState<Record<string, boolean>>({})
  const [subscribedAreas, setSubscribedAreas] = useState<string[]>([])
  const [areaInput, setAreaInput] = useState('')

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (!showResolved && alert.resolved) return false
      if (filterType !== 'all' && alert.type !== filterType) return false
      if (filterSeverity !== 'all' && alert.severity !== filterSeverity) return false
      if (filterLocation !== 'all' && !alert.location.toLowerCase().includes(filterLocation.toLowerCase())) return false
      return true
    })
  }, [alerts, filterType, filterSeverity, filterLocation, showResolved])

  const locations = useMemo(() => {
    const set = new Set(alerts.map((a) => a.location))
    return Array.from(set)
  }, [alerts])

  const handleDismiss = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }

  const handleSubscribeArea = () => {
    if (areaInput.trim() && !subscribedAreas.includes(areaInput.trim())) {
      setSubscribedAreas((prev) => [...prev, areaInput.trim()])
      setAreaInput('')
    }
  }

  const toggleTypeSubscription = (type: string) => {
    setSubscribed((prev) => ({ ...prev, [type]: !prev[type] }))
  }

  const activeCount = alerts.filter((a) => !a.resolved).length
  const criticalCount = alerts.filter((a) => a.severity === 'critical' && !a.resolved).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Community Alerts</h1>
          <p className="text-muted-foreground">Real-time pollution alerts from your community</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-500">
            <ShieldAlert className="h-4 w-4" />
            {criticalCount} critical
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1.5 text-sm font-medium text-orange-500">
            <Bell className="h-4 w-4" />
            {activeCount} active
          </div>
        </div>
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Filter Alerts</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Pollutant Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Types</option>
              <option value="air">Air Quality</option>
              <option value="noise">Noise</option>
              <option value="light">Light</option>
              <option value="water">Water</option>
              <option value="radiation">Radiation</option>
              <option value="thermal">Thermal</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Severity</label>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Severities</option>
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Location</label>
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Locations</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showResolved}
                onChange={(e) => setShowResolved(e.target.checked)}
                className="rounded border-input"
              />
              Show resolved
            </label>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Alert Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Alert Feed
            </h2>
            <span className="text-xs text-muted-foreground">
              {filteredAlerts.length} alert{filteredAlerts.length !== 1 ? 's' : ''}
            </span>
          </div>

          <AnimatePresence>
            {filteredAlerts.length > 0 ? (
              filteredAlerts.map((alert) => (
                <PollutionAlertCard
                  key={alert.id}
                  alert={alert}
                  onDismiss={handleDismiss}
                />
              ))
            ) : (
              <motion.div
                className="text-center py-12 text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <BellOff className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No alerts match your filters</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Subscribe by Pollutant Type */}
          <GlassCard className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <BellRing className="h-4 w-4 text-primary" />
              Subscribe by Type
            </h3>
            <div className="space-y-2">
              {(Object.keys(typeIcons) as Array<keyof typeof typeIcons>).map((type) => {
                const Icon = typeIcons[type]
                const isSubscribed = !!subscribed[type]
                return (
                  <button
                    key={type}
                    onClick={() => toggleTypeSubscription(type)}
                    className={cn(
                      'w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
                      isSubscribed
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" style={{ color: typeColors[type] }} />
                      <span className="capitalize">{type} Alerts</span>
                    </div>
                    {isSubscribed ? (
                      <BellRing className="h-4 w-4" />
                    ) : (
                      <Bell className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                )
              })}
            </div>
          </GlassCard>

          {/* Subscribe by Area */}
          <GlassCard className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Subscribe by Area
            </h3>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={areaInput}
                onChange={(e) => setAreaInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubscribeArea()}
                placeholder="Enter area name..."
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <Button size="sm" onClick={handleSubscribeArea}>
                Add
              </Button>
            </div>
            {subscribedAreas.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {subscribedAreas.map((area) => (
                  <span
                    key={area}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                  >
                    <MapPin className="h-3 w-3" />
                    {area}
                    <button
                      onClick={() => setSubscribedAreas((prev) => prev.filter((a) => a !== area))}
                      className="ml-1 hover:text-destructive"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No areas subscribed yet.</p>
            )}
          </GlassCard>

          {/* Historical Alert Stats */}
          <GlassCard className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Alert History
            </h3>
            <div className="space-y-2">
              {['critical', 'high', 'moderate', 'low'].map((severity) => {
                const count = alerts.filter((a) => a.severity === severity).length
                const active = alerts.filter((a) => a.severity === severity && !a.resolved).length
                const color =
                  severity === 'critical'
                    ? 'bg-red-500'
                    : severity === 'high'
                    ? 'bg-orange-500'
                    : severity === 'moderate'
                    ? 'bg-yellow-500'
                    : 'bg-blue-500'
                return (
                  <div key={severity} className="flex items-center gap-2">
                    <div className={cn('h-2 w-2 rounded-full', color)} />
                    <span className="text-xs capitalize flex-1">{severity}</span>
                    <span className="text-xs text-muted-foreground">
                      {active} active / {count} total
                    </span>
                  </div>
                )
              })}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
