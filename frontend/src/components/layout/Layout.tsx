import { useState } from 'react'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'
import { isNative } from '@/lib/platform'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const native = isNative()

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
        <Navbar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto px-2 py-4 sm:p-4 md:p-6 lg:p-8">
          {children}

          {native && <footer className="pt-8 pb-2 text-center text-[10px] font-persian text-muted-foreground/50">
            ©{' '}
            <a
              href="https://github.com/alig4t"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-primary hover:underline"
            >
              علی قاسمی
            </a>
          </footer>}

        </main>
      </div>
    </div>
  )
}
