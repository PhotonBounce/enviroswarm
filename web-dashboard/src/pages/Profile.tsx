import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User,
  Mail,
  Shield,
  CreditCard,
  Bell,
  Webhook,
  CalendarClock,
  Moon,
  Sun,
  Monitor,
  Plus,
  Trash2,
  Check,
  X,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/hooks/useAuth'
import { useUpdateUser } from '@/hooks/useApi'
import { formatDate } from '@/lib/utils'
import type { WebhookConfig } from '@/types'

interface NotificationPrefs {
  emailAlerts: boolean
  pushAlerts: boolean
  dailyDigest: boolean
  weeklyReport: boolean
  alertThresholds: boolean
}

interface ReportSchedule {
  id: string
  name: string
  stationId: string
  frequency: 'daily' | 'weekly' | 'monthly'
  format: 'pdf' | 'csv' | 'excel'
  active: boolean
}

type Theme = 'light' | 'dark' | 'system'

const demoWebhooks: WebhookConfig[] = [
  { id: '1', url: 'https://hooks.example.com/alert', events: ['alert.triggered'], secret: 'whsec_****', active: true, created_at: '2026-01-01T00:00:00Z' },
]

export default function Profile() {
  const { user, tier, setUser } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState(user?.email ?? '')
  const [isEditing, setIsEditing] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const updateUser = useUpdateUser()
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Notification preferences
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(() => {
    if (typeof window === 'undefined') return { emailAlerts: true, pushAlerts: true, dailyDigest: false, weeklyReport: true, alertThresholds: true }
    const saved = localStorage.getItem('enviroswarm_notif_prefs')
    return saved ? JSON.parse(saved) : { emailAlerts: true, pushAlerts: true, dailyDigest: false, weeklyReport: true, alertThresholds: true }
  })

  // Webhooks
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>(demoWebhooks)
  const [newWebhookUrl, setNewWebhookUrl] = useState('')
  const [newWebhookEvents, setNewWebhookEvents] = useState('alert.triggered')

  // Report schedules
  const [schedules, setSchedules] = useState<ReportSchedule[]>(() => {
    if (typeof window === 'undefined') return []
    const saved = localStorage.getItem('enviroswarm_schedules')
    return saved ? JSON.parse(saved) : [
      { id: 'sch-1', name: 'Weekly Air Quality', stationId: '1', frequency: 'weekly', format: 'pdf', active: true },
    ]
  })
  const [newScheduleName, setNewScheduleName] = useState('')
  const [newScheduleStation, setNewScheduleStation] = useState('')
  const [newScheduleFreq, setNewScheduleFreq] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [newScheduleFormat, setNewScheduleFormat] = useState<'pdf' | 'csv' | 'excel'>('pdf')

  // Theme
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system'
    return (localStorage.getItem('enviroswarm_theme') as Theme) || 'system'
  })

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email)
    }
  }, [user?.email])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('enviroswarm_notif_prefs', JSON.stringify(notifPrefs))
  }, [notifPrefs])

  useEffect(() => {
    localStorage.setItem('enviroswarm_schedules', JSON.stringify(schedules))
  }, [schedules])

  useEffect(() => {
    localStorage.setItem('enviroswarm_theme', theme)
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else if (theme === 'light') {
      root.classList.remove('dark')
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
  }, [theme])

  const tierColors = {
    free: 'secondary' as const,
    pro: 'success' as const,
    enterprise: 'default' as const,
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveError('')
    setSaveSuccess(false)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setSaveError('Please enter a valid email address')
      return
    }
    try {
      const updatedUser = await updateUser.mutateAsync({ email })
      setUser(updatedUser)
      setSaveSuccess(true)
      setIsEditing(false)
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update profile'
      setSaveError(message)
    }
  }

  const handleAddWebhook = () => {
    if (!newWebhookUrl || !/^https?:\/\/.+/.test(newWebhookUrl)) return
    const newHook: WebhookConfig = {
      id: `wh-${Date.now()}`,
      url: newWebhookUrl,
      events: newWebhookEvents.split(',').map((e) => e.trim()),
      secret: `whsec_${Math.random().toString(36).substring(2, 10)}`,
      active: true,
      created_at: new Date().toISOString(),
    }
    setWebhooks((prev) => [...prev, newHook])
    setNewWebhookUrl('')
  }

  const handleDeleteWebhook = (id: string) => {
    setWebhooks((prev) => prev.filter((w) => w.id !== id))
  }

  const handleAddSchedule = () => {
    if (!newScheduleName || !newScheduleStation) return
    const newSch: ReportSchedule = {
      id: `sch-${Date.now()}`,
      name: newScheduleName,
      stationId: newScheduleStation,
      frequency: newScheduleFreq,
      format: newScheduleFormat,
      active: true,
    }
    setSchedules((prev) => [...prev, newSch])
    setNewScheduleName('')
    setNewScheduleStation('')
  }

  const handleDeleteSchedule = (id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id))
  }

  const toggleSchedule = (id: string) => {
    setSchedules((prev) => prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s)))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details and subscription</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white text-xl font-bold">
                <User className="h-8 w-8" />
              </div>
              <div>
                <p className="font-medium">{user?.email}</p>
                <Badge variant={tierColors[tier] ?? 'secondary'} className="mt-1 capitalize">
                  {tier}
                </Badge>
              </div>
            </div>
            <div className="space-y-3 pt-2">
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-sm text-muted-foreground">Member since</span>
                <span className="text-sm">{user?.created_at ? formatDate(user.created_at) : '—'}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-sm text-muted-foreground">User ID</span>
                <span className="text-sm font-mono">{user?.id?.substring(0, 8) ?? ''}...</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
            <CardDescription>Update your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    disabled={!isEditing}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input type="password" value="••••••••" disabled className="pl-9" />
                </div>
              </div>
              {saveError && <p className="text-sm text-red-400">{saveError}</p>}
              {saveSuccess && <p className="text-sm text-emerald-400">Profile updated successfully!</p>}
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button type="button" onClick={() => { setIsEditing(false); setEmail(user?.email ?? ''); setSaveError(''); setSaveSuccess(false) }} variant="outline">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateUser.isPending}>
                      {updateUser.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </>
                ) : (
                  <Button type="button" onClick={() => setIsEditing(true)}>Edit Profile</Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Theme Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>Choose your preferred theme</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {([
              { value: 'light' as const, label: 'Light', icon: Sun },
              { value: 'dark' as const, label: 'Dark', icon: Moon },
              { value: 'system' as const, label: 'System', icon: Monitor },
            ]).map((t) => (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors ${
                  theme === t.value
                    ? 'border-emerald-600/40 bg-emerald-900/20 text-emerald-400'
                    : 'border-border hover:bg-muted text-muted-foreground'
                }`}
              >
                <t.icon className="h-5 w-5" />
                <span className="text-sm font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>Control how and when you receive alerts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {([
            { key: 'emailAlerts' as const, label: 'Email Alerts', desc: 'Receive alert notifications via email' },
            { key: 'pushAlerts' as const, label: 'Push Notifications', desc: 'Browser push notifications for real-time alerts' },
            { key: 'dailyDigest' as const, label: 'Daily Digest', desc: 'Daily summary of all station activity' },
            { key: 'weeklyReport' as const, label: 'Weekly Report', desc: 'Weekly performance summary email' },
            { key: 'alertThresholds' as const, label: 'Threshold Alerts', desc: 'Notify when sensor values cross thresholds' },
          ]).map((item) => (
            <div key={item.key} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <button
                onClick={() => setNotifPrefs((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  notifPrefs[item.key] ? 'bg-emerald-600' : 'bg-muted'
                }`}
                aria-label={`Toggle ${item.label}`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    notifPrefs[item.key] ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* API Webhook Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            API Webhooks
          </CardTitle>
          <CardDescription>Configure webhook endpoints for real-time events</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {webhooks.map((wh) => (
            <div key={wh.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{wh.url}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px]">
                    {wh.events.join(', ')}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    Secret: {wh.secret}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Badge variant={wh.active ? 'success' : 'secondary'} className="text-[10px]">
                  {wh.active ? 'Active' : 'Inactive'}
                </Badge>
                <button
                  onClick={() => handleDeleteWebhook(wh.id)}
                  className="rounded p-1.5 hover:bg-muted text-muted-foreground"
                  aria-label="Delete webhook"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            <Input
              placeholder="https://your-server.com/webhook"
              value={newWebhookUrl}
              onChange={(e) => setNewWebhookUrl(e.target.value)}
              className="flex-1"
            />
            <Select
              value={newWebhookEvents}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewWebhookEvents(e.target.value)}
            >
              <option value="alert.triggered">alert.triggered</option>
              <option value="reading.created">reading.created</option>
              <option value="station.offline">station.offline</option>
              <option value="alert.triggered,reading.created">All Events</option>
            </Select>
            <Button onClick={handleAddWebhook} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Scheduling */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Report Scheduling
          </CardTitle>
          <CardDescription>Automated report generation schedules</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {schedules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No scheduled reports yet.</p>
          ) : (
            <div className="space-y-2">
              {schedules.map((sch) => (
                <div key={sch.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">{sch.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px] uppercase">{sch.frequency}</Badge>
                      <Badge variant="outline" className="text-[10px] uppercase">{sch.format}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleSchedule(sch.id)}
                      className={`relative h-5 w-9 rounded-full transition-colors ${
                        sch.active ? 'bg-emerald-600' : 'bg-muted'
                      }`}
                    >
                      <span
                        className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                          sch.active ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => handleDeleteSchedule(sch.id)}
                      className="rounded p-1.5 hover:bg-muted text-muted-foreground"
                      aria-label="Delete schedule"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input
              placeholder="Report name"
              value={newScheduleName}
              onChange={(e) => setNewScheduleName(e.target.value)}
            />
            <Select
              value={newScheduleStation}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewScheduleStation(e.target.value)}
            >
              <option value="">Station</option>
              <option value="1">Central Park Air Monitor</option>
              <option value="2">Riverside Water Station</option>
              <option value="3">Downtown Noise Logger</option>
            </Select>
            <Select
              value={newScheduleFreq}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewScheduleFreq(e.target.value as typeof newScheduleFreq)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </Select>
            <div className="flex gap-2">
              <Select
                value={newScheduleFormat}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewScheduleFormat(e.target.value as typeof newScheduleFormat)}
              >
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
                <option value="excel">Excel</option>
              </Select>
              <Button onClick={handleAddSchedule} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Your current plan and billing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium capitalize">{tier} Plan</p>
                <p className="text-sm text-muted-foreground">
                  {tier === 'free' ? 'No payment required' : 'Billed monthly'}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate('/pricing')}>
              Manage Plan
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
