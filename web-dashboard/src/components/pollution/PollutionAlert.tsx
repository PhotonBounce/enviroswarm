import { motion } from 'framer-motion'
import { AlertTriangle, X, MapPin, Clock } from 'lucide-react'
import { getAQIColor } from '@/lib/demoData'
import type { PollutionAlert } from '@/lib/demoData'
import { cn } from '@/lib/utils'

interface PollutionAlertProps {
  alert: PollutionAlert
  onDismiss?: (id: string) => void
}

const severityConfig = {
  low: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-500', label: 'Low' },
  moderate: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-600', label: 'Moderate' },
  high: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-500', label: 'High' },
  critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-500', label: 'Critical' },
}

const typeConfig = {
  air: { color: '#22c55e', label: 'Air' },
  noise: { color: '#8b5cf6', label: 'Noise' },
  light: { color: '#eab308', label: 'Light' },
  water: { color: '#06b6d4', label: 'Water' },
  radiation: { color: '#ef4444', label: 'Radiation' },
  thermal: { color: '#f97316', label: 'Thermal' },
}

export default function PollutionAlertCard({ alert, onDismiss }: PollutionAlertProps) {
  const severity = severityConfig[alert.severity]
  const type = typeConfig[alert.type]
  const timeAgo = new Date(alert.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  return (
    <motion.div
      className={cn(
        'relative rounded-lg border p-3 transition-all',
        severity.border,
        severity.bg
      )}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <div
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: type.color }}
          >
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('text-xs font-semibold', severity.text)}>
                {severity.label}
              </span>
              <span
                className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                style={{ backgroundColor: type.color }}
              >
                {type.label}
              </span>
              {alert.resolved && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                  Resolved
                </span>
              )}
            </div>
            <p className="mt-1 text-sm leading-snug">{alert.message}</p>
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {alert.location}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeAgo}
              </span>
            </div>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={() => onDismiss(alert.id)}
            className="shrink-0 rounded p-1 hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
    </motion.div>
  )
}

export { severityConfig, typeConfig }
