import { X, Book, Play, Settings, Library, LayoutDashboard, Compass, ShieldCheck, Users, FilePlus2, GraduationCap, SlidersHorizontal, Rocket, Info } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { isNative } from '../../lib/platform'
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
}

const mainItems: NavItem[] = [
  { to: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" />, label: 'داشبورد' },
  { to: '/study', icon: <GraduationCap className="h-5 w-5" />, label: 'مطالعه امروز' },
  { to: '/library', icon: <Compass className="h-5 w-5" />, label: 'کتابخانه' },
  { to: '/vocabulary', icon: <Book className="h-5 w-5" />, label: 'لغات' },
  { to: '/vocabulary/review', icon: <Play className="h-5 w-5" />, label: 'مرور آزاد' },
]

// Secondary group — guide / settings / about, split off from the main nav by a divider.
const secondaryItems: NavItem[] = [
  { to: '/settings', icon: <SlidersHorizontal className="h-5 w-5" />, label: 'تنظیمات' },
  { to: '/guide', icon: <Rocket className="h-5 w-5" />, label: 'راهنمای شروع' },
  { to: '/about', icon: <Info className="h-5 w-5" />, label: 'درباره سازنده' },
]

const adminItems: NavItem[] = [
  { to: '/admin', icon: <Settings className="h-5 w-5" />, label: 'پنل مدیریت' },
  { to: '/admin/users', icon: <Users className="h-5 w-5" />, label: 'کاربران' },
  { to: '/admin/books', icon: <Library className="h-5 w-5" />, label: 'کتاب‌ها' },
  { to: '/admin/words/new', icon: <FilePlus2 className="h-5 w-5" />, label: 'افزودن لغت' },
]

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN'
  const native = isNative()

  // On the offline app there is no server/admin: only word editing is offered,
  // and the server-only management pages (users/books/admin panel) are hidden.
  const primaryItems: NavItem[] = native
    ? [...mainItems, { to: '/admin/words/new', icon: <FilePlus2 className="h-5 w-5" />, label: 'افزودن لغت' }]
    : mainItems

  function renderLink(item: NavItem, accent: 'primary' | 'admin') {
    return (
      <li key={item.to}>
        <NavLink
          to={item.to}
          end={item.to === '/vocabulary' || item.to === '/admin'}
          onClick={onClose}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? accent === 'admin'
                  ? 'bg-slate-700 text-white shadow-sm dark:bg-slate-600'
                  : 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )
          }
        >
          {item.icon}
          {item.label}
        </NavLink>
      </li>
    )
  }

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
          <Link to={'/'}>
        <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-border">
              <img src="/logo/logo-192-192.png" alt="وکب" className="h-full w-full object-contain p-0.5" draggable={false} />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-foreground">وکب</p>
              <p className="text-xs text-muted-foreground">یادگیری زبان</p>
            </div>
        </div>
          </Link>

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
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          عمومی
        </p>
        <ul className="space-y-1">
          {primaryItems.map((item) => renderLink(item, 'primary'))}
        </ul>

        {/* Guide / settings / about — divided off from the main nav */}
        <hr className="my-3 border-border" />
        <ul className="space-y-1">
          {secondaryItems.map((item) => renderLink(item, 'primary'))}
        </ul>

        {/* Admin-only management area — web only; the offline app has no server */}
        {!native && isAdmin && (
          <div className="mt-5">
            <div className="mb-3 border-t border-dashed border-border" />
            <div className="rounded-xl border border-slate-400/30 bg-slate-500/[0.06] p-2.5">
              <div className="mb-2 flex items-center gap-2 px-1.5">
                <ShieldCheck className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                <span className="text-xs font-bold tracking-wide text-slate-700 dark:text-slate-300">
                  بخش مدیریت
                </span>
                <Badge
                  variant="secondary"
                  className="mr-auto bg-slate-500/15 px-1.5 py-0 text-[10px] font-bold text-slate-700 dark:text-slate-300"
                >
                  ADMIN
                </Badge>
              </div>
              <ul className="space-y-1">
                {adminItems.map((item) => renderLink(item, 'admin'))}
              </ul>
            </div>
          </div>
        )}
      </nav>

      {/* Footer: user role badge */}
      {user && (
        <div className="shrink-0 border-t border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
            </div>
            {!native && (
              <Badge variant={isAdmin ? 'default' : 'secondary'} className="shrink-0 text-xs">
                {user.role}
              </Badge>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}
