import { motion } from 'framer-motion'
import { Wind, AlertTriangle, Heart, Shield } from 'lucide-react'
import { getAQIClass, getHealthAdvice, getAQIColor } from '@/lib/demoData'
import { cn } from '@/lib/utils'

interface HealthAdvisoryProps {
  aqi: number
}

export default function HealthAdvisory({ aqi }: HealthAdvisoryProps) {
  const aqiClass = getAQIClass(aqi)
  const advice = getHealthAdvice(aqi)
  const color = getAQIColor(aqi)

  const getIcon = () => {
    if (aqi <= 50) return <Heart className="h-5 w-5" />
    if (aqi <= 100) return <Wind className="h-5 w-5" />
    if (aqi <= 150) return <AlertTriangle className="h-5 w-5" />
    return <Shield className="h-5 w-5" />
  }

  const getRiskLevel = () => {
    if (aqi <= 50) return 'Low Risk'
    if (aqi <= 100) return 'Moderate Risk'
    if (aqi <= 150) return 'High Risk for Sensitive Groups'
    if (aqi <= 200) return 'High Risk'
    if (aqi <= 300) return 'Very High Risk'
    return 'Emergency Risk'
  }

  return (
    <motion.div
      className={cn(
        'rounded-xl border-2 p-4 transition-all',
        aqi <= 50 && 'border-emerald-500/30 bg-emerald-500/5',
        aqi > 50 && aqi <= 100 && 'border-yellow-500/30 bg-yellow-500/5',
        aqi > 100 && aqi <= 150 && 'border-orange-500/30 bg-orange-500/5',
        aqi > 150 && aqi <= 200 && 'border-red-500/30 bg-red-500/5',
        aqi > 200 && aqi <= 300 && 'border-purple-500/30 bg-purple-500/5',
        aqi > 300 && 'border-red-900/30 bg-red-900/5'
      )}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: color }}
        >
          {getIcon()}
        </div>
        <div>
          <p className={cn('text-sm font-semibold', aqiClass)}>{getRiskLevel()}</p>
          <p className="text-xs text-muted-foreground">AQI: {aqi}</p>
        </div>
      </div>
      <p className="text-sm leading-relaxed">{advice}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {aqi > 100 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-500">
            <AlertTriangle className="h-3 w-3" />
            Avoid outdoor exercise
          </span>
        )}
        {aqi > 150 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-500">
            <Shield className="h-3 w-3" />
            Wear N95 mask
          </span>
        )}
        {aqi <= 50 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-500">
            <Heart className="h-3 w-3" />
            Safe to exercise outdoors
          </span>
        )}
        {aqi > 50 && aqi <= 100 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2.5 py-1 text-xs font-medium text-yellow-600">
            <Wind className="h-3 w-3" />
            Sensitive groups: limit exertion
          </span>
        )}
      </div>
    </motion.div>
  )
}
