import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, Bell, User, X, Smartphone, FileText, Globe, Users, FolderGit2, BookOpen, ChevronDown, MapPin, Heart, Shield, Activity } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import SearchBar from '@/components/SearchBar'
import NotificationPanel from '@/components/NotificationPanel'
import type { NotificationItem } from '@/components/NotificationPanel'
import { getDemoData } from '@/lib/demoData'

const mobileNavItems = [
  { path: '/', label: 'Dashboard' },
  { path: '/landing', label: 'Overview' },
  { path: '/map', label: 'Pollution Map' },
  { path: '/health', label: 'Health Impact' },
  { path: '/alerts', label: 'Community Alerts' },
  { path: '/portal', label: 'Portal' },
  { path: '/community', label: 'Community' },
  { path: '/project/proj1', label: 'Projects' },
  { path: '/notebook', label: 'Notebook' },
  { path: '/stations', label: 'Stations' },
  { path: '/data', label: 'Data' },
  { path: '/reports', label: 'Reports' },
  { path: '/apikeys', label: 'API Keys' },
  { path: '/pricing', label: 'Pricing' },
  { path: '/profile', label: 'Profile' },
]

const demoNotifications: NotificationItem[] = [
  {
    id: 'n1',
    title: 'High CO2 detected',
    message: 'Central Park Air Monitor reported CO2 levels above 1000 ppm. Consider ventilation check.',
    type: 'alert',
    read: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    link: '/stations',
  },
  {
    id: 'n2',
    title: 'Station offline',
    message: 'Downtown Noise Logger has been in maintenance mode for 2 hours.',
    type: 'warning',
    read: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: 'n3',
    title: 'Daily report ready',
    message: 'Your daily sensor summary report is ready for download.',
    type: 'info',
    read: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: 'n4',
    title: 'Data export complete',
    message: 'CSV export for Riverside Water Station has been generated successfully.',
    type: 'success',
    read: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
]

export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>(demoNotifications)
  const location = useLocation()
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const hamburgerRef = useRef<HTMLButtonElement>(null)

  const handleMarkRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const handleMarkUnread = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n)))
  }

  const handleDismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const handleClearAll = () => {
    setNotifications([])
  }

  useEffect(() => {
    if (!mobileOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false)
        return
      }
      if (e.key !== 'Tab') return
      const focusable = mobileMenuRef.current?.querySelectorAll<HTMLElement>('a[href], button')
      if (!focusable || focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      hamburgerRef.current?.focus()
    }
  }, [mobileOpen])

  useEffect(() => {
    if (!mobileOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node) && hamburgerRef.current && !hamburgerRef.current.contains(event.target as Node)) {
        setMobileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [mobileOpen])

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-4 md:pl-72">
        <div className="flex items-center gap-4">
          <button
            ref={hamburgerRef}
            className="md:hidden rounded-lg p-2 hover:bg-muted"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle mobile menu"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm text-muted-foreground hidden sm:inline">
            Welcome back, {user?.email?.split('@')[0] ?? 'User'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <nav className="hidden lg:flex items-center gap-1 mr-2">
            <Link
              to="/landing"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Shield className="h-4 w-4" />
              Overview
            </Link>
            <Link
              to="/map"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <MapPin className="h-4 w-4" />
              Map
            </Link>
            <Link
              to="/health"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Heart className="h-4 w-4" />
              Health
            </Link>
            <Link
              to="/alerts"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Activity className="h-4 w-4" />
              Alerts
            </Link>
            <Link
              to="/portal"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Globe className="h-4 w-4" />
              Portal
            </Link>
            <Link
              to="/community"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Users className="h-4 w-4" />
              Community
            </Link>
            <Link
              to="/project/proj1"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <FolderGit2 className="h-4 w-4" />
              Projects
            </Link>
            <Link
              to="/notebook"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              Notebook
            </Link>
          </nav>

          <SearchBar
            onNavigate={(path) => navigate(path)}
            readings={getDemoData().readings}
          />

          <a
            href="/apk/enviroswarm.apk"
            download
            className="hidden sm:flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
            aria-label="Download Android APK"
            title="Download Android App"
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Get APK</span>
          </a>

          <NotificationPanel
            notifications={notifications}
            onMarkRead={handleMarkRead}
            onMarkUnread={handleMarkUnread}
            onDismiss={handleDismiss}
            onClearAll={handleClearAll}
          />

          <Link
            to="/profile"
            aria-label="Profile"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white text-sm font-semibold"
          >
            <User className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card" ref={mobileMenuRef}>
          <nav className="flex flex-col p-2 space-y-1">
            {mobileNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                aria-current={location.pathname === item.path ? 'page' : undefined}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  location.pathname === item.path
                    ? 'bg-emerald-900/30 text-emerald-400'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={() => {
                setMobileOpen(false)
                logout()
              }}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground text-left"
            >
              Sign out
            </button>
          </nav>
        </div>
      )}
    </header>
  )
}
