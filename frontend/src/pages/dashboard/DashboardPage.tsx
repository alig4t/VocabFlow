import { useNavigate } from 'react-router-dom'
import { LayoutDashboard, CalendarDays, BarChart3, Library, Compass } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { GlobalStats } from '@/components/dashboard/GlobalStats'
import { WatchlistBookCard } from '@/components/dashboard/WatchlistBookCard'
import { ContinueLearning } from '@/components/dashboard/ContinueLearning'
import { ActivityHeatmap } from '@/components/dashboard/ActivityHeatmap'
import { BookComparison } from '@/components/dashboard/BookComparison'
import { useDashboard } from '@/hooks/useDashboard'
import { useAuthStore } from '@/store/authStore'

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-[76px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-28 rounded-2xl" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-72 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { data, isLoading, isError } = useDashboard()

  return (
    <div dir="rtl" className="font-persian mx-auto max-w-6xl space-y-6">
      {/* Greeting header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <LayoutDashboard className="h-6 w-6 text-primary" aria-hidden="true" />
            {user ? `سلام ${user.name} 👋` : 'داشبورد'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            خلاصه‌ای از مسیر یادگیری شخصی شما
          </p>
        </div>
        <Button variant="outline" className="gap-2 self-start sm:self-auto" onClick={() => navigate('/library')}>
          <Compass className="h-4 w-4" aria-hidden="true" />
          کاوش کتاب‌ها
        </Button>
      </header>

      {isLoading ? (
        <DashboardSkeleton />
      ) : isError || !data ? (
        <Card className="px-6 py-12 text-center">
          <p className="text-sm font-medium text-destructive">خطا در بارگذاری داشبورد.</p>
          <p className="mt-1 text-xs text-muted-foreground">لطفاً بعداً دوباره تلاش کنید.</p>
        </Card>
      ) : (
        <>
          {/* Global stats */}
          <GlobalStats stats={data.stats} />

          {/* Smart review queue */}
          <ContinueLearning queue={data.queue} />

          {/* Watchlist */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <Library className="h-5 w-5 text-primary" aria-hidden="true" />
                کتاب‌های من
              </h2>
            </div>

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

          {/* Analytics: heatmap + comparison */}
          <section className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" />
                  فعالیت مطالعه
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ActivityHeatmap days={data.heatmap} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-5 w-5 text-primary" aria-hidden="true" />
                  مقایسه کتاب‌ها
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BookComparison books={data.watchlist} />
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  )
}
