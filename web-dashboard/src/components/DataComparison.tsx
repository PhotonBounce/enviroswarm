import React, { useState, useMemo } from 'react'
import { BarChart3, Check, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import SensorChart from '@/components/charts/SensorChart'
import { cn, capitalize, formatNumber, getSensorUnit } from '@/lib/utils'
import type { SensorStation, SensorReading } from '@/types'

interface DataComparisonProps {
  stations: SensorStation[]
  readings: SensorReading[]
}

export default function DataComparison({ stations, readings }: DataComparisonProps) {
  const [selectedStationIds, setSelectedStationIds] = useState<string[]>([])

  const toggleStation = (id: string) => {
    setSelectedStationIds((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id)
      if (prev.length >= 4) return prev
      return [...prev, id]
    })
  }

  const selectedStations = stations.filter((s) => selectedStationIds.includes(s.id))

  const comparisonReadings = useMemo(() => {
    return readings.filter((r) => selectedStationIds.includes(r.station_id))
  }, [readings, selectedStationIds])

  const statsByStation = useMemo(() => {
    const map = new Map<string, Record<string, { min: number; max: number; avg: number; count: number; unit: string }>>()

    for (const r of comparisonReadings) {
      if (!map.has(r.station_id)) map.set(r.station_id, {})
      const stationStats = map.get(r.station_id)!
      if (!stationStats[r.sensor_type]) {
        stationStats[r.sensor_type] = { min: r.value, max: r.value, avg: r.value, count: 1, unit: r.unit }
      } else {
        const s = stationStats[r.sensor_type]
        s.min = Math.min(s.min, r.value)
        s.max = Math.max(s.max, r.value)
        s.avg = (s.avg * s.count + r.value) / (s.count + 1)
        s.count += 1
      }
    }
    return map
  }, [comparisonReadings])

  const allSensorTypes = useMemo(() => {
    const set = new Set<string>()
    for (const r of comparisonReadings) set.add(r.sensor_type)
    return Array.from(set)
  }, [comparisonReadings])

  const stationNameMap = new Map(stations.map((s) => [s.id, s.name]))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Multi-Station Comparison</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          Select 2-4 stations
        </span>
      </div>

      {/* Station selector */}
      <div className="flex flex-wrap gap-2">
        {stations.map((s) => {
          const selected = selectedStationIds.includes(s.id)
          return (
            <button
              key={s.id}
              onClick={() => toggleStation(s.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                selected
                  ? 'bg-emerald-900/30 border-emerald-600/40 text-emerald-400'
                  : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {selected && <Check className="h-3 w-3" />}
              {s.name}
            </button>
          )
        })}
      </div>

      {selectedStations.length < 2 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>Select at least 2 stations to compare</p>
        </div>
      ) : (
        <Tabs defaultValue="chart">
          <TabsList>
            <TabsTrigger value="chart">Chart</TabsTrigger>
            <TabsTrigger value="table">Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="chart">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Comparison Chart — {selectedStations.map((s) => s.name).join(', ')}
                </CardTitle>
                <CardDescription>
                  {comparisonReadings.length} readings across {selectedStations.length} stations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {comparisonReadings.length > 0 ? (
                  <SensorChart data={comparisonReadings} />
                ) : (
                  <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
                    No data available for selected stations
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="table">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Side-by-Side Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                {allSensorTypes.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8 text-sm">
                    No sensor data to compare
                  </div>
                ) : (
                  <div className="space-y-6">
                    {allSensorTypes.map((sensorType) => (
                      <div key={sensorType}>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Badge variant="outline">{capitalize(sensorType)}</Badge>
                          <span className="text-xs text-muted-foreground">{getSensorUnit(sensorType)}</span>
                        </h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Station</TableHead>
                              <TableHead>Min</TableHead>
                              <TableHead>Max</TableHead>
                              <TableHead>Avg</TableHead>
                              <TableHead>Readings</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedStations.map((s) => {
                              const stats = statsByStation.get(s.id)?.[sensorType]
                              return (
                                <TableRow key={s.id}>
                                  <TableCell className="font-medium text-sm">{s.name}</TableCell>
                                  <TableCell className="font-mono text-sm">
                                    {stats ? formatNumber(stats.min, 2) : '—'}
                                  </TableCell>
                                  <TableCell className="font-mono text-sm">
                                    {stats ? formatNumber(stats.max, 2) : '—'}
                                  </TableCell>
                                  <TableCell className="font-mono text-sm">
                                    {stats ? formatNumber(stats.avg, 2) : '—'}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {stats ? stats.count : '—'}
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
