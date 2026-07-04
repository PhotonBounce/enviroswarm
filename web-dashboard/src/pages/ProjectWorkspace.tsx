import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FolderGit2,
  Users,
  Activity,
  Settings,
  Star,
  GitFork,
  Radio,
  FileText,
  Plus,
  Shield,
  Pencil,
  Eye,
  Lock,
  Globe,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { getDemoData } from '@/lib/demoData'
import { formatDate, capitalize } from '@/lib/utils'
import type { Project, ActivityItem, ProjectMember } from '@/types'

const demoProject = getDemoData().projects[0]
const demoActivities = getDemoData().activities
const demoStations = getDemoData().stations

const activityIcons: Record<string, React.ReactNode> = {
  commit: <GitFork className="h-4 w-4 text-teal-400" />,
  dataset_added: <Radio className="h-4 w-4 text-sky-400" />,
  member_joined: <Users className="h-4 w-4 text-emerald-400" />,
  note_created: <FileText className="h-4 w-4 text-amber-400" />,
  fork: <GitFork className="h-4 w-4 text-violet-400" />,
  star: <Star className="h-4 w-4 text-yellow-400" />,
  comment: <Pencil className="h-4 w-4 text-cyan-400" />,
}

const roleBadges = {
  owner: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  admin: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  editor: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  viewer: 'bg-muted text-muted-foreground border-border',
}

const roleIcons = {
  owner: Shield,
  admin: Shield,
  editor: Pencil,
  viewer: Eye,
}

export default function ProjectWorkspace() {
  const [project, setProject] = useState<Project>(demoProject)
  const [activeTab, setActiveTab] = useState('overview')

  const sharedStations = useMemo(() => {
    return demoStations.filter((s) => project.shared_station_ids.includes(s.id))
  }, [project])

  const projectActivities = useMemo(() => {
    return demoActivities.filter((a) => a.target_id === project.id).slice(0, 8)
  }, [project])

  const toggleStar = () => {
    setProject((prev) => ({ ...prev, starred: !prev.starred }))
  }

  const visibilityIcon = project.visibility === 'public' ? Globe : project.visibility === 'organization' ? Users : Lock
  const VisibilityIcon = visibilityIcon

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <GlassCard intensity="high" className="p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <FolderGit2 className="h-5 w-5 text-teal-400" />
              <h1 className="text-xl font-bold tracking-tight truncate">{project.name}</h1>
              <Badge variant="outline" className="text-[10px]">
                <VisibilityIcon className="h-3 w-3 mr-1" />
                {capitalize(project.visibility)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{project.description}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span>Owned by {project.owner}</span>
              <span>•</span>
              <span>Created {formatDate(project.created_at)}</span>
              <span>•</span>
              <span>Updated {formatDate(project.updated_at)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={toggleStar}>
              <Star className={`h-4 w-4 mr-1.5 ${project.starred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
              {project.starred ? 'Starred' : 'Star'}
            </Button>
            <Button size="sm">
              <Settings className="h-4 w-4 mr-1.5" />
              Settings
            </Button>
          </div>
        </div>
      </GlassCard>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 md:w-auto md:inline-flex">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stations">Stations</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Radio className="h-4 w-4 text-teal-400" />
                  Shared Stations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sharedStations.length}</div>
                <p className="text-xs text-muted-foreground">Active monitoring stations</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-sky-400" />
                  Team Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{project.members.length}</div>
                <p className="text-xs text-muted-foreground">Collaborators on this project</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{projectActivities.length}</div>
                <p className="text-xs text-muted-foreground">Actions in last 7 days</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Shared Stations</CardTitle>
                <CardDescription>Stations connected to this project</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sharedStations.map((station) => (
                    <div
                      key={station.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-sm">{station.name}</p>
                        <div className="mt-1 flex gap-1">
                          {station.sensor_types.map((t) => (
                            <Badge key={t} variant="outline" className="text-[10px]">
                              {capitalize(t.replace('_', ' '))}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Badge variant={station.status === 'active' ? 'success' : 'secondary'} className="text-[10px]">
                        {station.status}
                      </Badge>
                    </div>
                  ))}
                  {sharedStations.length === 0 && (
                    <div className="text-center text-muted-foreground py-4 text-sm">No stations shared yet</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Notes</CardTitle>
                <CardDescription>Shared research notes and findings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors cursor-pointer">
                    <p className="text-sm font-medium">Tokyo Heat Correlation Analysis</p>
                    <p className="text-xs text-muted-foreground mt-1">Kenji Tanaka • 2 days ago</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors cursor-pointer">
                    <p className="text-sm font-medium">Amazon pH Anomalies</p>
                    <p className="text-xs text-muted-foreground mt-1">Prof. Maria Silva • 3 days ago</p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    <Plus className="h-4 w-4 mr-1.5" />
                    New Note
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stations" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Stations</CardTitle>
              <CardDescription>All sensor stations linked to this project</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sharedStations.map((station) => (
                  <motion.div
                    key={station.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between rounded-lg border border-border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
                        <Radio className="h-5 w-5 text-teal-400" />
                      </div>
                      <div>
                        <p className="font-medium">{station.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {station.latitude.toFixed(4)}, {station.longitude.toFixed(4)} • {station.sensor_types.length} sensors
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={station.status === 'active' ? 'success' : 'secondary'}>
                        {station.status}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
                <Button variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Station to Project
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Feed</CardTitle>
              <CardDescription>Recent actions and updates in this project</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projectActivities.map((activity, idx) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-start gap-3 pb-4 border-b border-border last:border-0 last:pb-0"
                  >
                    <div className="mt-0.5 h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      {activityIcons[activity.type] || <Activity className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{activity.actor}</span>{' '}
                        <span className="text-muted-foreground">{activity.message}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDate(activity.created_at)}</p>
                    </div>
                  </motion.div>
                ))}
                {projectActivities.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">No recent activity</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>People collaborating on this project</CardDescription>
              </div>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Invite Member
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {project.members.map((member: ProjectMember) => {
                  const RoleIcon = roleIcons[member.role]
                  return (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between rounded-lg border border-border p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-400 to-sky-400 flex items-center justify-center text-white text-sm font-bold">
                          {member.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] ${roleBadges[member.role]}`}>
                          <RoleIcon className="h-3 w-3 mr-1" />
                          {capitalize(member.role)}
                        </Badge>
                        <p className="text-xs text-muted-foreground">Joined {formatDate(member.joined_at)}</p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
