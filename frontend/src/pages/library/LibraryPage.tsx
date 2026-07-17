import { useMemo, useState } from 'react'
import { Compass, BookOpen, Search, X, BookText, Combine, MessagesSquare } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DiscoveryBookCard } from '@/components/library/DiscoveryBookCard'
import { StartPlanDialog } from '@/components/library/StartPlanDialog'
import { useDiscoveryBooks } from '@/hooks/useDashboard'
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  getBookMeta,
  type BookCategory,
} from '@/lib/bookMeta'
import type { DiscoveryBook } from '@/types'

const CATEGORY_ICON: Record<BookCategory, React.ReactNode> = {
  words: <BookText className="h-5 w-5" aria-hidden="true" />,
  collocations: <Combine className="h-5 w-5" aria-hidden="true" />,
  phrasal: <MessagesSquare className="h-5 w-5" aria-hidden="true" />,
}

export function LibraryPage() {
  const { data: books, isLoading, isError } = useDiscoveryBooks()
  const [dialogBook, setDialogBook] = useState<DiscoveryBook | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [query, setQuery] = useState('')

  function handleStartPlan(book: DiscoveryBook) {
    setDialogBook(book)
    setDialogOpen(true)
  }

  // Filter by title / author / description, then bucket into category sections.
  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = (books ?? []).filter((b) => {
      if (!q) return true
      const meta = getBookMeta(b.title)
      return (
        b.title.toLowerCase().includes(q) ||
        meta.author.toLowerCase().includes(q) ||
        (b.description ?? '').toLowerCase().includes(q) ||
        meta.about.toLowerCase().includes(q)
      )
    })
    const map = new Map<BookCategory, DiscoveryBook[]>()
    for (const b of filtered) {
      const cat = getBookMeta(b.title).category
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(b)
    }
    return map
  }, [books, query])

  const totalShown = useMemo(
    () => [...grouped.values()].reduce((s, arr) => s + arr.length, 0),
    [grouped],
  )

  return (
    <div dir="rtl" className="font-persian mx-auto max-w-6xl space-y-8">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
          <Compass className="h-6 w-6 text-primary" aria-hidden="true" />
          کاوش کتاب‌ها
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          کتاب‌ها را بر اساس دسته‌بندی کاوش کن و جلد دلخواهت را به برنامه‌ی روزانه اضافه کن.
        </p>
      </header>

      {/* Search — quiet, understated, elevates on focus */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60"
          aria-hidden="true"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جستجوی کتاب، نویسنده یا موضوع…"
          aria-label="جستجوی کتاب‌ها"
          className="h-11 w-full rounded-xl border border-border/70 bg-muted/30 pr-10 pl-10 text-sm text-foreground shadow-soft outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/40 focus:bg-background focus:ring-2 focus:ring-primary/15"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="پاک کردن جستجو"
            className="absolute left-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : isError || !books ? (
        <Card className="px-6 py-12 text-center">
          <p className="text-sm font-medium text-destructive">خطا در بارگذاری کتاب‌ها.</p>
          <p className="mt-1 text-xs text-muted-foreground">لطفاً بعداً دوباره تلاش کنید.</p>
        </Card>
      ) : totalShown === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground opacity-40" aria-hidden="true" />
          <p className="text-base font-medium text-foreground">
            {query ? 'کتابی با این جستجو پیدا نشد' : 'کتابی موجود نیست'}
          </p>
        </Card>
      ) : (
        <div className="space-y-10">
          {CATEGORY_ORDER.map((cat) => {
            const items = grouped.get(cat)
            if (!items || items.length === 0) return null
            const info = CATEGORY_META[cat]
            return (
              <section key={cat} className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {CATEGORY_ICON[cat]}
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-foreground">{info.title}</h2>
                    <p className="mt-0.5 text-sm leading-6 text-muted-foreground">
                      {info.subtitle}
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((book) => (
                    <DiscoveryBookCard key={book.id} book={book} onStartPlan={handleStartPlan} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <StartPlanDialog book={dialogBook} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
