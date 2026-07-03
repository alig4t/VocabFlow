import { useEffect, useState } from 'react'

/**
 * Branded full-screen loader with an animated progress bar.
 * Used for the initial app boot and as the Suspense fallback for lazy routes.
 * The bar eases toward ~92% while mounted; it disappears when the real
 * content is ready, which reads as "finishing".
 */
export function PageLoader({ label = 'در حال بارگذاری…' }: { label?: string }) {
  const [progress, setProgress] = useState(10)

  useEffect(() => {
    const id = setInterval(() => {
      setProgress((p) => (p >= 92 ? p : Math.min(92, p + Math.max(0.6, (92 - p) * 0.07))))
    }, 130)
    return () => clearInterval(id)
  }, [])

  const percent = Math.round(progress).toLocaleString('fa-IR')

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-background font-persian"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      {/* ambient glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />

      {/* logo with soft pulse */}
      <div className="relative">
        <span
          className="absolute inset-0 animate-ping rounded-2xl bg-primary/20 motion-reduce:hidden"
          style={{ animationDuration: '1.8s' }}
        />
        <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
          <img src="/logo/logo-192-192.png" alt="وکب" className="h-full w-full object-contain p-2" draggable={false} />
        </div>
      </div>

      <div className="text-center">
        <p className="text-lg font-extrabold tracking-tight text-foreground">وکب</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
      </div>

      {/* progress bar */}
      <div className="w-56 max-w-[70vw]">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-brand-gradient transition-[width] duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 text-center text-[11px] font-medium tabular-nums text-muted-foreground">{percent}٪</div>
      </div>
    </div>
  )
}
