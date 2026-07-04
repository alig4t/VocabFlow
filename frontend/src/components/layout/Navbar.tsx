import { Menu, Moon, Sun, Lamp, User, LogOut, Power } from 'lucide-react'
import { useTheme } from './ThemeProvider'
import { useAuthStore } from '../../store/authStore'
import { isNative } from '../../lib/platform'
import { Button } from '../ui/button'

interface NavbarProps {
  onMenuClick: () => void
}

// Cycle order: light → dark → study → light.
const THEME_CYCLE = { light: 'dark', dark: 'study', study: 'light' } as const

const THEME_META = {
  light: { Icon: Sun, label: 'حالت روشن', next: 'حالت تاریک' },
  dark: { Icon: Moon, label: 'حالت تاریک', next: 'حالت مطالعه' },
  study: { Icon: Lamp, label: 'حالت مطالعه', next: 'حالت روشن' },
} as const

export function Navbar({ onMenuClick }: NavbarProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const { user, clearAuth } = useAuthStore()

  const { Icon: ThemeIcon, label: themeLabel, next: nextLabel } = THEME_META[resolvedTheme]

  const toggleTheme = () => {
    setTheme(THEME_CYCLE[resolvedTheme])
  }

  const native = isNative()

  const handleLogout = () => {
    // Offline app: no login/logout — the button simply closes the app.
    if (native) {
      import('@capacitor/app').then((m) => m.App.exitApp()).catch(() => {})
      return
    }
    clearAuth()
    window.location.href = '/login'
  }

  return (
    <header dir="rtl" className="font-persian flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/95 backdrop-blur px-4 md:px-6">
      {/* راست: دکمه منو + لوگو — فقط وقتی سایدبار مخفی است (موبایل/عرض کم) */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="باز کردن منو"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-border">
            <img src="/logo/logo-192-192.png" alt="وکب" className="h-full w-full object-contain p-0.5" draggable={false} />
          </div>
          <span className="text-sm font-bold text-foreground">وکب</span>
        </div>
      </div>

      {/* چپ: اطلاعات کاربر و کنترل‌ها */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* اطلاعات کاربر */}
        {user && (
          <div className="hidden items-center gap-2 md:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-medium text-foreground">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        )}

        {/* تغییر تم: روشن → تاریک → مطالعه */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          title={`${themeLabel} — تغییر به ${nextLabel}`}
          aria-label={`${themeLabel}. تغییر به ${nextLabel}`}
        >
          <ThemeIcon className="h-5 w-5" />
        </Button>

        {/* خروج (وب) / بستن برنامه (اندروید) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          aria-label={native ? 'بستن برنامه' : 'خروج از حساب'}
          title={native ? 'بستن برنامه' : 'خروج از حساب'}
          className="text-muted-foreground hover:text-destructive"
        >
          {native ? <Power className="h-5 w-5" /> : <LogOut className="h-5 w-5" />}
        </Button>
      </div>
    </header>
  )
}
