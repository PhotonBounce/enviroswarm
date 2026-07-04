import React, { useState, useRef, useEffect } from 'react'
import { Download, FileSpreadsheet, FileText, X, Calendar, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { cn, formatDate } from '@/lib/utils'
import type { SensorReading } from '@/types'

interface ExportWidgetProps {
  readings: SensorReading[]
  stationName?: string
  className?: string
}

type ExportFormat = 'csv' | 'excel' | 'pdf'

export default function ExportWidget({ readings, stationName, className }: ExportWidgetProps) {
  const [open, setOpen] = useState(false)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [exporting, setExporting] = useState(false)
  const widgetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const filteredReadings = readings.filter((r) => {
    const ts = new Date(r.timestamp)
    if (start && ts < new Date(start)) return false
    if (end && ts > new Date(end)) return false
    return true
  })

  const handleExport = async () => {
    if (!filteredReadings.length) return
    setExporting(true)

    const filename = `${stationName ? stationName.replace(/\s+/g, '_') + '_' : ''}sensor_data_${new Date().toISOString().split('T')[0]}`

    if (format === 'csv') {
      const headers = ['timestamp', 'station_id', 'sensor_type', 'value', 'unit']
      const rows = filteredReadings.map((r) => [r.timestamp, r.station_id, r.sensor_type, String(r.value), r.unit])
      const escapeCsv = (value: string) => {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }
      const csv = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.map((v) => escapeCsv(String(v))).join(','))].join('\n')
      downloadBlob(new Blob([csv], { type: 'text/csv' }), `${filename}.csv`)
    } else if (format === 'excel') {
      // Simple HTML table as .xls for basic Excel compatibility
      const headers = ['Timestamp', 'Station ID', 'Sensor Type', 'Value', 'Unit']
      const rows = filteredReadings.map((r) => `<tr><td>${r.timestamp}</td><td>${r.station_id}</td><td>${r.sensor_type}</td><td>${r.value}</td><td>${r.unit}</td></tr>`)
      const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></body></html>`
      downloadBlob(new Blob([html], { type: 'application/vnd.ms-excel' }), `${filename}.xls`)
    } else if (format === 'pdf') {
      // Generate a simple printable HTML page for PDF
      const headers = ['Timestamp', 'Station ID', 'Sensor Type', 'Value', 'Unit']
      const rows = filteredReadings.map((r) => `<tr><td>${formatDate(r.timestamp)}</td><td>${r.station_id}</td><td>${r.sensor_type}</td><td>${r.value}</td><td>${r.unit}</td></tr>`)
      const printHtml = `
        <html><head><title>${filename}</title>
        <style>body{font-family:system-ui,sans-serif;padding:2rem}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#f3f4f6}</style>
        </head><body>
        <h1>${stationName ?? 'Sensor Data'} Export</h1>
        <p>Exported on ${new Date().toLocaleString()}</p>
        <table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>
        </body></html>`
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(printHtml)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => {
          printWindow.print()
          printWindow.close()
        }, 250)
      }
    }

    setTimeout(() => {
      setExporting(false)
      setOpen(false)
    }, 800)
  }

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className={cn('relative', className)} ref={widgetRef}>
      <Button
        onClick={() => setOpen(!open)}
        variant="outline"
        size="sm"
        className="gap-1.5"
      >
        <Download className="h-4 w-4" />
        Export
        <ChevronDown className="h-3 w-3" />
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-card shadow-lg z-50 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Quick Export</h4>
            <button onClick={() => setOpen(false)} className="rounded p-1 hover:bg-muted">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium">Format</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'csv' as const, label: 'CSV', icon: FileText },
                { value: 'excel' as const, label: 'Excel', icon: FileSpreadsheet },
                { value: 'pdf' as const, label: 'PDF', icon: FileText },
              ]).map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFormat(f.value)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border border-border p-2 transition-colors text-xs',
                    format === f.value ? 'bg-emerald-900/20 border-emerald-600/40 text-emerald-400' : 'hover:bg-muted text-muted-foreground'
                  )}
                >
                  <f.icon className="h-4 w-4" />
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Date Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">From</label>
                <Input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">To</label>
                <Input
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            {filteredReadings.length} record{filteredReadings.length !== 1 ? 's' : ''} selected
          </div>

          <Button
            onClick={handleExport}
            disabled={!filteredReadings.length || exporting}
            size="sm"
            className="w-full"
          >
            {exporting ? 'Exporting...' : `Export ${format.toUpperCase()}`}
          </Button>
        </div>
      )}
    </div>
  )
}
