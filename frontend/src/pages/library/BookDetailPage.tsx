import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowRight,
  BookText,
  Check,
  GraduationCap,
  Layers,
  PenLine,
  UserRound,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { StartPlanDialog } from '@/components/library/StartPlanDialog'
import { useDiscoveryBooks } from '@/hooks/useDashboard'
import { useVolumes } from '@/hooks/useBooks'
import { usePlans } from '@/hooks/usePlans'
import { faNum } from '@/lib/format'
import {
  CATEGORY_META,
  getBookMeta,
  LEVEL_CLASS,
} from '@/lib/bookMeta'

export function BookDetailPage() {
  const { bookId = '' } = useParams()
  const navigate = useNavigate()

  const { data: books, isLoading, isError } = useDiscoveryBooks()
  const book = useMemo(() => books?.find((b) => b.id === bookId), [books, bookId])
  const { data: volumes, isLoading: volumesLoading } = useVolumes(bookId)
  const { data: plans } = usePlans()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [initialVolumeId, setInitialVolumeId] = useState<string | undefined>(undefined)

  const plannedVolumeIds = useMemo(
    () => new Set((plans ?? []).map((p) => p.volumeId)),
    [plans],
  )

  function openPlan(volumeId?: string) {
    setInitialVolumeId(volumeId)
    setDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div dir="rtl" className="font-persian mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-8 w-40 rounded-lg" />
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    )
  }

  if (isError || !book) {
    return (
      <div dir="rtl" className="font-persian mx-auto max-w-4xl space-y-6">
        <Card className="flex flex-col items-center gap-4 px-6 py-16 text-center">
          <BookText className="h-10 w-10 text-muted-foreground opacity-40" aria-hidden="true" />
          <p className="text-base font-medium text-foreground">این کتاب پیدا نشد.</p>
          <Button variant="outline" className="gap-2" onClick={() => navigate('/library')}>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            بازگشت به کتابخانه
          </Button>
        </Card>
      </div>
    )
  }

  const meta = getBookMeta(book.title)
  const category = CATEGORY_META[meta.category]
  const about = meta.about || book.description

  return (
    <div dir="rtl" className="font-persian mx-auto max-w-4xl space-y-8">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate('/library')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
        بازگشت به کاوش کتاب‌ها
      </button>

      {/* Hero */}
      <Card className="overflow-hidden">
        <div className="relative">
          {/* Soft brand gradient behind the header */}
          <div className="absolute inset-0 bg-gradient-to-bl from-primary/[0.08] via-transparent to-transparent" aria-hidden="true" />
          <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:gap-6">
            {book.coverImage ? (
              <img
                src={book.coverImage}
                alt={book.title}
                className="h-48 w-36 shrink-0 self-center rounded-xl object-cover shadow-md ring-1 ring-border sm:self-start"
              />
            ) : (
              <span className="flex h-48 w-36 shrink-0 items-center justify-center self-center rounded-xl bg-primary/10 text-primary sm:self-start">
                <BookText className="h-12 w-12" aria-hidden="true" />
              </span>
            )}

            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {category.title}
              </span>
              <h1 className="mt-3 text-2xl font-bold leading-tight text-foreground">{book.title}</h1>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                {meta.author !== '—' && (
                  <span className="inline-flex items-center gap-1.5">
                    <UserRound className="h-4 w-4" aria-hidden="true" />
                    {meta.author}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <BookText className="h-4 w-4" aria-hidden="true" />
                  {faNum(book.totalWords)} لغت
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold ${LEVEL_CLASS[meta.level]}`}
                >
                  سطح: {meta.level}
                </span>
                {book.inWatchlist && (
                  <Badge variant="success" className="gap-1">
                    <Check className="h-3 w-3" aria-hidden="true" />
                    در حال یادگیری
                  </Badge>
                )}
              </div>

              {about && (
                <p className="mt-4 text-[15px] leading-8 text-muted-foreground">{about}</p>
              )}

              <div className="mt-5">
                <Button className="gap-2" onClick={() => openPlan(undefined)}>
                  <GraduationCap className="h-4 w-4" aria-hidden="true" />
                  افزودن به برنامه‌ی روزانه
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Volumes */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Layers className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-foreground">جلدهای این کتاب</h2>
            <p className="text-sm text-muted-foreground">
              جلد دلخواهت را انتخاب کن و به برنامه‌ی روزانه اضافه کن.
            </p>
          </div>
        </div>

        {volumesLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {volumes?.map((v) => {
              const planned = plannedVolumeIds.has(v.id)
              const label = v.title ?? `جلد ${faNum(v.volumeNumber)}`
              return (
                <Card
                  key={v.id}
                  className="flex flex-col gap-3 p-4 shadow-soft transition-shadow hover:shadow-md"
                >
                  <div className="relative">
                    {v.coverImage ? (
                      <img
                        src={v.coverImage}
                        alt={label}
                        loading="lazy"
                        className="h-44 w-full rounded-lg object-cover ring-1 ring-border"
                      />
                    ) : (
                      <span className="flex h-44 w-full items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <BookText className="h-10 w-10" aria-hidden="true" />
                      </span>
                    )}
                    {planned && (
                      <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                        <Check className="h-3 w-3" />
                        در برنامه
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <Button
                    size="sm"
                    variant={planned ? 'outline' : 'default'}
                    className="mt-auto w-full gap-1.5"
                    onClick={() => openPlan(v.id)}
                  >
                    {planned ? (
                      <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {planned ? 'مدیریت برنامه' : 'افزودن به برنامه'}
                  </Button>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      <StartPlanDialog
        book={book}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialVolumeId={initialVolumeId}
      />
    </div>
  )
}
