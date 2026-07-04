import { useState, useCallback, useRef, useEffect } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  message: string
  type: ToastType
  duration: number
}

let toastIdCounter = 0

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<string, number>>(new Map())

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timersRef.current.get(id)
    if (timer) {
      window.clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  const addToast = useCallback(
    (message: string, type: ToastType = 'info', duration = 4000) => {
      const id = `toast-${++toastIdCounter}-${Date.now()}`
      setToasts((prev) => [...prev, { id, message, type, duration }])
      const timer = window.setTimeout(() => dismiss(id), duration)
      timersRef.current.set(id, timer)
      return id
    },
    [dismiss]
  )

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer))
      timersRef.current.clear()
    }
  }, [])

  return { toasts, addToast, dismiss }
}
