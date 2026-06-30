import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Radio,
  BarChart3,
  Key,
  CreditCard,
  User,
  LogOut,
  Leaf,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/stations', label: 'Stations', icon: Radio },
  { path: '/data', label: 'Data Explorer', icon: BarChart3 },
  { path: '/apikeys', label: 'API Keys', icon: Key },
  { path: '/pricing', label: 'Pricing', icon: CreditCard },
  { path: '/profile', label: 'Profile', icon: User },
]

export default function Sidebar() {
  const location = useLocation()
  const { logout } = useAuth()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card hidden md:flex md:flex-col">
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-emerald-400">
          <Leaf className="h-6 w-6" />
          ENViroSwarm
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-emerald-900/30 text-emerald-400'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-border p-3">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-5 w-5" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
