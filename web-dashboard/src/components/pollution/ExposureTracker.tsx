import { motion } from 'framer-motion'
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { demoPollutantBreakdown } from '@/lib/demoData'
import { getAQIClass } from '@/lib/demoData'
import { cn } from '@/lib/utils'

interface ExposureTrackerProps {
  todayAQI?: number
}

export default function ExposureTracker({ todayAQI = 58 }: ExposureTrackerProps) {
  const whoGuideline = 25 // µg/m³ for PM2.5 daily average
  const pm25 = demoPollutantBreakdown.pm25
  const percentage = Math.round((pm25 / whoGuideline) * 100)
  const exceeded = pm25 > whoGuideline

  const pollutantExposures = [
    { name: 'PM2.5', value: pm25, whoLimit: 25, unit: 'µg/m³' },
    { name: 'PM10', value: demoPollutantBreakdown.pm10, whoLimit: 50, unit: 'µg/m³' },
    { name: 'NO₂', value: demoPollutantBreakdown.no2, whoLimit: 25, unit: 'µg/m³' },
    { name: 'O₃', value: demoPollutantBreakdown.o3, whoLimit: 100, unit: 'µg/m³' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Daily Exposure</span>
        </div>
        <span className={cn('text-xs font-semibold', getAQIClass(todayAQI))}>
          AQI {todayAQI}
        </span>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">vs WHO guideline</span>
          <span className={cn(
            'text-xs font-semibold flex items-center gap-1',
            exceeded ? 'text-red-500' : 'text-emerald-500'
          )}>
            {exceeded ? (
              <>
                <TrendingUp className="h-3 w-3" />
                {percentage}% over limit
              </>
            ) : (
              <>
                <TrendingDown className="h-3 w-3" />
                Within limits
              </>
            )}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <motion.div
            className={cn(
              'h-full rounded-full',
              exceeded ? 'bg-red-500' : 'bg-emerald-500'
            )}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(percentage, 100)}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {pollutantExposures.map((pollutant, index) => {
          const pct = Math.round((pollutant.value / pollutant.whoLimit) * 100)
          const over = pollutant.value > pollutant.whoLimit
          return (
            <motion.div
              key={pollutant.name}
              className="flex items-center justify-between rounded-md border border-border p-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium w-10">{pollutant.name}</span>
                <span className="text-xs text-muted-foreground">
                  {pollutant.value} / {pollutant.whoLimit} {pollutant.unit}
                </span>
              </div>
              <span className={cn(
                'text-xs font-semibold',
                over ? 'text-red-500' : 'text-emerald-500'
              )}>
                {pct}%
              </span>
            </motion.div>
          )
        })}
      </div>

      <div className="rounded-md bg-primary/5 p-2 text-center">
        <p className="text-xs text-muted-foreground">
          {exceeded
            ? 'You have exceeded the WHO recommended daily exposure limit for some pollutants.'
            : 'Your exposure today is within WHO recommended guidelines.'}
        </p>
      </div>
    </div>
  )
}
