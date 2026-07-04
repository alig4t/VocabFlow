import { useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BookOpen, CheckCircle2, XCircle, Eye, ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WordCard } from '@/components/vocabulary/WordCard'
import { WordFilters, type WordFiltersState } from '@/components/vocabulary/WordFilters'
import { useWords } from '@/hooks/useVocabulary'
import { useProgressStats } from '@/hooks/useProgress'
import {
  parseVocabParams,
  serializeVocabParams,
  toApiFilters,
  VOCAB_PARAMS_STORAGE_KEY,
} from '@/lib/vocabFilters'

const LIMIT = 20

function SkeletonCard() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-6 w-32 rounded bg-muted" />
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="h-3 w-48 rounded bg-muted" />
        </div>
        <div className="h-5 w-16 rounded-full bg-muted" />
      </div>
      <div className="flex gap-2 pt-1">
        <div className="h-7 w-16 rounded bg-muted" />
        <div className="h-7 w-20 rounded bg-muted" />
      </div>
    </div>
  )
}

export function VocabularyPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // On first mount with an empty query string, restore the last-used filters
  // from localStorage so returning to the page resumes where you left off.
  const didRestore = useRef(false)
  useEffect(() => {
    if (didRestore.current) return
    didRestore.current = true
    if (searchParams.toString() === '') {
      try {
        const saved = localStorage.getItem(VOCAB_PARAMS_STORAGE_KEY)
        if (saved) setSearchParams(new URLSearchParams(saved), { replace: true })
      } catch {
        // ignore
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // URL is the single source of truth for filters + page.
  const { filters, page } = parseVocabParams(searchParams)

  // Persist the current query string (and review mode) for the next visit.
  useEffect(() => {
    const qs = searchParams.toString()
    try {
      if (qs) localStorage.setItem(VOCAB_PARAMS_STORAGE_KEY, qs)
      localStorage.setItem('vocab_review_mode', filters.mode)
    } catch {
      // ignore
    }
  }, [searchParams, filters.mode])

  // Changing any filter resets to page 1 and pushes to the URL (applies immediately).
  const handleFiltersChange = useCallback(
    (newFilters: WordFiltersState) => {
      setSearchParams(serializeVocabParams(newFilters, 1))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [setSearchParams],
  )

  const apiFilters = toApiFilters(filters, page, LIMIT)

  const { data, isLoading, isError } = useWords(apiFilters)
  const { data: stats } = useProgressStats()

  const words = data?.data ?? []
  const meta = data?.meta
  const totalPages = meta?.totalPages ?? 1

  const currentStats = stats?.[filters.mode]

  function goToPage(p: number) {
    setSearchParams(serializeVocabParams(filters, p))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function renderPageButtons() {
    if (totalPages <= 1) return null
    const pages: (number | '...')[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (page > 3) pages.push('...')
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i)
      }
      if (page < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }

    return (
      <div className="flex items-center gap-1 flex-wrap justify-center">
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          disabled={page === 1}
          onClick={() => goToPage(page - 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground text-sm">
              ...
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'default' : 'outline'}
              size="icon"
              className="h-9 w-9 text-sm"
              onClick={() => goToPage(p as number)}
            >
              {p}
            </Button>
          ),
        )}

        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          disabled={page === totalPages}
          onClick={() => goToPage(page + 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div dir="rtl" className="font-persian max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            ۴۰۰۰ لغت ضروری انگلیسی
          </h1>
          {meta && (
            <p className="text-sm text-muted-foreground mt-1">
              {meta.total.toLocaleString()} لغت در مجموع
            </p>
          )}
        </div>
        <Button
          onClick={() =>
            navigate(`/vocabulary/review?${serializeVocabParams(filters, 1).toString()}`)
          }
          className="gap-2 self-start sm:self-auto"
        >
          <LayoutGrid className="h-4 w-4" />
          شروع مرور
        </Button>
      </div>

      {/* Stats bar */}
      {currentStats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-3 min-w-0 overflow-hidden">
            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">یاد گرفتم</p>
              <p className="text-base sm:text-xl font-bold text-foreground tabular-nums truncate">
                {currentStats.KNOWN.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-3 min-w-0 overflow-hidden">
            <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">یاد نگرفتم</p>
              <p className="text-base sm:text-xl font-bold text-foreground tabular-nums truncate">
                {currentStats.NOT_KNOWN.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-3 min-w-0 overflow-hidden">
            <Eye className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">نخوانده</p>
              <p className="text-base sm:text-xl font-bold text-foreground tabular-nums truncate">
                {currentStats.NOT_READ.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-lg border border-border bg-card p-4">
        <WordFilters filters={filters} onChange={handleFiltersChange} />
      </div>

      {/* Word list */}
      {isLoading ? (
        <div className="grid gap-3">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
          <p className="text-sm text-destructive font-medium">خطا در بارگذاری لغات.</p>
          <p className="text-xs text-muted-foreground mt-1">لطفاً بعداً دوباره تلاش کنید.</p>
        </div>
      ) : words.length === 0 ? (
        <div className="rounded-lg border border-border bg-card px-6 py-16 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-base font-medium text-foreground">لغتی یافت نشد</p>
          <p className="text-sm text-muted-foreground mt-1">
            فیلترها یا عبارت جستجو را تغییر دهید.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {words.map((word) => (
            <WordCard key={word.id} word={word} mode={filters.mode} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && words.length > 0 && (
        <div className="flex flex-col items-center gap-3 pt-2">
          {renderPageButtons()}
          {meta && (
            <p className="text-xs text-muted-foreground">
              نمایش {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, meta.total)} از{' '}
              {meta.total.toLocaleString()} لغت
            </p>
          )}
        </div>
      )}
    </div>
  )
}
