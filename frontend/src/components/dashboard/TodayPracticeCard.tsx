import { useNavigate } from 'react-router-dom'
import { Dumbbell, Lock, Sparkles, ArrowLeft, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStudyToday } from '@/hooks/useStudy'

/**
 * "تمرین: مرور مجدد واژگان جدید امروز" — the reward section on Home.
 *
 * Three states, decided entirely from data `StudyTodayHero` already fetched (so
 * this costs no extra request):
 *  - hidden   → no plans, or today involves no new words at all (nothing to practise);
 *  - locked   → today's session isn't finished yet; shown as a teaser so the
 *               user can see what's waiting;
 *  - unlocked → today's queue is empty and new words were introduced today.
 */
export function TodayPracticeCard() {
  const navigate = useNavigate()
  const { data, isLoading } = useStudyToday()

  if (isLoading || !data) return null

  const { dueCount, newCount, introducedToday, hasPlans } = data.meta
  const remaining = dueCount + newCount

  // Nothing to practise: no plans, or a day with no new words on either side.
  if (!hasPlans) return null
  if (newCount === 0 && introducedToday === 0) return null

  const unlocked = remaining === 0 && introducedToday > 0

  if (!unlocked) {
    return (
      <section
        aria-disabled="true"
        className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-4 sm:p-5"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Lock className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
            تمرین: مرور مجدد واژگان جدید امروز
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium">
              قفل
            </span>
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground/80">
            {introducedToday > 0
              ? `${introducedToday} واژه تا اینجا خوانده‌اید. `
              : ''}
            با تمام‌کردن مطالعه امروز باز می‌شود.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-l from-primary/15 via-primary/5 to-transparent p-5 shadow-soft sm:p-6">
      {/* Soft glow — decorative only */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-10 -top-14 h-40 w-40 rounded-full bg-primary/20 blur-3xl"
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2 text-lg font-bold text-foreground">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Dumbbell className="h-5 w-5" aria-hidden="true" />
            </span>
            تمرین امروز
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
              باز شد
            </span>
          </div>

          <p className="text-sm font-medium text-foreground/90">
            مرور مجدد واژگان جدید امروز
          </p>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {introducedToday} واژه‌ی تازه
            </span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              بدون اثر روی زمان‌بندی مرور
            </span>
          </div>
        </div>

        <Button
          size="lg"
          className="w-full shrink-0 gap-2 text-base font-bold shadow-sm sm:w-auto"
          onClick={() => navigate('/review-today')}
        >
          شروع تمرین
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>
    </section>
  )
}
