import React, { useState } from 'react'
import {
  FileText,
  Download,
  Calendar,
  FileSpreadsheet,
  File as FilePdf,
  Clock,
  Check,
  AlertTriangle,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { useStations } from '@/hooks/useApi'
import { cn, formatDate } from '@/lib/utils'

export type ReportFormat = 'pdf' | 'csv' | 'excel'
export type ReportStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface Report {
  id: string
  name: string
  stationId: string
  stationName: string
  startDate: string
  endDate: string
  format: ReportFormat
  status: ReportStatus
  createdAt: string
  completedAt?: string
  downloadUrl?: string
}

const demoReports: Report[] = [
  {
    id: 'rpt-1',
    name: 'Central Park July Report',
    stationId: '1',
    stationName: 'Central Park Air Monitor',
    startDate: '2026-07-01',
    endDate: '2026-07-31',
    format: 'pdf',
    status: 'completed',
    createdAt: '2026-07-15T10:00:00Z',
    completedAt: '2026-07-15T10:02:00Z',
  },
  {
    id: 'rpt-2',
    name: 'Riverside Water Q2',
    stationId: '2',
    stationName: 'Riverside Water Station',
    startDate: '2026-04-01',
    endDate: '2026-06-30',
    format: 'excel',
    status: 'completed',
    createdAt: '2026-07-01T08:00:00Z',
    completedAt: '2026-07-01T08:01:00Z',
  },
  {
    id: 'rpt-3',
    name: 'Downtown Noise Summary',
    stationId: '3',
    stationName: 'Downtown Noise Logger',
    startDate: '2026-07-01',
    endDate: '2026-07-15',
    format: 'csv',
    status: 'processing',
    createdAt: '2026-07-20T14:00:00Z',
  },
]

const statusConfig: Record<ReportStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Clock },
  processing: { label: 'Processing', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Clock },
  completed: { label: 'Completed', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: Check },
  failed: { label: 'Failed', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: AlertTriangle },
}

const formatIcons: Record<ReportFormat, React.ElementType> = {
  pdf: FilePdf,
  csv: FileText,
  excel: FileSpreadsheet,
}

export default function Reports() {
  const { data: stations } = useStations()
  const [reports, setReports] = useState<Report[]>(demoReports)

  // Form state
  const [name, setName] = useState('')
  const [stationId, setStationId] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [format, setFormat] = useState<ReportFormat>('pdf')
  const [generating, setGenerating] = useState(false)
  const [page, setPage] = useState(1)
  const perPage = 10

  const stationNameMap = new Map((stations?.map((s) => [s.id, s.name]) ?? []))

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !stationId || !start || !end) return

    setGenerating(true)

    // Simulate generation
    const newReport: Report = {
      id: `rpt-${Date.now()}`,
      name,
      stationId,
      stationName: stationNameMap.get(stationId) || stationId,
      startDate: start,
      endDate: end,
      format,
      status: 'processing',
      createdAt: new Date().toISOString(),
    }

    setReports((prev) => [newReport, ...prev])

    // Simulate completion
    setTimeout(() => {
      setReports((prev) =>
        prev.map((r) =>
          r.id === newReport.id
            ? { ...r, status: 'completed' as const, completedAt: new Date().toISOString() }
            : r
        )
      )
      setGenerating(false)
      setName('')
      setStationId('')
      setStart('')
      setEnd('')
    }, 2000)
  }

  const handleDownload = (report: Report) => {
    // Simulate download
    const blob = new Blob([`Report: ${report.name}\nStation: ${report.stationName}\nPeriod: ${report.startDate} to ${report.endDate}\nFormat: ${report.format.toUpperCase()}\n\n[Report content would be here]`], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${report.name.replace(/\s+/g, '_')}.${report.format === 'excel' ? 'xls' : report.format}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const totalPages = Math.ceil(reports.length / perPage)
  const pagedReports = reports.slice((page - 1) * perPage, page * perPage)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Generate and download sensor reports</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Report Generator Form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Generate Report
            </CardTitle>
            <CardDescription>Create a new report for a station</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Report Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. July Air Quality Report"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Station</label>
                <Select
                  value={stationId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStationId(e.target.value)}
                  required
                >
                  <option value="">Select a station</option>
                  {stations?.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Input
                    type="date"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Input
                    type="date"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Format</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'pdf' as const, label: 'PDF', icon: FilePdf },
                    { value: 'csv' as const, label: 'CSV', icon: FileText },
                    { value: 'excel' as const, label: 'Excel', icon: FileSpreadsheet },
                  ]).map((f) => (
                    <button
                      key={f.value}
                      type="button"
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

              <Button type="submit" className="w-full" disabled={generating}>
                {generating ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Report
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Report History */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Report History</CardTitle>
            <CardDescription>{reports.length} report{reports.length !== 1 ? 's' : ''} generated</CardDescription>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>No reports yet</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Station</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedReports.map((report) => {
                      const status = statusConfig[report.status]
                      const FormatIcon = formatIcons[report.format]
                      return (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium text-sm">{report.name}</TableCell>
                          <TableCell className="text-sm">{report.stationName}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {report.startDate} → {report.endDate}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] uppercase gap-1">
                              <FormatIcon className="h-3 w-3" />
                              {report.format}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn('text-[10px] gap-1', status.color)}
                            >
                              <status.icon className="h-3 w-3" />
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {report.status === 'completed' ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownload(report)}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
