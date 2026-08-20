import { useLayoutEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'
import { SCROLL_CONTAINER_ID } from '@/lib/scroll'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  /*
    On the dashboard the navbar merges into the hero band: it renders INSIDE
    <main> as its first child, transparent, with the hero's full-bleed
    gradient sliding up behind it (`.page-bleed-under-nav`). Moving it inside
    the scroll container is what makes the merge possible — a negative-margin
    hero inside main could never paint under a bar outside it. Everywhere else
    the solid navbar sits above <main> as before.
  */
  const mergedHeroNav = pathname === '/dashboard'

  // Every route renders its own <Layout>, but React reconciles them into the
  // same element, so <main> survives navigation with its scrollTop intact and
  // the new page opens wherever the previous one was left. Reset before paint
  // so there's no visible jump. Search-param-only changes (filters, paging)
  // are deliberately excluded — those pages scroll themselves.
  useLayoutEffect(() => {
    const reset = () => {
      if (mainRef.current) mainRef.current.scrollTop = 0
      // Some WebView/landing cases scroll the document instead of <main>.
      if (window.scrollY) window.scrollTo(0, 0)
    }
    reset()
    // A page whose content lands after this commit (cached query data, images,
    // fonts) can leave the box scrolled, so reset once more on the next frame.
    const raf = requestAnimationFrame(reset)
    return () => cancelAnimationFrame(raf)
  }, [pathname])

  return (
    <div dir="rtl" className="flex h-[100dvh] overflow-hidden bg-background text-foreground">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {!mergedHeroNav && <Navbar onMenuClick={() => setSidebarOpen(true)} />}

        <main
          id={SCROLL_CONTAINER_ID}
          ref={mainRef}
          className="flex-1 transform-gpu overflow-y-auto px-2 py-4 [backface-visibility:hidden] [overflow-anchor:none] sm:p-4 md:p-6 lg:p-8"
        >
          {mergedHeroNav && <Navbar hero onMenuClick={() => setSidebarOpen(true)} />}
          {children}
        </main>
      </div>
    </div>
  )
}
