import { useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Home, BarChart3, GraduationCap, Compass, Menu, Book, Play,
  SlidersHorizontal, Rocket, Info, Settings, Users, Library, FilePlus2, ShieldCheck, X,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { isNative } from '../../lib/platform'
import { cn } from '../../lib/utils'

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
}

// آیتم‌های شیت «بیشتر» — همان صفحاتی که در سایدبار هستند ولی در نوار پایین جا نشدند
const moreItems: NavItem[] = [
  { to: '/vocabulary', icon: <Book className="h-5 w-5" />, label: 'واژگان' },
  { to: '/vocabulary/review', icon: <Play className="h-5 w-5" />, label: 'مرور آزاد' },
]

const secondaryItems: NavItem[] = [
  { to: '/settings', icon: <SlidersHorizontal className="h-5 w-5" />, label: 'تنظیمات' },
  { to: '/guide', icon: <Rocket className="h-5 w-5" />, label: 'راهنمای شروع' },
  { to: '/about', icon: <Info className="h-5 w-5" />, label: 'درباره سازنده' },
]

const adminItems: NavItem[] = [
  { to: '/admin', icon: <Settings className="h-5 w-5" />, label: 'پنل مدیریت' },
  { to: '/admin/users', icon: <Users className="h-5 w-5" />, label: 'کاربران' },
  { to: '/admin/books', icon: <Library className="h-5 w-5" />, label: 'کتاب‌ها' },
  { to: '/admin/words/new', icon: <FilePlus2 className="h-5 w-5" />, label: 'افزودن واژه' },
]

function MoreLink({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/vocabulary' || item.to === '/admin'}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition-colors active:scale-[0.98]',
          isActive
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        )
      }
    >
      {item.icon}
      {item.label}
    </NavLink>
  )
}

export function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN'
  const native = isNative()
  const { pathname } = useLocation()

  const morePaths = [
    ...moreItems.map((i) => i.to),
    ...secondaryItems.map((i) => i.to),
    ...(isAdmin ? adminItems.map((i) => i.to) : []),
    // کتاب/درس زیرمجموعه کتابخانه نیستند ولی واژه‌های ادمین هم «بیشتر» محسوب می‌شوند
  ]
  const moreActive = morePaths.some((p) => pathname === p || pathname.startsWith(p + '/'))

  const tabClass = (active: boolean) =>
    cn(
      'group flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] font-bold transition-colors',
      active ? 'text-primary' : 'text-muted-foreground/80 group-active:text-foreground',
    )

  // قرص رنگی پشت آیکون تب فعال
  const iconWrap = (active: boolean, icon: React.ReactNode) => (
    <span
      className={cn(
        'flex h-8 w-12 items-center justify-center rounded-full transition-colors',
        active && 'bg-primary/12',
      )}
    >
      {icon}
    </span>
  )

  return (
    <>
      <nav
        dir="rtl"
        className="font-persian fixed inset-x-0 bottom-0 z-20 grid h-16 grid-cols-5 border-t border-border bg-card/95 shadow-[0_-4px_16px_-6px_hsl(var(--foreground)/0.15)] backdrop-blur-md lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="ناوبری اصلی موبایل"
      >
        <NavLink to="/dashboard" end className={({ isActive }) => tabClass(isActive)}>
          {({ isActive }) => (
            <>
              {iconWrap(isActive, <Home className="h-5 w-5" />)}
              خانه
            </>
          )}
        </NavLink>

        <NavLink to="/statistics" end className={({ isActive }) => tabClass(isActive)}>
          {({ isActive }) => (
            <>
              {iconWrap(isActive, <BarChart3 className="h-5 w-5" />)}
              آمار
            </>
          )}
        </NavLink>

        {/* دکمه برجسته مطالعه امروز */}
        <NavLink to="/study" end className="relative flex items-end justify-center pb-1.5" aria-label="مطالعه امروز">
          <span
            className={cn(
              'flex h-14 w-14 -translate-y-5 items-center justify-center rounded-full bg-primary text-primary-foreground ring-4 ring-card transition-all duration-200',
              'shadow-[0_6px_16px_-4px_hsl(var(--primary)/0.55)] active:scale-90 active:shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.45)]',
              pathname === '/study' && '-translate-y-6 shadow-[0_8px_20px_-4px_hsl(var(--primary)/0.7)]',
            )}
          >
            <GraduationCap className="h-6 w-6" strokeWidth={2.2} />
          </span>
        </NavLink>

        <NavLink to="/library" className={({ isActive }) => tabClass(isActive)}>
          {({ isActive }) => (
            <>
              {iconWrap(isActive, <Compass className="h-5 w-5" />)}
              کتابخانه
            </>
          )}
        </NavLink>

        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={tabClass(moreActive)}
          aria-label="صفحات بیشتر"
          aria-expanded={moreOpen}
        >
          {iconWrap(moreActive, <Menu className="h-5 w-5" />)}
          بیشتر
        </button>
      </nav>

      {/* شیت «بیشتر» — از پریمیتیو‌های Dialog به صورت bottom-sheet */}
      <DialogPrimitive.Root open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            className={cn(
              'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'lg:hidden',
            )}
          />
          <DialogPrimitive.Content
            dir="rtl"
            className={cn(
              'fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-border bg-card px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl',
              'duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
              'lg:hidden',
            )}
          >
            <DialogPrimitive.Title className="sr-only">صفحات بیشتر</DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="absolute left-4 top-4 rounded-sm text-muted-foreground transition-colors hover:text-foreground"
              aria-label="بستن"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>

            {/* دستگیره کشیدن */}
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border" />

            <div className="space-y-1">
              {moreItems.map((item) => (
                <MoreLink key={item.to} item={item} onNavigate={() => setMoreOpen(false)} />
              ))}
            </div>

            <hr className="my-3 border-border" />

            <div className="space-y-1">
              {secondaryItems.map((item) => (
                <MoreLink key={item.to} item={item} onNavigate={() => setMoreOpen(false)} />
              ))}
            </div>

            {/* بخش مدیریت — وب فقط؛ اپ آفلاین سرور/ادمین ندارد */}
            {!native && isAdmin && (
              <div className="mt-4 rounded-xl border border-slate-400/30 bg-slate-500/[0.06] p-2.5">
                <div className="mb-2 flex items-center gap-2 px-1.5">
                  <ShieldCheck className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                  <span className="text-xs font-bold tracking-wide text-slate-700 dark:text-slate-300">
                    بخش مدیریت
                  </span>
                </div>
                <div className="space-y-1">
                  {adminItems.map((item) => (
                    <MoreLink key={item.to} item={item} onNavigate={() => setMoreOpen(false)} />
                  ))}
                </div>
              </div>
            )}

            {/* نسخه نیتیو: افزودن واژه به‌عنوان تنها صفحه ادمین آفلاین */}
            {native && (
              <div className="mt-4 space-y-1">
                <MoreLink
                  item={{ to: '/admin/words/new', icon: <FilePlus2 className="h-5 w-5" />, label: 'افزودن واژه' }}
                  onNavigate={() => setMoreOpen(false)}
                />
              </div>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}
