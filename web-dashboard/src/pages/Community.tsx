import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Flame,
  Star,
  MessageSquare,
  TrendingUp,
  Users,
  Database,
  FolderGit2,
  Building2,
  Heart,
  Share2,
  Filter,
  Clock,
  Check,
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { getDemoData } from '@/lib/demoData'
import { formatDate, capitalize } from '@/lib/utils'
import type { CommunityFeedItem } from '@/types'

const demoFeed = getDemoData().communityFeed
const demoDatasets = getDemoData().publicDatasets

const typeConfig = {
  dataset: { icon: Database, color: 'text-teal-400', bg: 'bg-teal-500/10', label: 'Dataset' },
  project: { icon: FolderGit2, color: 'text-sky-400', bg: 'bg-sky-500/10', label: 'Project' },
  organization: { icon: Building2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Organization' },
}

export default function Community() {
  const [activeTab, setActiveTab] = useState('trending')
  const [starredItems, setStarredItems] = useState<Set<string>>(new Set())
  const [followedOrgs, setFollowedOrgs] = useState<Set<string>>(new Set())
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set())

  const toggleStar = (id: string) => {
    setStarredItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleLike = (id: string) => {
    setLikedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleFollow = (id: string) => {
    setFollowedOrgs((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const trendingDatasets = useMemo(() => {
    return [...demoDatasets].sort((a, b) => b.stars - a.stars).slice(0, 5)
  }, [])

  const feedItems = useMemo(() => {
    if (activeTab === 'trending') {
      return [...demoFeed].sort((a, b) => b.stars - a.stars)
    }
    if (activeTab === 'latest') {
      return [...demoFeed].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }
    // organizations tab
    return demoFeed.filter((item) => item.type === 'organization')
  }, [activeTab])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Community</h1>
          <p className="text-muted-foreground">Discover trending datasets, projects, and organizations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-1.5" />
            Filter
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <GlassCard intensity="medium" className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{demoDatasets.length}</p>
              <p className="text-xs text-muted-foreground">Public Datasets</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard intensity="medium" className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-rose-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-rose-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">12</p>
              <p className="text-xs text-muted-foreground">Active Organizations</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard intensity="medium" className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Flame className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">1.2k</p>
              <p className="text-xs text-muted-foreground">Total Stars</p>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 md:w-auto md:inline-flex">
              <TabsTrigger value="trending">
                <TrendingUp className="h-4 w-4 mr-1.5" />
                Trending
              </TabsTrigger>
              <TabsTrigger value="latest">
                <Clock className="h-4 w-4 mr-1.5" />
                Latest
              </TabsTrigger>
              <TabsTrigger value="organizations">
                <Building2 className="h-4 w-4 mr-1.5" />
                Orgs
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              <div className="space-y-4">
                {feedItems.map((item: CommunityFeedItem, idx: number) => {
                  const config = typeConfig[item.type]
                  const TypeIcon = config.icon
                  const isStarred = starredItems.has(item.id)
                  const isLiked = likedItems.has(item.id)
                  const isFollowed = followedOrgs.has(item.actor_id)

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <GlassCard hoverLift className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`h-10 w-10 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
                            <TypeIcon className={`h-5 w-5 ${config.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              {item.type === 'dataset' ? (
                                <Link
                                  to={`/dataset/${item.id.replace('cf', 'ds')}`}
                                  className="font-semibold text-sm hover:text-teal-400 transition-colors"
                                >
                                  {item.title}
                                </Link>
                              ) : (
                                <span className="font-semibold text-sm">{item.title}</span>
                              )}
                              <Badge variant="outline" className="text-[10px]">
                                {config.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              {item.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-[10px]">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <UserIcon className="h-3.5 w-3.5" />
                                  {item.actor}
                                </span>
                                <span>{formatDate(item.created_at)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => toggleLike(item.id)}
                                  className={`flex items-center gap-1 text-xs transition-colors ${
                                    isLiked ? 'text-rose-400' : 'text-muted-foreground hover:text-rose-400'
                                  }`}
                                >
                                  <Heart className={`h-3.5 w-3.5 ${isLiked ? 'fill-rose-400' : ''}`} />
                                  {item.stars + (isLiked ? 1 : 0)}
                                </button>
                                <button
                                  onClick={() => toggleStar(item.id)}
                                  className={`flex items-center gap-1 text-xs transition-colors ${
                                    isStarred ? 'text-yellow-400' : 'text-muted-foreground hover:text-yellow-400'
                                  }`}
                                >
                                  <Star className={`h-3.5 w-3.5 ${isStarred ? 'fill-yellow-400' : ''}`} />
                                </button>
                                <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-teal-400 transition-colors">
                                  <MessageSquare className="h-3.5 w-3.5" />
                                  {item.comments}
                                </button>
                                <button className="text-muted-foreground hover:text-teal-400 transition-colors">
                                  <Share2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </GlassCard>
                    </motion.div>
                  )
                })}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-400" />
                Trending Datasets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {trendingDatasets.map((ds, idx) => (
                  <div key={ds.id} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-muted-foreground w-4">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/dataset/${ds.id}`}
                        className="text-sm font-medium hover:text-teal-400 transition-colors line-clamp-1"
                      >
                        {ds.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">{ds.organization}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3.5 w-3.5" />
                      {ds.stars}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4 text-emerald-400" />
                Organizations to Follow
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {demoFeed
                  .filter((item) => item.type === 'organization')
                  .map((org) => {
                    const isFollowed = followedOrgs.has(org.actor_id)
                    return (
                      <div key={org.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-emerald-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{org.title}</p>
                            <p className="text-xs text-muted-foreground">{org.stars} followers</p>
                          </div>
                        </div>
                        <Button
                          variant={isFollowed ? 'default' : 'outline'}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => toggleFollow(org.actor_id)}
                        >
                          {isFollowed ? (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Following
                            </>
                          ) : (
                            'Follow'
                          )}
                        </Button>
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
