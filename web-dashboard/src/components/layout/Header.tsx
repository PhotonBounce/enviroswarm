import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, Bell, User, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const mobileNavItems = [
  { path: '/', label: 'Dashboard' },
  { path: '/stations', label: 'Stations' },
  { path: '/data', label: 'Data' },
  { path: '/apikeys', label: 'Keys' },
  { path: '/pricing', label: 'Pricing' },
  { path: '/profile', label: 'Profile' },
]

export default function Header() {
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const location = useLocation()
  const notificationRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const hamburgerRef = useRef<HTMLButtonElement>(null)

  const notificationCount = 0

  useEffect(() => {
    if (!notificationsOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [notificationsOpen])

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
          <span className="text-sm text-muted-foreground">
            Welcome back, {user?.email?.split('@')[0] ?? 'User'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative" ref={notificationRef}>
            <button
              className="relative rounded-lg p-2 hover:bg-muted"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              aria-label="Notifications"
              aria-haspopup="true"
              aria-expanded={notificationsOpen}
            >
              <Bell className="h-5 w-5 text-muted-foreground" />
              {notificationCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {notificationCount}
                </span>
              )}
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-lg border border-border bg-card shadow-lg z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="text-sm font-semibold">Notifications</span>
                  <button
                    onClick={() => setNotificationsOpen(false)}
                    className="rounded p-1 hover:bg-muted"
                    aria-label="Close notifications"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No new notifications
                </div>
              </div>
            )}
          </div>
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
