import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useHardWords } from '@/hooks/useDashboard'
import { faNum } from '@/lib/format'

/** "۵ بار سخت" / "۳ بار غلط" — whichever count dominates for this word. */
function struggleLabel(hardCount: number, wrongCount: number): string {
  if (hardCount >= wrongCount) return `${faNum(hardCount)} بار سخت`
  return `${faNum(wrongCount)} بار غلط`
}

/**
 * The full list behind the dashboard's "نیاز به توجه بیشتر" card — every word
 * the user keeps marking سخت or answering wrong, hardest first. Read-only on
 * purpose: it is a reference list, not another review flow.
 */
export function HardWordsPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError } = useHardWords()

  return (
    <div dir="rtl" className="font-persian mx-auto max-w-3xl space-y-6">
      <header className="flex flex-col gap-3 pr-1.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <AlertTriangle className="h-6 w-6 text-warning" aria-hidden="true" />
            واژه‌های سخت
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            واژه‌هایی که بیشتر از بقیه سخت یا غلط جواب داده‌ای
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2 self-start sm:self-auto"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
          بازگشت به داشبورد
        </Button>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : isError || !data ? (
        <Card className="px-6 py-12 text-center">
          <p className="text-sm font-medium text-destructive">خطا در بارگذاری واژه‌ها.</p>
          <p className="mt-1 text-xs text-muted-foreground">لطفاً بعداً دوباره تلاش کنید.</p>
        </Card>
      ) : data.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <AlertTriangle className="h-10 w-10 text-muted-foreground opacity-40" aria-hidden="true" />
          <div>
            <p className="text-base font-medium text-foreground">واژه سختی نداری</p>
            <p className="mt-1 text-sm text-muted-foreground">
              تا الان هیچ واژه‌ای را «سخت» یا غلط جواب نداده‌ای — عالیه! 🎉
            </p>
          </div>
        </Card>
      ) : (
        <>
          <p className="pr-1.5 text-sm text-muted-foreground">
            مجموع <span className="font-bold text-foreground">{faNum(data.length)}</span> واژه
          </p>

          <ul className="space-y-2">
            {data.map((w, i) => (
              <li
                key={w.wordId}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-soft"
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold tabular-nums text-muted-foreground"
                  aria-hidden="true"
                >
                  {faNum(i + 1)}
                </span>
                <div className="min-w-0 flex-1">
                  {/* dir=ltr keeps the English readable; text-right aligns it
                      with the Persian meaning underneath in the RTL layout. */}
                  <p dir="ltr" className="truncate text-right text-base font-bold text-foreground">
                    {w.eng}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{w.per}</p>
                </div>
                <span className="shrink-0 rounded-full bg-warning/15 px-2.5 py-1 text-[11px] font-medium tabular-nums text-warning">
                  {struggleLabel(w.hardCount, w.wrongCount)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
