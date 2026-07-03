import { Moon, Sun } from 'lucide-react'
import { useTheme } from './ThemeProvider'

/**
 * Compact light/dark switch for public pages (landing, login, register).
 * The in-app Navbar has its own 3-way cycle; on public pages a simple
 * light↔dark toggle is clearer.
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'تغییر به حالت روشن' : 'تغییر به حالت تاریک'}
      title={isDark ? 'حالت روشن' : 'حالت تاریک'}
      className={
        'inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
        className
      }
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  )
}
