import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, Bell, User } from 'lucide-react'
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
  const location = useLocation()

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-4 md:pl-72">
        <div className="flex items-center gap-4">
          <button
            className="md:hidden rounded-lg p-2 hover:bg-muted"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm text-muted-foreground">
            Welcome back, {user?.email?.split('@')[0] ?? 'User'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button className="relative rounded-lg p-2 hover:bg-muted">
            <Bell className="h-5 w-5 text-muted-foreground" />
          </button>
          <Link
            to="/profile"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white text-sm font-semibold"
          >
            <User className="h-4 w-4" />
          </Link>
        </div>
      </div>
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card">
          <nav className="flex flex-col p-2 space-y-1">
            {mobileNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
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
