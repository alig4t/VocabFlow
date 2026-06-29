import { X, Book, Play, Settings, Library } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { cn } from '../../lib/utils'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  {
    to: '/vocabulary',
    icon: <Book className="h-5 w-5" />,
    label: 'لغات',
  },
  {
    to: '/vocabulary/review',
    icon: <Play className="h-5 w-5" />,
    label: 'حالت مرور',
  },
  {
    to: '/admin',
    icon: <Settings className="h-5 w-5" />,
    label: 'پنل مدیریت',
    adminOnly: true,
  },
  {
    to: '/admin/books',
    icon: <Library className="h-5 w-5" />,
    label: 'کتاب‌ها',
    adminOnly: true,
  },
]

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN'

  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin)

  return (
    <aside
      dir="rtl"
      className={cn(
        'font-persian fixed inset-y-0 right-0 z-30 flex w-64 flex-col border-l border-border bg-card transition-transform duration-300 ease-in-out',
        'lg:relative lg:translate-x-0',
        open ? 'translate-x-0' : 'translate-x-full'
      )}
    >
      {/* Header */}
      <div className="flex h-16 shrink-0 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            ELP
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-foreground">ELP</p>
            <p className="text-xs text-muted-foreground">یادگیری زبان</p>
          </div>
        </div>

        {/* Close button (mobile only) */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onClose}
          aria-label="بستن منو"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {visibleItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/vocabulary'}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer: user role badge */}
      {user && (
        <div className="shrink-0 border-t border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
            </div>
            <Badge variant={isAdmin ? 'default' : 'secondary'} className="shrink-0 text-xs">
              {user.role}
            </Badge>
          </div>
        </div>
      )}
    </aside>
  )
}
