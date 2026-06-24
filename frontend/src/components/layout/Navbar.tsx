import { Menu, Moon, Sun, User, LogOut } from 'lucide-react'
import { useTheme } from './ThemeProvider'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../ui/button'

interface NavbarProps {
  onMenuClick: () => void
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const { user, clearAuth } = useAuthStore()

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  const handleLogout = () => {
    clearAuth()
    window.location.href = '/login'
  }

  return (
    <header dir="rtl" className="font-persian flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/95 backdrop-blur px-4 md:px-6">
      {/* راست: دکمه منو (موبایل) */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label="باز کردن منو"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* فاصله در دسکتاپ */}
      <div className="hidden lg:block" />

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

        {/* تغییر تم */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={resolvedTheme === 'dark' ? 'تغییر به حالت روشن' : 'تغییر به حالت تاریک'}
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        {/* خروج */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          aria-label="خروج از حساب"
          className="text-muted-foreground hover:text-destructive"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  )
}
