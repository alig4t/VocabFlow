import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ReviewCard } from '@/components/vocabulary/ReviewCard'
import { useWords } from '@/hooks/useVocabulary'
import { useUpdateWordStatus, useWordStatus } from '@/hooks/useProgress'
import { useVolumesSimple, useLessonsSimple } from '@/hooks/useBooks'
import { useWatchlistBooks } from '@/hooks/useDashboard'
import { cn } from '@/lib/utils'
import { parseVocabParams } from '@/lib/vocabFilters'
import type { ReviewMode, WordStatus, Word } from '@/types'

const SELECT_CLASS = 'select-field w-auto min-w-[9rem] cursor-pointer'

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
}

function ReviewActions({ word, mode, onKnown, onNotKnown, onSkip }: ReviewWordRowProps) {
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
          className={cn(
            'px-6 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all duration-150',
            status === 'NOT_KNOWN'
              ? 'bg-red-500 text-white border-red-500 shadow-md'
              : 'border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30',
          )}
        >
          یاد نگرفتم
        </button>

        <button
          onClick={onSkip}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground border border-border hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <SkipForward className="h-4 w-4" />
          رد کردن
        </button>

        <button
          onClick={onKnown}
          className={cn(
            'px-6 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all duration-150',
            status === 'KNOWN'
              ? 'bg-green-500 text-white border-green-500 shadow-md'
              : 'border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/30',
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
  // Whether the current card shows the translation (controlled here so Space can toggle it).
  const [flipped, setFlipped] = useState(false)

  // Book/volume/lesson scope — seeded from the URL, but editable in-page via the selectors.
  const [bookId, setBookId] = useState<string | undefined>(initial.filters.bookId)
  const [volumeId, setVolumeId] = useState<string | undefined>(initial.filters.volumeId)
  const [lessonId, setLessonId] = useState<string | undefined>(initial.filters.lessonId)

  // Only books in the user's watchlist are selectable for review.
  const { data: books } = useWatchlistBooks()
  const { data: volumes } = useVolumesSimple(bookId ?? '')
  const { data: lessons } = useLessonsSimple(bookId ?? '', volumeId ?? '')

  function handleBookChange(id: string) {
    setBookId(id || undefined)
    setVolumeId(undefined)
    setLessonId(undefined)
  }

  function handleVolumeChange(id: string) {
    setVolumeId(id || undefined)
    setLessonId(undefined)
  }

  const { mutate: updateStatus } = useUpdateWordStatus()

  // Fetch all words matching the filter (no pagination — review needs full list)
  const apiStatus: WordStatus | undefined =
    reviewFilter === 'NOT_READ'
      ? 'NOT_READ'
      : reviewFilter === 'NOT_KNOWN'
        ? 'NOT_KNOWN'
        : undefined

  const watchlistBookIds = books?.map((b) => b.id) ?? []
  const isWatchlistLoading = books === undefined
  // Review is always scoped to the watchlist: a specific book, or the whole list.
  // With no watchlist and no pinned book, there is nothing to review.
  const hasScope = Boolean(bookId) || watchlistBookIds.length > 0

  // A review session runs on a FROZEN snapshot of the matching words. Marking a
  // word updates its status in place (and on the server) but never drops it from
  // the list mid-session, so the counter advances one step per action
  // (۱/۵۰۰ → ۲/۵۰۰ → …) instead of collapsing words off the front of the list.
  const sessionKey = `${mode}|${reviewFilter}|${bookId ?? ''}|${volumeId ?? ''}|${lessonId ?? ''}`
  const [session, setSession] = useState<{ key: string; words: Word[] }>({ key: '', words: [] })
  const sessionReady = hasScope && session.key === sessionKey

  const { data, isError } = useWords(
    {
      limit: 500,
      page: 1,
      mode,
      status: apiStatus,
      sort: 'chapter',
      order: 'asc',
      // Scope to the selected book/volume/lesson; with no single book chosen,
      // fall back to the union of the user's whole watchlist.
      bookId,
      bookIds: bookId ? undefined : watchlistBookIds.length > 0 ? watchlistBookIds : undefined,
      volumeId,
      lessonId,
      chapter: undefined,
    },
    // Fetch only until the snapshot is frozen; status updates must not refetch
    // and reshuffle the list under the user.
    { enabled: hasScope && !sessionReady },
  )

  // Freeze the fetched list as the session snapshot when a new session's data lands.
  useEffect(() => {
    if (hasScope && session.key !== sessionKey && data?.data) {
      setSession({ key: sessionKey, words: data.data })
      setCurrentIndex(0)
      setFlipped(false)
    }
  }, [hasScope, sessionKey, session.key, data])

  const words = sessionReady ? session.words : []
  const total = words.length
  const isLoading = isWatchlistLoading || (hasScope && !sessionReady)

  const currentWord = words[currentIndex] ?? null

  // Move the card to another word, always landing on the front face. Resetting
  // `flipped` synchronously (batched with the index change) — combined with the
  // `key` remount on the card — means the next word never shows its back mid-flip,
  // so you can't glimpse the next translation.
  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, total - 1))
    setFlipped(false)
  }, [total])

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0))
    setFlipped(false)
  }, [])

  const toggleFlip = useCallback(() => {
    setFlipped((f) => !f)
  }, [])

  const markStatus = useCallback(
    (status: 'KNOWN' | 'NOT_KNOWN') => {
      if (!currentWord) return
      const wordId = currentWord.id
      // Update the card's status in the frozen session list (badge updates in
      // place) + persist to the server, then advance one step. The word stays
      // put, so the counter moves 1→2→… instead of collapsing off the front.
      setSession((s) => ({
        key: s.key,
        words: s.words.map((w) =>
          w.id === wordId
            ? {
                ...w,
                progress: [
                  ...(w.progress ?? []).filter((p) => p.reviewMode !== mode),
                  { id: '', userId: '', wordId, reviewMode: mode, status },
                ],
              }
            : w,
        ),
      }))
      updateStatus({ wordId, reviewMode: mode, status })
      goNext()
    },
    [currentWord, mode, updateStatus, goNext],
  )

  const handleKnown = useCallback(() => markStatus('KNOWN'), [markStatus])
  const handleNotKnown = useCallback(() => markStatus('NOT_KNOWN'), [markStatus])

  // Keyboard shortcuts: ← → navigate, Space flips, ↑ = بلدم, ↓ = بلد نیستم.
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      // Don't interfere with inputs / form controls (e.g. the book selectors)
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return

      if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      } else if (e.key === ' ' || e.code === 'Space') {
        // Space reveals/hides the translation. preventDefault stops page scroll
        // and any focused-button activation.
        e.preventDefault()
        toggleFlip()
      } else if (e.key === 'ArrowUp') {
        // ↑ = یاد گرفتم (known)
        e.preventDefault()
        handleKnown()
      } else if (e.key === 'ArrowDown') {
        // ↓ = یاد نگرفتم (not known)
        e.preventDefault()
        handleNotKnown()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [goNext, goPrev, toggleFlip, handleKnown, handleNotKnown])

  function handleModeChange(newMode: ReviewMode) {
    setMode(newMode)
    setFlipped(false)
    try {
      localStorage.setItem('vocab_review_mode', newMode)
    } catch {
      // ignore
    }
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
            ← → جابجایی، Space برگرداندن کارت، ↑ بلدم، ↓ بلد نیستم
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

      {/* Book → Volume → Lesson scope selectors (limited to the user's watchlist) */}
      {books && books.length > 0 && (
        <div className="flex flex-wrap gap-3 items-center">
          {/* Book */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground whitespace-nowrap">کتاب:</label>
            <select
              value={bookId ?? ''}
              onChange={(e) => handleBookChange(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">همه کتاب‌های لیست من</option>
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </div>

          {/* Volume — only when a book is selected */}
          {bookId && volumes && volumes.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground whitespace-nowrap">جلد:</label>
              <select
                value={volumeId ?? ''}
                onChange={(e) => handleVolumeChange(e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">همه جلدها</option>
                {volumes.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.title ?? `جلد ${v.volumeNumber}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Lesson — only when a volume is selected */}
          {volumeId && lessons && lessons.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground whitespace-nowrap">درس:</label>
              <select
                value={lessonId ?? ''}
                onChange={(e) => setLessonId(e.target.value || undefined)}
                className={SELECT_CLASS}
              >
                <option value="">همه درس‌ها</option>
                {lessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title ?? `درس ${l.lessonNumber}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

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
      ) : !hasScope ? (
        <div className="rounded-2xl border border-border bg-card px-6 py-16 text-center space-y-3">
          <p className="text-lg font-semibold text-foreground">لیست یادگیری شما خالی است</p>
          <p className="text-sm text-muted-foreground">
            برای شروع مرور، ابتدا از کتابخانه یک یا چند کتاب به لیست یادگیری‌تان اضافه کنید.
          </p>
          <Button variant="outline" onClick={() => navigate('/library')} className="mt-2">
            رفتن به کتابخانه
          </Button>
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
          {/* Review flashcard — `key` remounts it fresh (front face, no flip-back
              animation) whenever the word or mode changes, so the next card's
              translation is never briefly visible. */}
          <ReviewCard
            key={currentWord.id + mode}
            word={currentWord}
            mode={mode}
            flipped={flipped}
            onToggle={toggleFlip}
          />

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
            />

            {/* Keyboard hint */}
            <p className="text-xs text-muted-foreground">
              <kbd className="px-1.5 py-0.5 rounded border border-border font-mono text-xs">→</kbd>
              {' '}قبلی{' '}
              <kbd className="px-1.5 py-0.5 rounded border border-border font-mono text-xs ml-2">←</kbd>
              {' '}بعدی{' '}
              <kbd className="px-1.5 py-0.5 rounded border border-border font-mono text-xs ml-2">Space</kbd>
              {' '}برگرداندن{' '}
              <kbd className="px-1.5 py-0.5 rounded border border-border font-mono text-xs ml-2">↑</kbd>
              {' '}بلدم{' '}
              <kbd className="px-1.5 py-0.5 rounded border border-border font-mono text-xs ml-2">↓</kbd>
              {' '}بلد نیستم
            </p>
          </div>
        </>
      ) : null}
    </div>
  )
}
