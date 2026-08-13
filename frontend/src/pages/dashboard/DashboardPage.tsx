import { useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  Library,
  Compass,
  CalendarClock,
  AlertTriangle,
  Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { GlobalStats } from '@/components/dashboard/GlobalStats'
import { SectionHeading } from '@/components/dashboard/SectionHeading'
import { StudyTodayHero } from '@/components/dashboard/StudyTodayHero'
import { TodayPracticeCard } from '@/components/dashboard/TodayPracticeCard'
import { WatchlistBookCard } from '@/components/dashboard/WatchlistBookCard'
import { ContinueLearning } from '@/components/dashboard/ContinueLearning'
import { ActivityHeatmap } from '@/components/dashboard/ActivityHeatmap'
import { BookComparison } from '@/components/dashboard/BookComparison'
import { MemoryOverview } from '@/components/dashboard/MemoryOverview'
import { UpcomingReviews } from '@/components/dashboard/UpcomingReviews'
import { HardWords } from '@/components/dashboard/HardWords'
import { useDashboard } from '@/hooks/useDashboard'
import { useAuthStore } from '@/store/authStore'
import { isNative } from '@/lib/platform'

function DashboardSkeleton() {
  return (
    <div className="space-y-10">
      <Skeleton className="h-24 rounded-3xl" />
      <Skeleton className="h-80 rounded-3xl" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-80 rounded-3xl" />
        ))}
      </div>
    </div>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { data, isLoading, isError } = useDashboard()

  const name = user && !isNative() ? user.name : null

  return (
    <div dir="rtl" className="page-atmosphere font-persian">
      {/*
        ① امروز چه کار کنم؟ — the single primary action on the page.

        It sits outside the max-width container so it can run edge to edge, and
        it renders in every state (loading, no plans, done) because it carries
        the greeting.
      */}
      <StudyTodayHero
        userName={name}
        streak={data?.stats.currentStreak ?? 0}
        accuracy={data?.stats.accuracyRate ?? 0}
        wordsInMemory={data?.memory.total ?? 0}
      />

      {/*
        Sections are ordered as questions: how am I doing overall → what have I
        banked → what am I reading → where am I stuck → what's coming → history.
        Rhythm is `space-y-10`: the cards no longer carry borders, so the gap
        between sections is what separates them.
      */}
      <div className="mx-auto max-w-6xl space-y-10 pt-8">
        {isLoading ? (
          <DashboardSkeleton />
        ) : isError || !data ? (
          <div className="surface rounded-3xl px-6 py-12 text-center">
            <p className="text-sm font-medium text-destructive">داشبورد بارگذاری نشد.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              اتصال خود را بررسی کنید و دوباره تلاش کنید.
            </p>
          </div>
        ) : (
          <>
            {/* Practice — unlocks once today's session is finished */}
            <TodayPracticeCard />

            {/* ② چقدر پیشرفت کرده‌ام؟ — this card carries its own accent heading */}
            <MemoryOverview memory={data.memory} growth={data.growth} />

            {/* ③ وضعیتم چطور است؟ — a quiet strip, not four competing cards */}
            <GlobalStats stats={data.stats} />

            {/* ④ چه می‌خوانم؟ — with the per-book review queue as its lead-in */}
            <section className="space-y-4">
              <SectionHeading icon={Library} accent="کتاب‌های">
                من
              </SectionHeading>

              <ContinueLearning queue={data.queue} />

              {data.watchlist.length === 0 ? (
                <div className="surface flex flex-col items-center gap-3 rounded-3xl px-6 py-14 text-center">
                  <Library
                    className="h-10 w-10 text-muted-foreground opacity-40"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-base font-medium text-foreground">
                      هنوز کتابی اضافه نکرده‌اید
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      از کتابخانه یک کتاب به لیست یادگیری خود اضافه کنید.
                    </p>
                  </div>
                  <Button className="gap-2" onClick={() => navigate('/library')}>
                    <Compass className="h-4 w-4" aria-hidden="true" />
                    رفتن به کتابخانه
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {data.watchlist.map((book) => (
                    <WatchlistBookCard key={book.id} book={book} />
                  ))}
                </div>
              )}
            </section>

            {/* ⑤ کجا گیر کرده‌ام؟ */}
            <section className="space-y-4">
              <SectionHeading icon={AlertTriangle} accent="واژه‌های">
                دردسرساز
              </SectionHeading>
              <div className="surface rounded-3xl p-4 sm:p-5">
                <HardWords words={data.hardWords} />
              </div>
            </section>

            {/* ⑥ چه چیزی در راه است؟ */}
            <section className="space-y-4">
              <SectionHeading icon={CalendarClock} accent="مرورهای">
                پیش رو
              </SectionHeading>
              <div className="surface rounded-3xl p-5 sm:p-6">
                <UpcomingReviews days={data.upcoming} />
              </div>
            </section>

            {/* ⑦ سابقه‌ام چیست؟ */}
            <section className="space-y-4">
              <SectionHeading icon={Activity} accent="فعالیت">
                مطالعه
              </SectionHeading>
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="surface rounded-3xl p-3 pl-3 pr-4 sm:p-6 lg:col-span-2">
                  <ActivityHeatmap days={data.heatmap} />
                </div>

                <div className="surface space-y-3 rounded-3xl p-5 sm:p-6">
                  <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <CalendarDays className="h-4 w-4 text-accent-foreground" aria-hidden="true" />
                    مقایسه کتاب‌ها
                  </p>
                  <BookComparison books={data.watchlist} />
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
