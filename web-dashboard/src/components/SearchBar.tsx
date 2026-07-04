import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Search, X, Command, ChevronRight, Radio, BarChart3, AlertTriangle, FileText, User } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { cn, capitalize } from '@/lib/utils'
import { useStations } from '@/hooks/useApi'
import type { SensorStation, SensorReading, Alert } from '@/types'

interface SearchResult {
  id: string
  type: 'station' | 'reading' | 'alert' | 'page'
  title: string
  subtitle: string
  icon: React.ElementType
  action: () => void
}

interface SearchBarProps {
  onNavigate?: (path: string) => void
  onStationSelect?: (id: string) => void
  readings?: SensorReading[]
  alerts?: Alert[]
}

export default function SearchBar({ onNavigate, onStationSelect, readings = [], alerts = [] }: SearchBarProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { data: stations } = useStations()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []

    const items: SearchResult[] = []

    // Pages
    const pages = [
      { path: '/', label: 'Dashboard', icon: BarChart3 },
      { path: '/stations', label: 'Stations', icon: Radio },
      { path: '/data', label: 'Data Explorer', icon: BarChart3 },
      { path: '/reports', label: 'Reports', icon: FileText },
      { path: '/profile', label: 'Profile', icon: User },
    ]
    pages.forEach((p) => {
      if (p.label.toLowerCase().includes(q)) {
        items.push({
          id: `page-${p.path}`,
          type: 'page',
          title: p.label,
          subtitle: 'Page',
          icon: p.icon,
          action: () => {
            onNavigate?.(p.path)
            setOpen(false)
          },
        })
      }
    })

    // Stations
    stations?.forEach((s: SensorStation) => {
      if (s.name.toLowerCase().includes(q) || s.sensor_types.some((t) => t.toLowerCase().includes(q))) {
        items.push({
          id: `station-${s.id}`,
          type: 'station',
          title: s.name,
          subtitle: `${capitalize(s.status)} · ${s.sensor_types.map(capitalize).join(', ')}`,
          icon: Radio,
          action: () => {
            onStationSelect?.(s.id)
            onNavigate?.(`/stations`)
            setOpen(false)
          },
        })
      }
    })

    // Readings
    readings.forEach((r) => {
      if (r.sensor_type.toLowerCase().includes(q) || String(r.value).includes(q)) {
        items.push({
          id: `reading-${r.id}`,
          type: 'reading',
          title: `${capitalize(r.sensor_type)}: ${r.value} ${r.unit}`,
          subtitle: new Date(r.timestamp).toLocaleString(),
          icon: BarChart3,
          action: () => {
            onNavigate?.('/data')
            setOpen(false)
          },
        })
      }
    })

    // Alerts
    alerts.forEach((a) => {
      if (a.message.toLowerCase().includes(q) || a.sensor_type.toLowerCase().includes(q)) {
        items.push({
          id: `alert-${a.id}`,
          type: 'alert',
          title: a.message,
          subtitle: `${capitalize(a.sensor_type)} alert · ${a.condition} ${a.threshold}`,
          icon: AlertTriangle,
          action: () => {
            onNavigate?.('/stations')
            setOpen(false)
          },
        })
      }
    })

    return items.slice(0, 12)
  }, [query, stations, readings, alerts, onNavigate, onStationSelect])

  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    setActiveIndex(0)
  }, [results.length])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => (i + 1) % results.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => (i - 1 + results.length) % results.length)
      } else if (e.key === 'Enter' && results[activeIndex]) {
        e.preventDefault()
        results[activeIndex].action()
      }
    },
    [results, activeIndex]
  )

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors w-48 md:w-64"
        aria-label="Open search"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="truncate">Search...</span>
        <kbd className="ml-auto hidden md:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium">
          <Command className="h-3 w-3" />
          <span>K</span>
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-xl rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Search className="h-5 w-5 text-muted-foreground shrink-0" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search stations, readings, alerts, pages..."
                className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-0 text-base"
              />
              <button
                onClick={() => setOpen(false)}
                className="rounded p-1 hover:bg-muted text-muted-foreground shrink-0"
                aria-label="Close search"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto">
              {query.trim() === '' ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>Type to search across stations, readings, alerts, and pages</p>
                  <div className="mt-3 flex justify-center gap-2 text-xs">
                    <span className="rounded bg-muted px-2 py-1">↑↓ Navigate</span>
                    <span className="rounded bg-muted px-2 py-1">↵ Select</span>
                    <span className="rounded bg-muted px-2 py-1">Esc Close</span>
                  </div>
                </div>
              ) : results.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  <p>No results found for &quot;{query}&quot;</p>
                </div>
              ) : (
                <div className="py-2">
                  {results.map((result, index) => (
                    <button
                      key={result.id}
                      onClick={result.action}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        index === activeIndex && 'bg-emerald-900/20'
                      )}
                    >
                      <result.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{result.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground flex items-center gap-3">
              <span>{results.length} results</span>
              <span className="ml-auto flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted px-1 font-mono">↑↓</kbd> navigate
                <kbd className="rounded border border-border bg-muted px-1 font-mono ml-1">↵</kbd> select
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
