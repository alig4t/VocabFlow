import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ReviewCard } from '@/components/vocabulary/ReviewCard'
import { useWords } from '@/hooks/useVocabulary'
import { useUpdateWordStatus, useWordStatus } from '@/hooks/useProgress'
import { cn } from '@/lib/utils'
import { parseVocabParams } from '@/lib/vocabFilters'
import type { ReviewMode, WordStatus, Word } from '@/types'

type ReviewFilter = 'ALL' | 'NOT_READ' | 'NOT_KNOWN'

function loadPersistedMode(): ReviewMode {
  try {
    const val = localStorage.getItem('vocab_review_mode')
    if (val === 'EN_TO_FA' || val === 'FA_TO_EN') return val
  } catch {
    // ignore
  }
  return 'EN_TO_FA'
}

/** Map a vocabulary status param to the review page's filter options. */
function statusToReviewFilter(status: WordStatus | 'ALL'): ReviewFilter {
  if (status === 'NOT_READ') return 'NOT_READ'
  if (status === 'NOT_KNOWN') return 'NOT_KNOWN'
  return 'ALL'
}

function StatusLabel({ status }: { status: string }) {
  if (status === 'KNOWN')
    return <span className="text-xs font-semibold text-green-600 dark:text-green-400">یاد گرفتم</span>
  if (status === 'NOT_KNOWN')
    return <span className="text-xs font-semibold text-red-600 dark:text-red-400">یاد نگرفتم</span>
  return <span className="text-xs font-semibold text-muted-foreground">نخوانده</span>
}

interface ReviewWordRowProps {
  word: Word
  mode: ReviewMode
  onKnown: () => void
  onNotKnown: () => void
  onSkip: () => void
  isPending: boolean
}

function ReviewActions({ word, mode, onKnown, onNotKnown, onSkip, isPending }: ReviewWordRowProps) {
  const status = useWordStatus(word, mode)

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Current status */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span>وضعیت:</span>
        <StatusLabel status={status} />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={onNotKnown}
          disabled={isPending}
          className={cn(
            'px-6 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all duration-150',
            status === 'NOT_KNOWN'
              ? 'bg-red-500 text-white border-red-500 shadow-md'
              : 'border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30',
            isPending && 'opacity-50 cursor-not-allowed',
          )}
        >
          یاد نگرفتم
        </button>

        <button
          onClick={onSkip}
          disabled={isPending}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground border border-border hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <SkipForward className="h-4 w-4" />
          رد کردن
        </button>

        <button
          onClick={onKnown}
          disabled={isPending}
          className={cn(
            'px-6 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all duration-150',
            status === 'KNOWN'
              ? 'bg-green-500 text-white border-green-500 shadow-md'
              : 'border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/30',
            isPending && 'opacity-50 cursor-not-allowed',
          )}
        >
          یاد گرفتم
        </button>
      </div>
    </div>
  )
}

export function ReviewPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // Seed the session from URL params carried over from the vocabulary page,
  // so "continue review" opens the same book/mode/status scope.
  const initial = useMemo(() => parseVocabParams(searchParams), [searchParams])

  const [mode, setMode] = useState<ReviewMode>(() =>
    searchParams.get('mode') ? initial.filters.mode : loadPersistedMode(),
  )
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>(() =>
    searchParams.has('status') ? statusToReviewFilter(initial.filters.status) : 'NOT_READ',
  )
  const [currentIndex, setCurrentIndex] = useState(0)

  const { mutate: updateStatus, isPending } = useUpdateWordStatus()

  // Fetch all words matching the filter (no pagination — review needs full list)
  const apiStatus: WordStatus | undefined =
    reviewFilter === 'NOT_READ'
      ? 'NOT_READ'
      : reviewFilter === 'NOT_KNOWN'
        ? 'NOT_KNOWN'
        : undefined

  const { data, isLoading, isError } = useWords({
    limit: 500,
    page: 1,
    mode,
    status: apiStatus,
    sort: 'chapter',
    order: 'asc',
    // Scope to the same book/volume/lesson the user was filtering by, if any.
    bookId: initial.filters.bookId,
    volumeId: initial.filters.volumeId,
    lessonId: initial.filters.lessonId,
    chapter: initial.filters.chapter,
  })

  const words = data?.data ?? []
  const total = words.length

  // Clamp index when word list changes
  useEffect(() => {
    setCurrentIndex(0)
  }, [mode, reviewFilter])

  const currentWord = words[currentIndex] ?? null

  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, total - 1))
  }, [total])

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0))
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      // Don't interfere with inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [goNext, goPrev])

  function handleModeChange(newMode: ReviewMode) {
    setMode(newMode)
    try {
      localStorage.setItem('vocab_review_mode', newMode)
    } catch {
      // ignore
    }
  }

  function handleKnown() {
    if (!currentWord || isPending) return
    updateStatus(
      { wordId: currentWord.id, reviewMode: mode, status: 'KNOWN' },
      { onSuccess: () => goNext() },
    )
  }

  function handleNotKnown() {
    if (!currentWord || isPending) return
    updateStatus(
      { wordId: currentWord.id, reviewMode: mode, status: 'NOT_KNOWN' },
      { onSuccess: () => goNext() },
    )
  }

  function handleSkip() {
    goNext()
  }

  const progressPercent = total > 0 ? Math.round(((currentIndex + 1) / total) * 100) : 0

  return (
    <div dir="rtl" className="font-persian max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/vocabulary')}
          className="flex-shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">حالت مرور</h1>
          <p className="text-sm text-muted-foreground">
            برای جابجایی از کلیدهای جهت‌نما استفاده کنید، Space برای برگرداندن کارت
          </p>
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Mode toggle */}
        <div className="flex items-center gap-1 bg-muted rounded-full p-1">
          <button
            onClick={() => handleModeChange('EN_TO_FA')}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
              mode === 'EN_TO_FA'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            EN → FA
          </button>
          <button
            onClick={() => handleModeChange('FA_TO_EN')}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
              mode === 'FA_TO_EN'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            FA → EN
          </button>
        </div>

        {/* Review filter */}
        <div className="flex items-center gap-1">
          {(
            [
              { label: 'همه لغات', value: 'ALL' },
              { label: 'نخوانده', value: 'NOT_READ' },
              { label: 'یاد نگرفتم', value: 'NOT_KNOWN' },
            ] as { label: string; value: ReviewFilter }[]
          ).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setReviewFilter(opt.value)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium border transition-all duration-200',
                reviewFilter === opt.value
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-background text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Progress bar + counter */}
      {!isLoading && total > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              لغت{' '}
              <span className="font-semibold text-foreground">{currentIndex + 1}</span>
              {' '}از{' '}
              <span className="font-semibold text-foreground">{total}</span>
            </span>
            <span className="text-muted-foreground">{progressPercent}٪</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Main content area */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="space-y-3 w-full max-w-2xl">
            <div className="h-64 rounded-2xl bg-muted animate-pulse" />
          </div>
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
          <p className="text-sm text-destructive font-medium">خطا در بارگذاری لغات.</p>
        </div>
      ) : total === 0 ? (
        <div className="rounded-2xl border border-border bg-card px-6 py-16 text-center space-y-3">
          <p className="text-lg font-semibold text-foreground">لغتی برای مرور وجود ندارد</p>
          <p className="text-sm text-muted-foreground">
            {reviewFilter === 'NOT_READ'
              ? 'آفرین! همه لغات این حالت را خواندید.'
              : reviewFilter === 'NOT_KNOWN'
                ? 'لغت «یاد نگرفتم» در این حالت ندارید. ادامه بدید!'
                : 'لغتی یافت نشد.'}
          </p>
          <Button variant="outline" onClick={() => setReviewFilter('ALL')} className="mt-2">
            نمایش همه لغات
          </Button>
        </div>
      ) : currentWord ? (
        <>
          {/* Review flashcard — key forces remount (and flip reset) on word change */}
          <ReviewCard key={currentWord.id + mode} word={currentWord} mode={mode} />

          {/* Navigation + action buttons */}
          <div className="flex flex-col items-center gap-6">
            {/* Prev / Next navigation — in RTL: ChevronRight for previous, ChevronLeft for next */}
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-full"
                disabled={currentIndex === 0}
                onClick={goPrev}
                title="قبلی (←)"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>

              <span className="text-sm text-muted-foreground min-w-[80px] text-center">
                {currentIndex + 1} / {total}
              </span>

              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-full"
                disabled={currentIndex === total - 1}
                onClick={goNext}
                title="بعدی (→)"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </div>

            {/* Status action buttons */}
            <ReviewActions
              word={currentWord}
              mode={mode}
              onKnown={handleKnown}
              onNotKnown={handleNotKnown}
              onSkip={handleSkip}
              isPending={isPending}
            />

            {/* Keyboard hint */}
            <p className="text-xs text-muted-foreground">
              <kbd className="px-1.5 py-0.5 rounded border border-border font-mono text-xs">→</kbd>
              {' '}قبلی{' '}
              <kbd className="px-1.5 py-0.5 rounded border border-border font-mono text-xs ml-2">←</kbd>
              {' '}بعدی{' '}
              <kbd className="px-1.5 py-0.5 rounded border border-border font-mono text-xs ml-2">Space</kbd>
              {' '}برگرداندن
            </p>
          </div>
        </>
      ) : null}
    </div>
  )
}
