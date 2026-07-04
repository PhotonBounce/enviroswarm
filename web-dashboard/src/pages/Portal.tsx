import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Globe,
  Filter,
  Star,
  GitFork,
  Download,
  MapPin,
  Search,
  ChevronDown,
  Database,
  X,
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { getDemoData } from '@/lib/demoData'
import { getSensorTypeColor, capitalize, formatNumber } from '@/lib/utils'
import type { PublicDataset, SensorType } from '@/types'

const demoDatasets = getDemoData().publicDatasets

const regions = ['All Regions', 'North America', 'South America', 'Europe', 'Asia', 'Oceania', 'Arctic']
const sensorTypes: string[] = ['All Types', 'air_quality', 'temperature', 'humidity', 'noise_level', 'radiation', 'water_quality', 'co2', 'pm25', 'pm10', 'voc']
const dataQualities = ['All Quality', 'excellent', 'good', 'fair', 'poor']
const organizations = ['All Organizations', 'NYC Environmental Health Lab', 'Amazon Research Institute', 'Tokyo Climate Observatory', 'European Radiation Monitoring Network', 'Sydney Urban Planning', 'Arctic Climate Research']

function MiniChart({ data, color }: { data: { timestamp: string; value: number }[]; color: string }) {
  const values = data.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100
      const y = 100 - ((v - min) / range) * 100
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-16 w-full">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
        vectorEffect="non-scaling-stroke"
      />
      <circle cx="100" cy={100 - ((values[values.length - 1] - min) / range) * 100} r="3" fill={color} />
    </svg>
  )
}

function MapVisualization({ stations }: { stations: { name: string; latitude: number; longitude: number; sensor_types: SensorType[] }[] }) {
  // Simplified world map visualization using relative positioning
  const allLats = stations.map((s) => s.latitude)
  const allLons = stations.map((s) => s.longitude)
  const minLat = Math.min(...allLats) - 5
  const maxLat = Math.max(...allLats) + 5
  const minLon = Math.min(...allLons) - 10
  const maxLon = Math.max(...allLons) + 10
  const latRange = maxLat - minLat || 1
  const lonRange = maxLon - minLon || 1

  return (
    <div className="relative w-full h-64 md:h-80 rounded-xl overflow-hidden bg-gradient-to-br from-teal-900/40 to-sky-900/40 border border-white/10">
      <div className="absolute inset-0 opacity-30">
        {/* Simplified grid lines */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={`h-${i}`} className="absolute w-full border-t border-white/10" style={{ top: `${(i / 5) * 100}%` }} />
        ))}
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={`v-${i}`} className="absolute h-full border-l border-white/10" style={{ left: `${(i / 9) * 100}%` }} />
        ))}
      </div>
      {stations.map((station, idx) => {
        const x = ((station.longitude - minLon) / lonRange) * 100
        const y = 100 - ((station.latitude - minLat) / latRange) * 100
        return (
          <motion.div
            key={station.name + idx}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: idx * 0.1, type: 'spring', stiffness: 200 }}
            className="absolute group"
            style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
          >
            <div className="relative">
              <div className="h-3 w-3 rounded-full bg-teal-400 ring-2 ring-teal-400/30 animate-pulse" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                <div className="bg-card border border-border rounded-lg px-2 py-1 shadow-lg whitespace-nowrap">
                  <p className="text-xs font-medium">{station.name}</p>
                  <div className="flex gap-1 mt-0.5">
                    {station.sensor_types.map((t) => (
                      <span key={t} className="text-[8px] px-1 rounded bg-teal-500/20 text-teal-400">{t.replace('_', ' ')}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )
      })}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/40 backdrop-blur rounded-full px-3 py-1 text-xs text-white/80">
        <MapPin className="h-3 w-3 text-teal-400" />
        {stations.length} public stations
      </div>
    </div>
  )
}

export default function Portal() {
  const [search, setSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState('All Regions')
  const [sensorFilter, setSensorFilter] = useState('All Types')
  const [qualityFilter, setQualityFilter] = useState('All Quality')
  const [orgFilter, setOrgFilter] = useState('All Organizations')
  const [showFilters, setShowFilters] = useState(false)

  const filteredDatasets = useMemo(() => {
    return demoDatasets.filter((ds) => {
      const matchesSearch =
        !search ||
        ds.title.toLowerCase().includes(search.toLowerCase()) ||
        ds.description.toLowerCase().includes(search.toLowerCase()) ||
        ds.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
      const matchesRegion = regionFilter === 'All Regions' || ds.region === regionFilter
      const matchesSensor = sensorFilter === 'All Types' || ds.sensor_types.includes(sensorFilter as SensorType)
      const matchesQuality = qualityFilter === 'All Quality' || ds.data_quality === qualityFilter
      const matchesOrg = orgFilter === 'All Organizations' || ds.organization === orgFilter
      return matchesSearch && matchesRegion && matchesSensor && matchesQuality && matchesOrg
    })
  }, [search, regionFilter, sensorFilter, qualityFilter, orgFilter])

  const activeFilterCount = [regionFilter, sensorFilter, qualityFilter, orgFilter].filter(
    (f, i) => (i === 0 ? f !== 'All Regions' : i === 1 ? f !== 'All Types' : i === 2 ? f !== 'All Quality' : f !== 'All Organizations')
  ).length

  const clearFilters = () => {
    setRegionFilter('All Regions')
    setSensorFilter('All Types')
    setQualityFilter('All Quality')
    setOrgFilter('All Organizations')
    setSearch('')
  }

  const mapStations = useMemo(() => {
    return demoDatasets.flatMap((ds) =>
      Array.from({ length: ds.station_count }, (_, i) => ({
        name: `${ds.title} Station ${i + 1}`,
        latitude: ds.preview_data[0]?.value ? 30 + Math.random() * 40 : 30 + Math.random() * 40,
        longitude: ds.preview_data[0]?.value ? -120 + Math.random() * 200 : -120 + Math.random() * 200,
        sensor_types: ds.sensor_types,
      }))
    ).slice(0, 30)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Portal</h1>
          <p className="text-muted-foreground">Discover and explore public environmental datasets from the global community</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search datasets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <Filter className="h-4 w-4 mr-1.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-teal-500 text-[10px] flex items-center justify-center text-white font-bold">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      <MapVisualization stations={mapStations} />

      {showFilters && (
        <GlassCard intensity="low" className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Filter Datasets</h3>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1">
                <X className="h-3 w-3" />
                Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Region</label>
              <Select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
                {regions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Sensor Type</label>
              <Select value={sensorFilter} onChange={(e) => setSensorFilter(e.target.value)}>
                {sensorTypes.map((s) => (
                  <option key={s} value={s}>
                    {s === 'All Types' ? s : capitalize(s.replace('_', ' '))}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Data Quality</label>
              <Select value={qualityFilter} onChange={(e) => setQualityFilter(e.target.value)}>
                {dataQualities.map((q) => (
                  <option key={q} value={q}>
                    {capitalize(q)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Organization</label>
              <Select value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)}>
                {organizations.map((o) => (
                  <option key={o} value={o}>
                    {o === 'All Organizations' ? o : o}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </GlassCard>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{filteredDatasets.length}</span> datasets
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredDatasets.map((dataset, idx) => (
          <motion.div
            key={dataset.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <GlassCard hoverLift className="h-full flex flex-col">
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/dataset/${dataset.id}`}
                      className="text-base font-semibold hover:text-teal-400 transition-colors line-clamp-1"
                    >
                      {dataset.title}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">{dataset.organization}</p>
                  </div>
                  <Badge variant={dataset.data_quality === 'excellent' ? 'success' : 'secondary'} className="ml-2 shrink-0">
                    {capitalize(dataset.data_quality)}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{dataset.description}</p>

                <div className="mb-3">
                  <MiniChart data={dataset.preview_data} color={getSensorTypeColor(dataset.sensor_types[0])} />
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {dataset.sensor_types.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border"
                      style={{
                        borderColor: getSensorTypeColor(t) + '40',
                        color: getSensorTypeColor(t),
                        backgroundColor: getSensorTypeColor(t) + '15',
                      }}
                    >
                      {capitalize(t.replace('_', ' '))}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-auto pt-3 border-t border-border/50">
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5" />
                    {dataset.stars}
                  </span>
                  <span className="flex items-center gap-1">
                    <GitFork className="h-3.5 w-3.5" />
                    {dataset.forks}
                  </span>
                  <span className="flex items-center gap-1">
                    <Download className="h-3.5 w-3.5" />
                    {dataset.downloads}
                  </span>
                  <span className="flex items-center gap-1 ml-auto">
                    <Database className="h-3.5 w-3.5" />
                    {formatNumber(dataset.reading_count, 0)}
                  </span>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {filteredDatasets.length === 0 && (
        <div className="text-center py-16">
          <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-1">No datasets found</h3>
          <p className="text-sm text-muted-foreground">Try adjusting your filters or search query</p>
          <Button variant="outline" className="mt-4" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      )}
    </div>
  )
}
