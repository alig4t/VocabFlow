/** First-launch loading screen shown while the offline database seeds. */
export function SeedLoader({ progress, label }: { progress: number; label: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100)
  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background px-8 font-persian text-foreground"
    >
      <img src="/logo/logo-flow-192.png" alt="VocabFlow" className="h-20 w-20 rounded-2xl shadow-lg" />
      <div className="text-center">
        <p className="text-lg font-bold">در حال آماده‌سازی واژه‌ها…</p>
        <p className="mt-1 text-sm text-muted-foreground">{label || 'اولین اجرا کمی طول می‌کشد'}</p>
      </div>
      <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs tabular-nums text-muted-foreground">{pct}٪</p>
    </div>
  )
}
