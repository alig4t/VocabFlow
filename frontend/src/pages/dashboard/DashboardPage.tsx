import { useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  Library,
  Compass,
  CalendarClock,
  AlertTriangle,
  Activity,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
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
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-xl" />
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
    <div dir="rtl" className="font-persian">
      {/*
        ① امروز چه کار کنم؟ — the single primary action on the page.

        It sits outside the max-width container so it can run edge to edge, and
        it renders in every state (loading, no plans, done) because it carries
        the greeting.
      */}
      <StudyTodayHero userName={name} streak={data?.stats.currentStreak ?? 0} />

      {/*
        Section rhythm is `space-y-8`, not the old `space-y-6`: with the band
        carrying real weight, the sections below need room to read as separate
        answers rather than one continuous stack of cards.
      */}
      <div className="mx-auto max-w-6xl space-y-8 pt-6">
      {isLoading ? (
        <DashboardSkeleton />
      ) : isError || !data ? (
        <Card className="px-6 py-12 text-center">
          <p className="text-sm font-medium text-destructive">داشبورد بارگذاری نشد.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            اتصال خود را بررسی کنید و دوباره تلاش کنید.
          </p>
        </Card>
      ) : (
        <>
          {/* Practice — unlocks once today's session is finished */}
          <TodayPracticeCard />

          {/* ② وضعیتم چطور است؟ */}
          <GlobalStats stats={data.stats} />

          {/* ③ چقدر پیشرفت کرده‌ام؟ — where every word stands, plus the trend.
              This card carries its own accent heading, so no SectionHeading. */}
          <MemoryOverview memory={data.memory} growth={data.growth} />

          {/* ④ چه چیزی در راه است و کجا گیر کرده‌ام؟ */}
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <SectionHeading icon={CalendarClock} accent="مرورهای">
                پیش رو
              </SectionHeading>
              <Card className="shadow-soft">
                <CardContent className="pt-6">
                  <UpcomingReviews days={data.upcoming} />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              <SectionHeading icon={AlertTriangle} accent="نیاز">
                به توجه بیشتر
              </SectionHeading>
              <Card className="shadow-soft">
                <CardContent className="pt-6">
                  <HardWords words={data.hardWords} />
                </CardContent>
              </Card>
            </div>
          </section>

          {/* ⑤ کتاب‌هایم — with the per-book review queue as its lead-in */}
          <section className="space-y-3">
            <SectionHeading icon={Library} accent="کتاب‌های">
              من
            </SectionHeading>

            <ContinueLearning queue={data.queue} />

            {data.watchlist.length === 0 ? (
              <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                <Library className="h-10 w-10 text-muted-foreground opacity-40" aria-hidden="true" />
                <div>
                  <p className="text-base font-medium text-foreground">هنوز کتابی اضافه نکرده‌اید</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    از کتابخانه یک کتاب به لیست یادگیری خود اضافه کنید.
                  </p>
                </div>
                <Button className="gap-2" onClick={() => navigate('/library')}>
                  <Compass className="h-4 w-4" aria-hidden="true" />
                  رفتن به کتابخانه
                </Button>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {data.watchlist.map((book) => (
                  <WatchlistBookCard key={book.id} book={book} />
                ))}
              </div>
            )}
          </section>

          {/* ⑥ سابقه‌ام چیست؟ */}
          <section className="space-y-3">
            <SectionHeading icon={Activity} accent="فعالیت">
              مطالعه
            </SectionHeading>
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="shadow-soft lg:col-span-2">
                <CardContent className="p-2 pl-3 pr-4 pt-6 sm:p-6">
                  <ActivityHeatmap days={data.heatmap} />
                </CardContent>
              </Card>

              <Card className="shadow-soft">
                <CardContent className="space-y-3 pt-6">
                  <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <CalendarDays className="h-4 w-4 text-accent-foreground" aria-hidden="true" />
                    مقایسه کتاب‌ها
                  </p>
                  <BookComparison books={data.watchlist} />
                </CardContent>
              </Card>
            </div>
          </section>
        </>
      )}
      </div>
    </div>
  )
}
