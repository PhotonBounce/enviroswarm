import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { getAQIColor, getAQILabel, getAQIClass } from '@/lib/demoData'
import { cn } from '@/lib/utils'

interface AQIGaugeProps {
  aqi: number
  size?: number
  animated?: boolean
}

export default function AQIGauge({ aqi, size = 160, animated = true }: AQIGaugeProps) {
  const [displayAQI, setDisplayAQI] = useState(0)
  const color = getAQIColor(aqi)
  const label = getAQILabel(aqi)
  const aqiClass = getAQIClass(aqi)

  const strokeWidth = 12
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(aqi / 300, 1)
  const dashOffset = circumference * (1 - progress)

  useEffect(() => {
    if (!animated) {
      setDisplayAQI(aqi)
      return
    }
    const duration = 1200
    const steps = 60
    const increment = aqi / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= aqi) {
        setDisplayAQI(aqi)
        clearInterval(timer)
      } else {
        setDisplayAQI(Math.round(current))
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [aqi, animated])

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/30"
          />
          {/* Progress arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className={cn('text-3xl font-bold', aqiClass)}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {displayAQI}
          </motion.span>
          <span className="text-xs text-muted-foreground uppercase tracking-wider mt-1">AQI</span>
        </div>
      </div>
      <motion.div
        className="mt-3 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <p className={cn('text-sm font-semibold', aqiClass)}>{label}</p>
      </motion.div>
    </div>
  )
}
