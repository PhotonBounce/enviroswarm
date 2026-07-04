import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  Tag,
  Share2,
  Edit3,
  Eye,
  Save,
  Plus,
  X,
  Trash2,
  BarChart3,
  Clock,
  ChevronRight,
  MoreHorizontal,
  Search,
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { getDemoData } from '@/lib/demoData'
import { formatDate, capitalize, getSensorTypeColor } from '@/lib/utils'
import type { NotebookEntry, PublicDataset } from '@/types'

const demoNotebooks = getDemoData().notebooks
const demoDatasets: PublicDataset[] = getDemoData().publicDatasets as PublicDataset[]

function MarkdownPreview({ content }: { content: string }) {
  // Simple markdown rendering
  const lines = content.split('\n')
  const rendered = lines.map((line, i) => {
    if (line.startsWith('# ')) {
      return <h1 key={i} className="text-xl font-bold mt-4 mb-2">{line.slice(2)}</h1>
    }
    if (line.startsWith('## ')) {
      return <h2 key={i} className="text-lg font-semibold mt-3 mb-1.5">{line.slice(3)}</h2>
    }
    if (line.startsWith('- ')) {
      return <li key={i} className="ml-4 text-sm text-muted-foreground">{line.slice(2)}</li>
    }
    if (line.trim() === '') {
      return <div key={i} className="h-2" />
    }
    return <p key={i} className="text-sm text-muted-foreground leading-relaxed">{line}</p>
  })

  return <div className="prose prose-sm max-w-none">{rendered}</div>
}

function ChartEmbed({ title, datasetId, sensorType }: { title: string; datasetId: string; sensorType: string }) {
  const dataset = demoDatasets.find((d) => d.id === datasetId)
  const color = getSensorTypeColor(sensorType)
  const data: { timestamp: string; value: number; sensor_type: string }[] = dataset?.preview_data.slice(0, 12) || []
  const values = data.map((d: { value: number }) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const bars = data.map((d: { value: number }, i: number) => {
    const height = ((d.value - min) / range) * 100
    return (
      <div
        key={i}
        className="flex-1 rounded-t-sm transition-all hover:opacity-80"
        style={{
          height: `${Math.max(height, 5)}%`,
          backgroundColor: color,
          opacity: 0.6 + (i / data.length) * 0.4,
        }}
        title={`${d.value.toFixed(2)}`}
      />
    )
  })

  return (
    <GlassCard intensity="low" className="p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium">{title}</p>
        <Badge variant="outline" className="text-[10px]" style={{ borderColor: color + '40', color }}>
          {capitalize(sensorType.replace('_', ' '))}
        </Badge>
      </div>
      <div className="h-24 flex items-end gap-1">{bars}</div>
      <p className="text-xs text-muted-foreground mt-2">Source: {dataset?.title || 'Unknown dataset'}</p>
    </GlassCard>
  )
}

export default function Notebook() {
  const [notebooks, setNotebooks] = useState<NotebookEntry[]>(demoNotebooks)
  const [selectedId, setSelectedId] = useState<string | null>(demoNotebooks[0]?.id || null)
  const [isEditing, setIsEditing] = useState(false)
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState<string | null>(null)

  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editTags, setEditTags] = useState('')

  const selected = notebooks.find((n) => n.id === selectedId) || null

  const allTags = useMemo(() => {
    const tags = new Set<string>()
    notebooks.forEach((n) => n.tags.forEach((t) => tags.add(t)))
    return Array.from(tags)
  }, [notebooks])

  const filtered = useMemo(() => {
    return notebooks.filter((n) => {
      const matchesSearch =
        !search ||
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.content.toLowerCase().includes(search.toLowerCase())
      const matchesTag = !tagFilter || n.tags.includes(tagFilter)
      return matchesSearch && matchesTag
    })
  }, [notebooks, search, tagFilter])

  const startEdit = () => {
    if (!selected) return
    setEditTitle(selected.title)
    setEditContent(selected.content)
    setEditTags(selected.tags.join(', '))
    setIsEditing(true)
  }

  const saveEdit = () => {
    if (!selected) return
    const updated: NotebookEntry = {
      ...selected,
      title: editTitle,
      content: editContent,
      tags: editTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      updated_at: new Date().toISOString(),
    }
    setNotebooks((prev) => prev.map((n) => (n.id === selected.id ? updated : n)))
    setIsEditing(false)
  }

  const createNew = () => {
    const newNotebook: NotebookEntry = {
      id: `nb${Date.now()}`,
      title: 'New Research Note',
      content: '# New Research Note\n\nStart writing your research notes here...',
      tags: ['draft'],
      author: 'Demo User',
      author_id: 'demo-id',
      charts: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      shared_with: [],
    }
    setNotebooks((prev) => [newNotebook, ...prev])
    setSelectedId(newNotebook.id)
    setIsEditing(true)
    setEditTitle(newNotebook.title)
    setEditContent(newNotebook.content)
    setEditTags('')
  }

  const deleteNotebook = (id: string) => {
    setNotebooks((prev) => prev.filter((n) => n.id !== id))
    if (selectedId === id) {
      setSelectedId(null)
      setIsEditing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-teal-400" />
            Research Notebook
          </h1>
          <p className="text-muted-foreground">Markdown research notes with embedded data charts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={createNew}>
            <Plus className="h-4 w-4 mr-1.5" />
            New Note
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 h-[calc(100vh-220px)] min-h-[500px]">
        {/* Sidebar */}
        <GlassCard intensity="low" className="flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-8 text-sm"
              />
            </div>
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                      tagFilter === tag
                        ? 'bg-teal-500/20 border-teal-500/30 text-teal-400'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filtered.map((notebook) => (
              <button
                key={notebook.id}
                onClick={() => {
                  setSelectedId(notebook.id)
                  setIsEditing(false)
                }}
                className={`w-full text-left rounded-lg p-2.5 transition-colors ${
                  selectedId === notebook.id
                    ? 'bg-teal-500/10 border border-teal-500/20'
                    : 'hover:bg-muted border border-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-medium line-clamp-1 ${selectedId === notebook.id ? 'text-teal-400' : ''}`}>
                    {notebook.title}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteNotebook(notebook.id)
                    }}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {notebook.content.slice(0, 80)}...
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex flex-wrap gap-1">
                    {notebook.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {formatDate(notebook.updated_at)}
                  </span>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="text-center text-muted-foreground py-8 text-sm">No notes found</div>
            )}
          </div>
        </GlassCard>

        {/* Main Editor/Preview */}
        <div className="md:col-span-2 flex flex-col h-full overflow-hidden">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={selected.id + (isEditing ? '-edit' : '-view')}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex flex-col h-full"
              >
                <GlassCard intensity="medium" className="flex-1 flex flex-col overflow-hidden">
                  {/* Note Header */}
                  <div className="flex items-center justify-between p-4 border-b border-border">
                    {isEditing ? (
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="text-lg font-bold h-10"
                        placeholder="Note title..."
                      />
                    ) : (
                      <div className="min-w-0">
                        <h2 className="text-lg font-bold truncate">{selected.title}</h2>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{selected.author}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Updated {formatDate(selected.updated_at)}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      {isEditing ? (
                        <>
                          <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                            <X className="h-4 w-4 mr-1.5" />
                            Cancel
                          </Button>
                          <Button size="sm" onClick={saveEdit}>
                            <Save className="h-4 w-4 mr-1.5" />
                            Save
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="outline" size="sm" onClick={startEdit}>
                            <Edit3 className="h-4 w-4 mr-1.5" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm">
                            <Share2 className="h-4 w-4 mr-1.5" />
                            Share
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="px-4 py-2 border-b border-border flex flex-wrap gap-1.5">
                    {isEditing ? (
                      <div className="flex items-center gap-2 w-full">
                        <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          value={editTags}
                          onChange={(e) => setEditTags(e.target.value)}
                          placeholder="Tags separated by commas"
                          className="h-7 text-xs flex-1"
                        />
                      </div>
                    ) : (
                      selected.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px]">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))
                    )}
                  </div>

                  {/* Content Area */}
                  <div className="flex-1 overflow-y-auto p-4">
                    {isEditing ? (
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full h-full min-h-[300px] bg-transparent resize-none focus:outline-none text-sm font-mono leading-relaxed"
                        placeholder="Write markdown content here..."
                      />
                    ) : (
                      <div className="space-y-4">
                        <MarkdownPreview content={selected.content} />

                        {selected.charts.length > 0 && (
                          <div className="mt-6">
                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                              <BarChart3 className="h-4 w-4 text-teal-400" />
                              Embedded Charts
                            </h3>
                            <div className="grid gap-3 md:grid-cols-2">
                              {selected.charts.map((chart, idx) => (
                                <ChartEmbed
                                  key={idx}
                                  title={chart.title}
                                  datasetId={chart.dataset_id}
                                  sensorType={chart.sensor_type}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4" />
                  <p className="text-lg font-medium">Select a note or create a new one</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
