import { Radio, BarChart3, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useStations } from '@/hooks/useApi'
import { capitalize } from '@/lib/utils'
import type { SensorStation } from '@/types'

const stats = [
  { label: 'Stations', value: '2', icon: Radio, change: '+1 this month' },
  { label: 'Readings Today', value: '1,248', icon: BarChart3, change: '+12% from yesterday' },
  { label: 'Active Sensors', value: '8', icon: Zap, change: 'All operational' },
]

const recentActivity = [
  { title: 'Station "Park Air" uploaded 45 readings', time: '2 minutes ago', type: 'data' },
  { title: 'New station "Riverside Monitor" created', time: '1 hour ago', type: 'station' },
  { title: 'Temperature threshold alert triggered', time: '3 hours ago', type: 'alert' },
  { title: 'Daily summary report generated', time: '5 hours ago', type: 'report' },
]

export default function Dashboard() {
  const { data: stations } = useStations()

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
            {stations && stations.length > 0 ? (
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
            <div className="space-y-4">
              {recentActivity.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
