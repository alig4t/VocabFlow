import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { useTheme, type ResolvedTheme } from './ThemeProvider'

interface StatusBarSpec {
  color: string
  darkIcons: boolean
}

/*
  Status bar colors for regular pages: the exact --background of each theme
  (hex of the HSL in index.css), so the bar reads as a seamless extension of
  the page surface.
*/
const BACKGROUND: Record<ResolvedTheme, StatusBarSpec> = {
  light: { color: '#FBFAF8', darkIcons: true },
  dark: { color: '#080C16', darkIcons: false },
  study: { color: '#EFE9DC', darkIcons: true },
}

/*
  The dashboard's hero band (`.bg-hero-deep`) opens the page with a gold
  gradient under a light radial glow, and the transparent navbar merges into
  it. These are the rendered colors at the very top of that band per theme
  (--deep-1 blended with the 55%-alpha top glow), so the status bar continues
  the band instead of cutting it with a background-colored strip.
*/
const DASHBOARD_HERO: Record<ResolvedTheme, StatusBarSpec> = {
  light: { color: '#FFE687', darkIcons: true },
  dark: { color: '#FAD264', darkIcons: true },
  study: { color: '#F8D67C', darkIcons: true },
}

/**
 * Keeps the Android status bar in sync with the active theme and route.
 * Renders nothing; must live inside <BrowserRouter> (uses useLocation).
 * No-op on the web — every call is native-only and failure-tolerant.
 */
export function StatusBarSync() {
  const { resolvedTheme } = useTheme()
  const { pathname } = useLocation()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let cancelled = false
    import('@capacitor/status-bar')
      .then(({ StatusBar, Style }) => {
        if (cancelled) return
        const spec =
          pathname === '/dashboard'
            ? DASHBOARD_HERO[resolvedTheme]
            : BACKGROUND[resolvedTheme]
        // overlay:false keeps the WebView below the status bar — on Android
        // 15+ (targetSdk 35) edge-to-edge is enforced and would otherwise
        // slide content under it. Safe no-op on older versions.
        StatusBar.setOverlaysWebView({ overlay: false }).catch(() => undefined)
        // Android style mapping (per the plugin's native source):
        // Style.Light = light status bar → DARK icons; Style.Dark → LIGHT icons.
        StatusBar.setStyle({
          style: spec.darkIcons ? Style.Light : Style.Dark,
        }).catch(() => undefined)
        StatusBar.setBackgroundColor({ color: spec.color }).catch(() => undefined)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [resolvedTheme, pathname])

  return null
}
