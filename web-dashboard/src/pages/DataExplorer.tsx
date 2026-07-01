import { useState } from 'react'
import { Search, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import SensorChart from '@/components/charts/SensorChart'
import { useStations, useSensorData } from '@/hooks/useApi'
import { formatDate, capitalize, formatNumber } from '@/lib/utils'
import type { SensorType, SensorReading } from '@/types'

const sensorOptions: SensorType[] = [
  'air_quality', 'temperature', 'humidity', 'noise_level', 'radiation',
  'water_quality', 'co2', 'pm25', 'pm10', 'voc',
]

const limitOptions = [10, 25, 50, 100]

export default function DataExplorer() {
  const { data: stations } = useStations()
  const [stationId, setStationId] = useState('')
  const [sensorType, setSensorType] = useState<SensorType | ''>('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const [dateError, setDateError] = useState('')
  const [queryParams, setQueryParams] = useState<{
    station_id?: string
    sensor_type?: SensorType
    start?: string
    end?: string
    limit?: number
    page?: number
  }>({})

  const { data: response, isLoading } = useSensorData(queryParams)
  const readings = response?.readings ?? []
  const meta = response?.meta

  const handleSearch = () => {
    setDateError('')
    const params: typeof queryParams = { page: 1, limit }
    if (stationId) params.station_id = stationId
    if (sensorType) params.sensor_type = sensorType
    if (start) {
      const startDate = new Date(start)
      if (!isNaN(startDate.getTime())) {
        params.start = startDate.toISOString()
      }
    }
    if (end) {
      const endDate = new Date(end)
      if (!isNaN(endDate.getTime())) {
        params.end = endDate.toISOString()
      }
    }
    if (params.start && params.end && new Date(params.start) > new Date(params.end)) {
      setDateError('Start date must be before end date')
      return
    }
    setPage(1)
    setQueryParams(params)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1) return
    if (meta && newPage > Math.ceil(meta.total / meta.limit)) return
    setPage(newPage)
    setQueryParams((prev) => ({ ...prev, page: newPage }))
  }

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit)
    setPage(1)
    setQueryParams((prev) => ({ ...prev, page: 1, limit: newLimit }))
  }

  const handleExportCsv = () => {
    if (!readings.length) return
    const headers = ['timestamp', 'station_id', 'sensor_type', 'value', 'unit']
    const rows = readings.map((r: SensorReading) => [
      r.timestamp,
      r.station_id,
      r.sensor_type,
      String(Number.isFinite(r.value) ? r.value : '—'),
      r.unit,
    ])
    const escapeCsv = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }
    const csv = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.map((value) => escapeCsv(String(value))).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sensor-data.csv'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const totalPages = meta ? Math.ceil(meta.total / meta.limit) : 1
  const stationNameMap = new Map((stations?.map((s) => [s.id, s.name]) ?? []))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Data Explorer</h1>
        <p className="text-muted-foreground">Query and visualize sensor data</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Query Builder</CardTitle>
          <CardDescription>Filter sensor readings by station, type, and time range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label htmlFor="station-select" className="text-sm font-medium">Station</label>
              <Select id="station-select" value={stationId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStationId(e.target.value)}>
                <option value="">All stations</option>
                {stations?.map((s: { id: string; name: string }) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="sensor-select" className="text-sm font-medium">Sensor Type</label>
              <Select id="sensor-select" value={sensorType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSensorType(e.target.value as SensorType)}>
                <option value="">All types</option>
                {sensorOptions.map((t) => (
                  <option key={t} value={t}>{capitalize(t)}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="start-date" className="text-sm font-medium">Start Date</label>
              <Input id="start-date" type="datetime-local" value={start} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label htmlFor="end-date" className="text-sm font-medium">End Date</label>
              <Input id="end-date" type="datetime-local" value={end} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEnd(e.target.value)} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button onClick={handleSearch}>
              <Search className="mr-2 h-4 w-4" />
              Run Query
            </Button>
            <Button variant="outline" onClick={handleExportCsv} disabled={!readings.length}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            {dateError && <div role="alert" className="w-full text-sm text-red-400">{dateError}</div>}
            <div className="ml-auto flex items-center gap-2">
              <label htmlFor="limit-select" className="text-sm text-muted-foreground">Per page:</label>
              <Select id="limit-select" value={String(limit)} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleLimitChange(Number(e.target.value))}>
                {limitOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="chart">
        <TabsList>
          <TabsTrigger value="chart">Chart</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
        </TabsList>
        <TabsContent value="chart">
          <Card>
            <CardHeader>
              <CardTitle>Time Series Visualization</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex h-64 items-center justify-center text-muted-foreground">Loading data...</div>
              ) : (
                <SensorChart data={readings} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="table">
          <Card>
            <CardHeader>
              <CardTitle>Readings</CardTitle>
              <CardDescription>
                {meta ? `${meta.total} records found · Page ${meta.page} of ${totalPages}` : `${readings.length} records found`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center text-muted-foreground py-8">Loading...</div>
              ) : readings.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Station</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Unit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {readings.map((reading: SensorReading) => (
                        <TableRow key={reading.id}>
                          <TableCell>{formatDate(reading.timestamp)}</TableCell>
                          <TableCell>{stationNameMap.get(reading.station_id) || reading.station_id}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{capitalize(reading.sensor_type)}</Badge>
                          </TableCell>
                          <TableCell className="font-mono">{typeof reading.value === 'number' ? formatNumber(reading.value, 3) : reading.value}</TableCell>
                          <TableCell>{reading.unit}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {meta && totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page <= 1}
                      >
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page >= totalPages}
                      >
                        Next
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center text-muted-foreground py-8">No data. Run a query to see results.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
