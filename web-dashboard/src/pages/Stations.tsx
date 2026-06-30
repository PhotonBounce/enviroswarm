import { useState } from 'react'
import { Radio, Plus, MapPin } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { useStations, useCreateStation } from '@/hooks/useApi'
import { capitalize } from '@/lib/utils'
import type { SensorType, SensorStation } from '@/types'

const sensorOptions: SensorType[] = [
  'air_quality', 'temperature', 'humidity', 'noise_level', 'radiation',
  'water_quality', 'co2', 'pm25', 'pm10', 'voc',
]

export default function Stations() {
  const { data: stations, isLoading } = useStations()
  const createStation = useCreateStation()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [selectedSensors, setSelectedSensors] = useState<SensorType[]>([])
  const [formError, setFormError] = useState('')

  const toggleSensor = (type: SensorType) => {
    setSelectedSensors((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!name.trim() || !latitude || !longitude || selectedSensors.length === 0) {
      setFormError('All fields are required')
      return
    }
    try {
      await createStation.mutateAsync({
        name: name.trim(),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        sensor_types: selectedSensors,
      })
      setName('')
      setLatitude('')
      setLongitude('')
      setSelectedSensors([])
      setDialogOpen(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create station'
      setFormError(message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stations</h1>
          <p className="text-muted-foreground">Manage your sensor stations</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Station
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading stations...</div>
      ) : stations && stations.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stations.map((station: SensorStation) => (
            <Card key={station.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{station.name}</CardTitle>
                  <Badge variant={station.status === 'active' ? 'success' : 'secondary'}>
                    {station.status}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {station.latitude.toFixed(6)}, {station.longitude.toFixed(6)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {station.sensor_types.map((t: string) => (
                    <Badge key={t} variant="outline" className="text-[10px]">
                      {capitalize(t)}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Radio className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No stations yet</p>
            <p className="text-sm text-muted-foreground">Create your first station to start monitoring</p>
          </CardContent>
        </Card>
      )}

      {dialogOpen && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogHeader>
            <DialogTitle>Create New Station</DialogTitle>
            <DialogDescription>Add a new sensor station to your network</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Station Name</label>
              <Input value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder="e.g. Park Air Monitor" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Latitude</label>
                <Input value={latitude} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLatitude(e.target.value)} placeholder="40.7128" type="number" step="any" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Longitude</label>
                <Input value={longitude} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLongitude(e.target.value)} placeholder="-74.0060" type="number" step="any" required />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sensor Types</label>
              <div className="flex flex-wrap gap-2">
                {sensorOptions.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleSensor(type)}
                    className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                      selectedSensors.includes(type)
                        ? 'border-emerald-600 bg-emerald-900/30 text-emerald-400'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    {capitalize(type)}
                  </button>
                ))}
              </div>
            </div>
            {formError && <p className="text-sm text-red-400">{formError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createStation.isPending}>
                {createStation.isPending ? 'Creating...' : 'Create Station'}
              </Button>
            </DialogFooter>
          </form>
        </Dialog>
      )}
    </div>
  )
}
