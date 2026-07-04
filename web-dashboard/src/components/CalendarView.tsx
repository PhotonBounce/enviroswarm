import React, { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { cn, capitalize, formatDate, formatNumber } from '@/lib/utils'
import type { SensorReading } from '@/types'

interface CalendarViewProps {
  readings: SensorReading[]
  onDayClick?: (date: string, dayReadings: SensorReading[]) => void
}

export default function CalendarView({ readings, onDayClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const daysInMonth = lastDayOfMonth.getDate()
  const startDayOfWeek = firstDayOfMonth.getDay()

  const daysByDate = useMemo(() => {
    const map = new Map<string, SensorReading[]>()
    for (const r of readings) {
      const dateKey = r.timestamp.split('T')[0]
      if (!map.has(dateKey)) map.set(dateKey, [])
      map.get(dateKey)!.push(r)
    }
    return map
  }, [readings])

  const getDataVolume = (dateStr: string) => {
    const dayReadings = daysByDate.get(dateStr) ?? []
    if (dayReadings.length === 0) return 0
    if (dayReadings.length < 5) return 1
    if (dayReadings.length < 15) return 2
    return 3
  }

  const volumeColors = [
    '', // 0
    'bg-emerald-500/20 hover:bg-emerald-500/30', // 1 - low
    'bg-emerald-500/40 hover:bg-emerald-500/50', // 2 - medium
    'bg-emerald-500/70 hover:bg-emerald-500/80 text-white', // 3 - high
  ]

  const monthName = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  const days: { day: number; dateStr: string; volume: number }[] = []
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push({ day: 0, dateStr: '', volume: 0 })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({ day: d, dateStr, volume: getDataVolume(dateStr) })
  }

  const selectedReadings = selectedDay ? (daysByDate.get(selectedDay) ?? []) : []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold min-w-[180px] text-center">{monthName}</h3>
          <Button variant="outline" size="icon" onClick={handleNextMonth} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-emerald-500/20" /> Low</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-emerald-500/40" /> Med</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-emerald-500/70" /> High</span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
            {d}
          </div>
        ))}
        {days.map((day, idx) => (
          <button
            key={idx}
            onClick={() => {
              if (!day.dateStr) return
              setSelectedDay(day.dateStr)
              onDayClick?.(day.dateStr, daysByDate.get(day.dateStr) ?? [])
            }}
            disabled={!day.dateStr}
            className={cn(
              'aspect-square rounded-lg text-sm font-medium transition-colors flex flex-col items-center justify-center gap-0.5',
              day.dateStr ? 'cursor-pointer' : 'cursor-default',
              day.dateStr && volumeColors[day.volume],
              selectedDay === day.dateStr && 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-background',
              !day.dateStr && 'bg-transparent'
            )}
          >
            {day.day > 0 && (
              <>
                <span>{day.day}</span>
                {day.volume > 0 && (
                  <span className="text-[9px] leading-none opacity-70">
                    {(daysByDate.get(day.dateStr) ?? []).length} readings
                  </span>
                )}
              </>
            )}
          </button>
        ))}
      </div>

      {selectedDay && selectedReadings.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Readings for {selectedDay}</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedDay(null)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Unit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedReadings.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{formatDate(r.timestamp)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{capitalize(r.sensor_type)}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">{formatNumber(r.value, 2)}</TableCell>
                    <TableCell className="text-xs">{r.unit}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
