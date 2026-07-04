import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Star,
  GitFork,
  Download,
  Quote,
  MessageSquare,
  Share2,
  FileText,
  Globe,
  Calendar,
  User,
  Database,
  Radio,
  ThumbsUp,
  ChevronDown,
  ArrowLeft,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { GlassCard } from '@/components/ui/GlassCard'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { getDemoData } from '@/lib/demoData'
import { getSensorTypeColor, capitalize, formatDate, formatNumber } from '@/lib/utils'
import type { DatasetComment, PublicDataset } from '@/types'

const demoDatasets: PublicDataset[] = getDemoData().publicDatasets as PublicDataset[]
const demoComments: DatasetComment[] = getDemoData().comments

function MiniSparkline({ data, color }: { data: { timestamp: string; value: number }[]; color: string }) {
  const values = data.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const areaPoints =
    `0,100 ` +
    values.map((v, i) => `${(i / (values.length - 1)) * 100},${100 - ((v - min) / range) * 100}`).join(' ') +
    ` 100,100`

  const linePoints = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${100 - ((v - min) / range) * 100}`)
    .join(' ')

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-32 w-full">
      <polygon fill={color + '20'} points={areaPoints} />
      <polyline fill="none" stroke={color} strokeWidth="2" points={linePoints} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <GlassCard intensity="low" className="p-3 flex items-center gap-3">
      <div className="h-9 w-9 rounded-lg bg-teal-500/10 flex items-center justify-center">
        <Icon className="h-4 w-4 text-teal-400" />
      </div>
      <div>
        <p className="text-lg font-bold leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </GlassCard>
  )
}

export default function DatasetDetail() {
  const { id } = useParams<{ id: string }>()
  const [starred, setStarred] = useState(false)
  const [forked, setForked] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [commentText, setCommentText] = useState('')
  const [comments, setComments] = useState<DatasetComment[]>(demoComments)

  const dataset = demoDatasets.find((d) => d.id === id) || demoDatasets[0]
  const primaryColor = getSensorTypeColor(dataset.sensor_types[0])

  const handleFork = () => {
    setForked(true)
    // In real app: call API to fork
  }

  const handleAddComment = () => {
    if (!commentText.trim()) return
    const newComment: DatasetComment = {
      id: `c${Date.now()}`,
      author: 'Demo User',
      author_id: 'demo-id',
      content: commentText,
      created_at: new Date().toISOString(),
      likes: 0,
    }
    setComments((prev) => [newComment, ...prev])
    setCommentText('')
  }

  const citationFormats = {
    apa: `${dataset.creator} (${new Date(dataset.created_at).getFullYear()}). ${dataset.title}. ${dataset.organization}. Retrieved from https://enviroswarm.app/dataset/${dataset.id}`,
    bibtex: `@dataset{${dataset.id},
  author = {${dataset.creator}},
  title = {${dataset.title}},
  organization = {${dataset.organization}},
  year = {${new Date(dataset.created_at).getFullYear()}},
  url = {https://enviroswarm.app/dataset/${dataset.id}}
}`,
    ris: `TY  - DATA
AU  - ${dataset.creator}
TI  - ${dataset.title}
PY  - ${new Date(dataset.created_at).getFullYear()}
PB  - ${dataset.organization}
UR  - https://enviroswarm.app/dataset/${dataset.id}
ER  -`,
  }

  const [copiedFormat, setCopiedFormat] = useState<string | null>(null)
  const copyToClipboard = (format: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedFormat(format)
    setTimeout(() => setCopiedFormat(null), 2000)
  }

  return (
    <div className="space-y-6">
      <Link
        to="/portal"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-teal-400 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-1.5" />
        Back to Portal
      </Link>

      {/* Dataset Header */}
      <GlassCard intensity="high" className="p-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">{dataset.title}</h1>
              <Badge variant="outline" className="text-[10px] border-teal-500/30 text-teal-400">
                {dataset.license}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{dataset.description}</p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {dataset.creator}
              </span>
              <span className="flex items-center gap-1">
                <Globe className="h-3.5 w-3.5" />
                {dataset.organization}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Created {formatDate(dataset.created_at)}
              </span>
              <span className="flex items-center gap-1">
                <Database className="h-3.5 w-3.5" />
                {formatNumber(dataset.reading_count, 0)} readings
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setStarred(!starred)}>
              <Star className={`h-4 w-4 mr-1.5 ${starred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
              {starred ? 'Starred' : 'Star'} {dataset.stars + (starred ? 1 : 0)}
            </Button>
            <Button variant="outline" size="sm" onClick={handleFork}>
              <GitFork className={`h-4 w-4 mr-1.5 ${forked ? 'text-teal-400' : ''}`} />
              {forked ? 'Forked' : 'Fork'} {dataset.forks + (forked ? 1 : 0)}
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Stations" value={String(dataset.station_count)} icon={Radio} />
        <StatCard label="Stars" value={String(dataset.stars)} icon={Star} />
        <StatCard label="Forks" value={String(dataset.forks)} icon={GitFork} />
        <StatCard label="Citations" value={String(dataset.citations)} icon={Quote} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 md:w-auto md:inline-flex">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="download">Download</TabsTrigger>
          <TabsTrigger value="citation">Cite</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Data Preview</CardTitle>
                <CardDescription>Last 24 hours of {capitalize(dataset.sensor_types[0].replace('_', ' '))} data</CardDescription>
              </CardHeader>
              <CardContent>
                <MiniSparkline data={dataset.preview_data} color={primaryColor} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Metadata</CardTitle>
                <CardDescription>Dataset details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quality</span>
                    <Badge variant={dataset.data_quality === 'excellent' ? 'success' : 'secondary'} className="text-[10px]">
                      {capitalize(dataset.data_quality)}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Region</span>
                    <span>{dataset.region}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">License</span>
                    <span className="font-mono text-xs">{dataset.license}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Visibility</span>
                    <span className="capitalize">{dataset.visibility}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span>{formatDate(dataset.updated_at)}</span>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <span className="text-muted-foreground text-xs">Tags</span>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {dataset.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px]">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sensor Types</CardTitle>
              <CardDescription>Available measurements in this dataset</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {dataset.sensor_types.map((sensor) => (
                  <div
                    key={sensor}
                    className="rounded-lg border border-border p-3 flex items-center gap-3"
                  >
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: getSensorTypeColor(sensor) + '20' }}
                    >
                      <Radio className="h-4 w-4" style={{ color: getSensorTypeColor(sensor) }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{capitalize(sensor.replace('_', ' '))}</p>
                      <p className="text-xs text-muted-foreground">Active</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="download" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Download Dataset</CardTitle>
              <CardDescription>Export data in your preferred format</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3">
                <GlassCard intensity="low" className="p-4 hover:bg-white/50 dark:hover:bg-black/40 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-teal-400" />
                    </div>
                    <div>
                      <p className="font-medium">CSV</p>
                      <p className="text-xs text-muted-foreground">Comma-separated values</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Standard spreadsheet format compatible with Excel, Google Sheets, and R.</p>
                  <Button size="sm" className="w-full">
                    <Download className="h-4 w-4 mr-1.5" />
                    Download CSV
                  </Button>
                </GlassCard>

                <GlassCard intensity="low" className="p-4 hover:bg-white/50 dark:hover:bg-black/40 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-lg bg-sky-500/10 flex items-center justify-center">
                      <Database className="h-5 w-5 text-sky-400" />
                    </div>
                    <div>
                      <p className="font-medium">NetCDF</p>
                      <p className="text-xs text-muted-foreground">Network Common Data Form</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Self-describing format ideal for scientific data and multi-dimensional arrays.</p>
                  <Button size="sm" variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-1.5" />
                    Download NetCDF
                  </Button>
                </GlassCard>

                <GlassCard intensity="low" className="p-4 hover:bg-white/50 dark:hover:bg-black/40 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Globe className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-medium">GeoJSON</p>
                      <p className="text-xs text-muted-foreground">Geographic JSON format</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Geospatial format with station coordinates for mapping and GIS applications.</p>
                  <Button size="sm" variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-1.5" />
                    Download GeoJSON
                  </Button>
                </GlassCard>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="citation" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Citation Generator</CardTitle>
              <CardDescription>Properly cite this dataset in your research</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(citationFormats).map(([format, text]) => (
                <div key={format}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium uppercase">{format}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(format, text)}
                    >
                      {copiedFormat === format ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                  <pre className="rounded-lg bg-muted p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                    {text}
                  </pre>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Comments</CardTitle>
              <CardDescription>Discussion and feedback on this dataset</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-6">
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    DU
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment..."
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                    />
                    <div className="flex justify-end mt-2">
                      <Button size="sm" onClick={handleAddComment} disabled={!commentText.trim()}>
                        <MessageSquare className="h-4 w-4 mr-1.5" />
                        Post Comment
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {comments.map((comment, idx) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex gap-3 pb-4 border-b border-border last:border-0 last:pb-0"
                  >
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-sky-400 to-teal-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {comment.author.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{comment.author}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(comment.created_at)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{comment.content}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-teal-400 transition-colors">
                          <ThumbsUp className="h-3.5 w-3.5" />
                          {comment.likes}
                        </button>
                        <button className="text-xs text-muted-foreground hover:text-teal-400 transition-colors">
                          Reply
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
