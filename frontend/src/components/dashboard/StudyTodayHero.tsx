import { useNavigate } from 'react-router-dom'
import { GraduationCap, Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useStudyToday } from '@/hooks/useStudy'

/**
 * The single most important element on Home: today's study call-to-action.
 * Shows how many reviews are due and how many new words are queued, plus the
 * current book/volume/lesson, and launches the daily session.
 */
export function StudyTodayHero() {
  const navigate = useNavigate()
  const { data, isLoading } = useStudyToday()

  if (isLoading) return <Skeleton className="h-32 rounded-2xl" />
  if (!data) return null

  const { dueCount, newCount, hasPlans, plans } = data.meta
  const totalToday = dueCount + newCount
  const plan = plans[0]

  // No learning plans yet — the dashboard's empty state guides to the library,
  // so keep this compact.
  if (!hasPlans) return null

  const lessonLabel =
    plan && plan.currentLesson != null
      ? `${plan.continueLesson ? 'ادامه‌ی' : 'شروع'} درس ${plan.currentLesson} · ${plan.bookTitle}`
      : null

  return (
    <section className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-l from-primary/10 via-primary/5 to-transparent p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2 text-lg font-bold text-foreground">
            <GraduationCap className="h-6 w-6 text-primary" aria-hidden="true" />
            مطالعه امروز
          </div>

          {totalToday > 0 ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 font-medium text-blue-600 dark:text-blue-400">
                <RefreshCw className="h-3.5 w-3.5" />
                {dueCount} مرور
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                {newCount} لغت جدید
              </span>
            </div>
          ) : (
            <p className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              برای امروز کاری نمانده — عالی بود!
            </p>
          )}

          {lessonLabel && totalToday > 0 && (
            <p className="truncate text-xs text-muted-foreground">{lessonLabel}</p>
          )}
        </div>

        <Button
          size="lg"
          className="w-full shrink-0 gap-2 text-base sm:w-auto"
          disabled={totalToday === 0}
          onClick={() => navigate('/study')}
        >
          <GraduationCap className="h-5 w-5" aria-hidden="true" />
          {totalToday > 0 ? 'شروع مطالعه امروز' : 'تمام شد'}
        </Button>
      </div>
    </section>
  )
}
