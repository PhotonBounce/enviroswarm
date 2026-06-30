import { useState } from 'react'
import { Search, Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import SensorChart from '@/components/charts/SensorChart'
import { useStations, useSensorData } from '@/hooks/useApi'
import { formatDate, capitalize } from '@/lib/utils'
import type { SensorType, SensorReading } from '@/types'

const sensorOptions: SensorType[] = [
  'air_quality', 'temperature', 'humidity', 'noise_level', 'radiation',
  'water_quality', 'co2', 'pm25', 'pm10', 'voc',
]

export default function DataExplorer() {
  const { data: stations } = useStations()
  const [stationId, setStationId] = useState('')
  const [sensorType, setSensorType] = useState<SensorType | ''>('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [queryParams, setQueryParams] = useState<{
    station_id?: string
    sensor_type?: SensorType
    start?: string
    end?: string
    limit?: number
  }>({})

  const { data: readings, isLoading } = useSensorData(queryParams)

  const handleSearch = () => {
    const params: typeof queryParams = {}
    if (stationId) params.station_id = stationId
    if (sensorType) params.sensor_type = sensorType
    if (start) params.start = new Date(start).toISOString()
    if (end) params.end = new Date(end).toISOString()
    params.limit = 500
    setQueryParams(params)
  }

  const filteredReadings = readings ?? []

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
              <label className="text-sm font-medium">Station</label>
              <Select value={stationId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStationId(e.target.value)}>
                <option value="">All stations</option>
                {stations?.map((s: { id: string; name: string }) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sensor Type</label>
              <Select value={sensorType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSensorType(e.target.value as SensorType)}>
                <option value="">All types</option>
                {sensorOptions.map((t) => (
                  <option key={t} value={t}>{capitalize(t)}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input type="datetime-local" value={start} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Input type="datetime-local" value={end} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEnd(e.target.value)} />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={handleSearch}>
              <Search className="mr-2 h-4 w-4" />
              Run Query
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
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
                <SensorChart data={filteredReadings} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="table">
          <Card>
            <CardHeader>
              <CardTitle>Readings</CardTitle>
              <CardDescription>{filteredReadings.length} records found</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center text-muted-foreground py-8">Loading...</div>
              ) : filteredReadings.length > 0 ? (
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
                    {filteredReadings.slice(0, 50).map((reading: SensorReading) => (
                      <TableRow key={reading.id}>
                        <TableCell>{formatDate(reading.timestamp)}</TableCell>
                        <TableCell>{reading.station_id}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{capitalize(reading.sensor_type)}</Badge>
                        </TableCell>
                        <TableCell className="font-mono">{reading.value.toFixed(3)}</TableCell>
                        <TableCell>{reading.unit}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
