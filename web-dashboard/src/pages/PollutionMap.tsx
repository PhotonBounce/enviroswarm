import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wind,
  Volume2,
  Sun,
  Droplets,
  Radio,
  Thermometer,
  Layers,
  MapPin,
  Info,
  Clock,
} from 'lucide-react'
import { demoMapStations, demoAQIHistory, getAQIColor, getAQILabel } from '@/lib/demoData'
import { GlassCard } from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'

type LayerType = 'all' | 'air' | 'noise' | 'light' | 'water' | 'radiation' | 'thermal'

const layerIcons: Record<LayerType, typeof Wind> = {
  all: Layers,
  air: Wind,
  noise: Volume2,
  light: Sun,
  water: Droplets,
  radiation: Radio,
  thermal: Thermometer,
}

const layerLabels: Record<LayerType, string> = {
  all: 'All Layers',
  air: 'Air Quality',
  noise: 'Noise',
  light: 'Light',
  water: 'Water',
  radiation: 'Radiation',
  thermal: 'Thermal',
}

const whoThresholds = [
  { label: 'Good', max: 50, color: '#22c55e' },
  { label: 'Moderate', max: 100, color: '#eab308' },
  { label: 'Unhealthy (Sens.)', max: 150, color: '#f97316' },
  { label: 'Unhealthy', max: 200, color: '#ef4444' },
  { label: 'Very Unhealthy', max: 300, color: '#a855f7' },
  { label: 'Hazardous', max: 500, color: '#7f1d1d' },
]

export default function PollutionMap() {
  const [activeLayer, setActiveLayer] = useState<LayerType>('all')
  const [timeIndex, setTimeIndex] = useState(12)
  const [selectedStation, setSelectedStation] = useState<string | null>(null)

  const filteredStations = useMemo(() => {
    if (activeLayer === 'all') return demoMapStations
    return demoMapStations.filter((s) => s.type === activeLayer)
  }, [activeLayer])

  // Simulate map viewport (NYC area)
  const mapBounds = { minLat: 40.65, maxLat: 40.80, minLon: -74.05, maxLon: -73.92 }
  const mapWidth = 1000
  const mapHeight = 600

  const latToY = (lat: number) =>
    mapHeight - ((lat - mapBounds.minLat) / (mapBounds.maxLat - mapBounds.minLat)) * mapHeight
  const lonToX = (lon: number) =>
    ((lon - mapBounds.minLon) / (mapBounds.maxLon - mapBounds.minLon)) * mapWidth

  const selectedStationData = selectedStation
    ? demoMapStations.find((s) => s.id === selectedStation)
    : null

  const currentAQI = demoAQIHistory[timeIndex]?.aqi ?? 58

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pollution Map</h1>
        <p className="text-muted-foreground">Interactive real-time pollution monitoring</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(layerLabels) as LayerType[]).map((layer) => {
            const Icon = layerIcons[layer]
            return (
              <button
                key={layer}
                onClick={() => setActiveLayer(layer)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  activeLayer === layer
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                <Icon className="h-4 w-4" />
                {layerLabels[layer]}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Time:
          </span>
          <input
            type="range"
            min={0}
            max={23}
            value={timeIndex}
            onChange={(e) => setTimeIndex(Number(e.target.value))}
            className="w-48"
          />
          <span className="text-sm font-mono w-12">
            {timeIndex.toString().padStart(2, '0')}:00
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {/* Map */}
        <GlassCard className="lg:col-span-3 p-0 overflow-hidden" intensity="high">
          <div className="relative w-full" style={{ paddingBottom: '60%' }}>
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox={`0 0 ${mapWidth} ${mapHeight}`}
              preserveAspectRatio="xMidYMid slice"
            >
              {/* Map background */}
              <rect width={mapWidth} height={mapHeight} fill="#0f172a" />
              {/* Grid lines */}
              {Array.from({ length: 10 }).map((_, i) => (
                <g key={i}>
                  <line
                    x1={0}
                    y1={(mapHeight / 10) * i}
                    x2={mapWidth}
                    y2={(mapHeight / 10) * i}
                    stroke="#1e293b"
                    strokeWidth={1}
                  />
                  <line
                    x1={(mapWidth / 10) * i}
                    y1={0}
                    x2={(mapWidth / 10) * i}
                    y2={mapHeight}
                    stroke="#1e293b"
                    strokeWidth={1}
                  />
                </g>
              ))}
              {/* Water areas (simulated) */}
              <ellipse cx={200} cy={400} rx={120} ry={80} fill="#1e293b" />
              <ellipse cx={800} cy={200} rx={100} ry={60} fill="#1e293b" />
              {/* Roads */}
              <line x1={0} y1={300} x2={mapWidth} y2={300} stroke="#334155" strokeWidth={3} strokeDasharray="10 5" />
              <line x1={500} y1={0} x2={500} y2={mapHeight} stroke="#334155" strokeWidth={3} strokeDasharray="10 5" />

              {/* Station markers */}
              {filteredStations.map((station) => {
                const cx = lonToX(station.lon)
                const cy = latToY(station.lat)
                const color = getAQIColor(station.aqi)
                const isSelected = selectedStation === station.id
                return (
                  <g key={station.id} onClick={() => setSelectedStation(station.id)} className="cursor-pointer">
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isSelected ? 24 : 16}
                      fill={color}
                      opacity={0.3}
                      className="transition-all"
                    />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isSelected ? 12 : 8}
                      fill={color}
                      stroke="#0f172a"
                      strokeWidth={2}
                      className="transition-all"
                    />
                    <text
                      x={cx}
                      y={cy - 20}
                      textAnchor="middle"
                      fill="#f8fafc"
                      fontSize={12}
                      fontWeight={600}
                      className="pointer-events-none"
                    >
                      {station.aqi}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        </GlassCard>

        {/* Sidebar info */}
        <div className="space-y-4">
          {/* Legend */}
          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">WHO Thresholds</h3>
            </div>
            <div className="space-y-2">
              {whoThresholds.map((t) => (
                <div key={t.label} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
                  <span className="text-xs text-muted-foreground">{t.label}</span>
                  <span className="text-xs text-muted-foreground ml-auto">≤ {t.max}</span>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Selected Station */}
          <AnimatePresence>
            {selectedStationData && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <GlassCard className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">{selectedStationData.name}</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Type</span>
                      <span className="text-xs font-medium capitalize">{selectedStationData.type}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">AQI</span>
                      <span className="text-sm font-bold" style={{ color: getAQIColor(selectedStationData.aqi) }}>
                        {selectedStationData.aqi} — {getAQILabel(selectedStationData.aqi)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Value</span>
                      <span className="text-xs font-medium">
                        {selectedStationData.value} {selectedStationData.unit}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Updated</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(selectedStationData.lastUpdated).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Time-based AQI */}
          <GlassCard className="p-4">
            <h3 className="text-sm font-semibold mb-2">Time-based AQI</h3>
            <div className="flex items-center gap-2">
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: getAQIColor(currentAQI) }}
              >
                {currentAQI}
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: getAQIColor(currentAQI) }}>
                  {getAQILabel(currentAQI)}
                </p>
                <p className="text-xs text-muted-foreground">At {timeIndex.toString().padStart(2, '0')}:00</p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
