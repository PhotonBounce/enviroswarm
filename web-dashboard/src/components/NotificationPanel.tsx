import React, { useState, useEffect, useRef } from 'react'
import { Bell, Check, X, AlertTriangle, Info, CheckCircle, Trash2 } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

export interface NotificationItem {
  id: string
  title: string
  message: string
  type: 'alert' | 'info' | 'success' | 'warning'
  read: boolean
  timestamp: string
  link?: string
}

interface NotificationPanelProps {
  notifications: NotificationItem[]
  onMarkRead?: (id: string) => void
  onMarkUnread?: (id: string) => void
  onDismiss?: (id: string) => void
  onClearAll?: () => void
}

const typeIcons = {
  alert: AlertTriangle,
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
}

const typeColors = {
  alert: 'text-red-400 bg-red-400/10',
  info: 'text-blue-400 bg-blue-400/10',
  success: 'text-emerald-400 bg-emerald-400/10',
  warning: 'text-amber-400 bg-amber-400/10',
}

export default function NotificationPanel({
  notifications,
  onMarkRead,
  onMarkUnread,
  onDismiss,
  onClearAll,
}: NotificationPanelProps) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const unreadCount = notifications.filter((n) => !n.read).length

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const sorted = [...notifications].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  return (
    <div className="relative" ref={panelRef}>
      <button
        className="relative rounded-lg p-2 hover:bg-muted transition-colors"
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 rounded-xl border border-border bg-card shadow-lg z-50 max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-[10px]">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {notifications.length > 0 && (
                <button
                  onClick={onClearAll}
                  className="rounded p-1.5 hover:bg-muted text-muted-foreground"
                  aria-label="Clear all notifications"
                  title="Clear all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded p-1.5 hover:bg-muted text-muted-foreground"
                aria-label="Close notifications"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {sorted.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {sorted.map((n) => {
                  const Icon = typeIcons[n.type]
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        'flex gap-3 px-4 py-3 transition-colors hover:bg-muted/50',
                        !n.read && 'bg-emerald-900/10'
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                          typeColors[n.type]
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn('text-sm', !n.read && 'font-medium')}>
                            {n.title}
                          </p>
                          <div className="flex items-center gap-1 shrink-0">
                            {n.read ? (
                              <button
                                onClick={() => onMarkUnread?.(n.id)}
                                className="rounded p-1 hover:bg-muted text-muted-foreground"
                                title="Mark unread"
                                aria-label={`Mark ${n.title} unread`}
                              >
                                <Check className="h-3 w-3 text-emerald-400" />
                              </button>
                            ) : (
                              <button
                                onClick={() => onMarkRead?.(n.id)}
                                className="rounded p-1 hover:bg-muted text-muted-foreground"
                                title="Mark read"
                                aria-label={`Mark ${n.title} read`}
                              >
                                <Check className="h-3 w-3" />
                              </button>
                            )}
                            <button
                              onClick={() => onDismiss?.(n.id)}
                              className="rounded p-1 hover:bg-muted text-muted-foreground"
                              title="Dismiss"
                              aria-label={`Dismiss ${n.title}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatDate(n.timestamp)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {sorted.length > 0 && (
            <div className="border-t border-border px-4 py-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  sorted.filter((n) => !n.read).forEach((n) => onMarkRead?.(n.id))
                }}
              >
                Mark all as read
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
