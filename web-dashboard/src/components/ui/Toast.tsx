import React, { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import type { ToastItem } from '@/hooks/useToast'
import { cn } from '@/lib/utils'

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const styles = {
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  error: 'border-red-500/30 bg-red-500/10 text-red-400',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  info: 'border-sky-500/30 bg-sky-500/10 text-sky-400',
}

interface ToastProps {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}

function ToastItemComponent({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const [progress, setProgress] = useState(100)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(Date.now())
  const Icon = icons[toast.type]

  useEffect(() => {
    const tick = 30
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      const remaining = Math.max(0, 100 - (elapsed / toast.duration) * 100)
      setProgress(remaining)
      if (remaining <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }, tick)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [toast.duration])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'relative flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-md',
        'bg-card/90 min-w-[280px] max-w-[400px]',
        styles[toast.type]
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="text-sm font-medium text-foreground flex-1">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 rounded p-1 hover:bg-white/10 transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 rounded-b-lg overflow-hidden">
        <motion.div
          className="h-full bg-current opacity-50"
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.03 }}
        />
      </div>
    </motion.div>
  )
}

export default function ToastContainer({ toasts, onDismiss }: ToastProps) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItemComponent toast={toast} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
