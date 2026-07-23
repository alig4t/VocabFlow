import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Volume2, VolumeX, SquarePen, BookMarked } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ReviewCard } from '@/components/vocabulary/ReviewCard'
import { useWords } from '@/hooks/useVocabulary'
import { useUpdateWordStatus, useWordStatus } from '@/hooks/useProgress'
import { useVolumesSimple, useLessonsSimple } from '@/hooks/useBooks'
import { useWatchlistBooks } from '@/hooks/useDashboard'
import { cn } from '@/lib/utils'
import { isNative } from '@/lib/platform'
import { parseVocabParams } from '@/lib/vocabFilters'
import { playPronunciation, stopPronunciation, warmUpPronunciation } from '@/lib/pronounce'
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

function loadPersistedMuted(): boolean {
  try {
    return localStorage.getItem('vocab_review_muted') === '1'
  } catch {
    return false
  }
}

function loadPersistedFilter(): ReviewFilter {
  try {
    const val = localStorage.getItem('vocab_review_filter')
    if (val === 'ALL' || val === 'NOT_READ' || val === 'NOT_KNOWN') return val
  } catch {
    // ignore
  }
  return 'NOT_READ'
}

/** The last book/volume/lesson scope the user reviewed, remembered across visits. */
function loadPersistedScope(): { bookId?: string; volumeId?: string; lessonId?: string } {
  try {
    const raw = localStorage.getItem('vocab_review_scope')
    if (raw) {
      const p = JSON.parse(raw) as { bookId?: string; volumeId?: string; lessonId?: string }
      return {
        bookId: p.bookId || undefined,
        volumeId: p.volumeId || undefined,
        lessonId: p.lessonId || undefined,
      }
    }
  } catch {
    // ignore
  }
  return {}
}

/** Map a vocabulary status param to the review page's filter options. */
function statusToReviewFilter(status: WordStatus | 'ALL'): ReviewFilter {
  if (status === 'NOT_READ') return 'NOT_READ'
  if (status === 'NOT_KNOWN') return 'NOT_KNOWN'
  return 'ALL'
}

interface ReviewWordRowProps {
  word: Word
  mode: ReviewMode
  onKnown: () => void
  onNotKnown: () => void
  onSkip: () => void
}

/** Compact horizontal action group. The active state is shown by the highlighted button. */
function ReviewActions({ word, mode, onKnown, onNotKnown, onSkip }: ReviewWordRowProps) {
  const status = useWordStatus(word, mode)

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <button
        onClick={onNotKnown}
        aria-pressed={status === 'NOT_KNOWN'}
        className={cn(
          'min-w-0 flex-1 whitespace-nowrap px-2 py-2 rounded-lg text-sm font-semibold border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400',
          status === 'NOT_KNOWN'
            ? 'bg-red-500 text-white border-red-500 shadow-sm'
            : 'border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40',
        )}
      >
        نگرفتم
      </button>

      <button
        onClick={onSkip}
        className="min-w-0 flex-1 whitespace-nowrap px-2 py-2 rounded-lg text-sm font-medium text-muted-foreground border border-border hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        رد
      </button>

      <button
        onClick={onKnown}
        aria-pressed={status === 'KNOWN'}
        className={cn(
          'min-w-0 flex-1 whitespace-nowrap px-2 py-2 rounded-lg text-sm font-semibold border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400',
          status === 'KNOWN'
            ? 'bg-green-500 text-white border-green-500 shadow-sm'
            : 'border-green-300 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950/40',
        )}
      >
        گرفتم
      </button>
    </div>
  )
}

// Remembers the last review position (per filter scope) so returning to the
// page — after editing a word or visiting another page — resumes where you were.
let lastReviewPos: { key: string; index: number } | null = null

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
    searchParams.has('status') ? statusToReviewFilter(initial.filters.status) : loadPersistedFilter(),
  )
  const [currentIndex, setCurrentIndex] = useState(0)
  // Whether the current card shows the translation (controlled here so Space can toggle it).
  const [flipped, setFlipped] = useState(false)
  // Global sound switch. When muted, no pronunciation plays (auto or manual).
  const [muted, setMuted] = useState<boolean>(loadPersistedMuted)

  // Book/volume/lesson scope — editable in-page via the selectors. Seeded from
  // the URL when arriving via "continue review" (authoritative); otherwise
  // restored from the last scope the user reviewed (persisted in localStorage).
  const persistedScope = useMemo(() => loadPersistedScope(), [])
  const urlHasScope = searchParams.has('bookId')
  const [bookId, setBookId] = useState<string | undefined>(
    urlHasScope ? initial.filters.bookId : persistedScope.bookId,
  )
  const [volumeId, setVolumeId] = useState<string | undefined>(
    urlHasScope ? initial.filters.volumeId : persistedScope.volumeId,
  )
  const [lessonId, setLessonId] = useState<string | undefined>(
    urlHasScope ? initial.filters.lessonId : persistedScope.lessonId,
  )

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

  const { data, isError, isFetching } = useWords(
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

  // Freeze the fetched list as the session snapshot when a new session's data
  // lands. Wait until the query is no longer fetching so we never freeze STALE
  // cached data (which would show outdated known/not-known statuses on return).
  useEffect(() => {
    if (hasScope && session.key !== sessionKey && data?.data && !isFetching) {
      setSession({ key: sessionKey, words: data.data })
      const saved = lastReviewPos?.key === sessionKey ? lastReviewPos.index : 0
      setCurrentIndex(Math.min(Math.max(0, saved), Math.max(0, data.data.length - 1)))
      setFlipped(false)
    }
  }, [hasScope, sessionKey, session.key, data, isFetching])

  // Remember the current position so we can resume it when the page remounts.
  useEffect(() => {
    if (sessionReady) lastReviewPos = { key: sessionKey, index: currentIndex }
  }, [sessionReady, sessionKey, currentIndex])

  // Persist the review filter + book/volume/lesson scope so the next visit to
  // this page restores the same filters the user last set.
  useEffect(() => {
    try {
      localStorage.setItem('vocab_review_filter', reviewFilter)
    } catch {
      // ignore
    }
  }, [reviewFilter])

  useEffect(() => {
    try {
      localStorage.setItem('vocab_review_scope', JSON.stringify({ bookId, volumeId, lessonId }))
    } catch {
      // ignore
    }
  }, [bookId, volumeId, lessonId])

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

  // Play the current word's English pronunciation on demand (both review modes),
  // unless sound is muted.
  const pronounce = useCallback(() => {
    if (muted || !currentWord) return
    playPronunciation(currentWord)
  }, [muted, currentWord])

  function toggleMuted() {
    setMuted((m) => {
      const next = !m
      try {
        localStorage.setItem('vocab_review_muted', next ? '1' : '0')
      } catch {
        // ignore
      }
      if (next) stopPronunciation()
      return next
    })
  }

  // Auto-play pronunciation when entering a new word — only in EN→FA mode and
  // only when not muted. Triggers on word change (not on mute/mode toggles).
  useEffect(() => {
    if (!muted && mode === 'EN_TO_FA' && currentWord) {
      playPronunciation(currentWord)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWord?.id])

  // Stop any audio when leaving the review page.
  useEffect(() => {
    warmUpPronunciation()
    return () => stopPronunciation()
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
                  // Manual free-review mark (separate from the SM-2 program).
                  { id: '', userId: '', wordId, reviewMode: mode, status: 'NOT_READ', manualStatus: status },
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
      } else if (e.key === 'p' || e.key === 'P') {
        // P = پخش تلفظ انگلیسی (هر دو حالت)
        e.preventDefault()
        pronounce()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [goNext, goPrev, toggleFlip, handleKnown, handleNotKnown, pronounce])

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
    <div dir="rtl" className="font-persian max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-4">
      {/* Free-review banner — a SEPARATE track from "Study Today" (SM-2). */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/70 p-3 dark:border-blue-900/50 dark:bg-blue-950/30">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-300">
          <BookMarked className="h-5 w-5" />
        </span>
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-bold text-blue-900 dark:text-blue-200">مرور آزاد — مسیری جدا از برنامه</p>
          <p className="text-xs leading-relaxed text-blue-800/90 dark:text-blue-300/90">
            اینجا فقط واژه‌ها را «بلدم / بلد نیستم» علامت می‌زنید؛ این کار روی زمان‌بندی «مطالعه
            امروز» تأثیری ندارد. مناسب کسانی که می‌خواهند سریع‌تر و بدون برنامه‌ی مرور پیش بروند.
          </p>
        </div>
      </div>

      {/* Compact toolbar — groups all session controls into one tidy card */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        {/* Row 1: back + title + mode toggle + sound */}
        <div className="flex items-center gap-2 px-3 py-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/vocabulary')}
            className="h-8 w-8 flex-shrink-0"
            title="بازگشت"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-sm font-bold tracking-tight text-foreground">مرور آزاد</h1>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            {/* Mode toggle */}
            <div className="flex items-center gap-0.5 bg-muted rounded-full p-0.5">
              <button
                onClick={() => handleModeChange('EN_TO_FA')}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                  mode === 'EN_TO_FA'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                EN→FA
              </button>
              <button
                onClick={() => handleModeChange('FA_TO_EN')}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                  mode === 'FA_TO_EN'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                FA→EN
              </button>
            </div>

            {/* Sound toggle */}
            <button
              onClick={toggleMuted}
              title={muted ? 'صدا خاموش است' : 'صدا روشن است'}
              aria-label={muted ? 'روشن کردن صدا' : 'خاموش کردن صدا'}
              className={cn(
                'flex items-center justify-center h-8 w-8 rounded-full border transition-colors',
                muted
                  ? 'bg-muted text-muted-foreground border-border'
                  : 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20',
              )}
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Row 2: review filter + book/volume/lesson scope */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 px-3 py-2">
          <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
            {(
              [
                { label: 'همه', value: 'ALL' },
                { label: 'نخوانده', value: 'NOT_READ' },
                { label: 'یاد نگرفتم', value: 'NOT_KNOWN' },
              ] as { label: string; value: ReviewFilter }[]
            ).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setReviewFilter(opt.value)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                  reviewFilter === opt.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {books && books.length > 0 && (
            <>
              <select
                value={bookId ?? ''}
                onChange={(e) => handleBookChange(e.target.value)}
                className={SELECT_CLASS}
                aria-label="کتاب"
              >
                <option value="">همه کتاب‌های لیست من</option>
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>

              {bookId && volumes && volumes.length > 0 && (
                <select
                  value={volumeId ?? ''}
                  onChange={(e) => handleVolumeChange(e.target.value)}
                  className={SELECT_CLASS}
                  aria-label="جلد"
                >
                  <option value="">همه جلدها</option>
                  {volumes.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.title ?? `جلد ${v.volumeNumber}`}
                    </option>
                  ))}
                </select>
              )}

              {volumeId && lessons && lessons.length > 0 && (
                <select
                  value={lessonId ?? ''}
                  onChange={(e) => setLessonId(e.target.value || undefined)}
                  className={SELECT_CLASS}
                  aria-label="درس"
                >
                  <option value="">همه درس‌ها</option>
                  {lessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title ?? `درس ${l.lessonNumber}`}
                    </option>
                  ))}
                </select>
              )}
            </>
          )}
        </div>
      </div>

      {/* Progress — one counter for the whole session */}
      {!isLoading && total > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
            <span>
              <span className="font-semibold text-foreground">{currentIndex + 1}</span>
              {' / '}
              {total}
            </span>
            <span>{progressPercent}٪</span>
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Main content area */}
      {isLoading ? (
        <div className="h-72 rounded-2xl bg-muted animate-pulse" />
      ) : isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
          <p className="text-sm text-destructive font-medium">خطا در بارگذاری واژگان.</p>
        </div>
      ) : !hasScope ? (
        <div className="rounded-2xl border border-border bg-card px-6 py-14 text-center space-y-3">
          <p className="text-lg font-semibold text-foreground">لیست یادگیری شما خالی است</p>
          <p className="text-sm text-muted-foreground">
            برای شروع مرور، ابتدا از کتابخانه یک یا چند کتاب به لیست یادگیری‌تان اضافه کنید.
          </p>
          <Button variant="outline" onClick={() => navigate('/library')} className="mt-2">
            رفتن به کتابخانه
          </Button>
        </div>
      ) : total === 0 ? (
        <div className="rounded-2xl border border-border bg-card px-6 py-14 text-center space-y-3">
          <p className="text-lg font-semibold text-foreground">واژه‌ای برای مرور وجود ندارد</p>
          <p className="text-sm text-muted-foreground">
            {reviewFilter === 'NOT_READ'
              ? 'آفرین! همه واژگان این حالت را خواندید.'
              : reviewFilter === 'NOT_KNOWN'
                ? 'واژه‌ای با وضعیت «یاد نگرفتم» در این حالت ندارید. ادامه بدید!'
                : 'واژه‌ای یافت نشد.'}
          </p>
          <Button variant="outline" onClick={() => setReviewFilter('ALL')} className="mt-2">
            نمایش همه واژگان
          </Button>
        </div>
      ) : currentWord ? (
        <div className="space-y-4">
          {/* Flashcard (hero) — `key` remounts it fresh (front face) on word/mode
              change, so the next card's translation is never briefly visible. */}
          <ReviewCard
            key={currentWord.id + mode}
            word={currentWord}
            mode={mode}
            flipped={flipped}
            onToggle={toggleFlip}
          />

          {/* Action row: prev · [نگرفتم][رد][گرفتم] · next — always one line */}
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full flex-shrink-0"
              disabled={currentIndex === 0}
              onClick={goPrev}
              title="قبلی (←)"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>

            <ReviewActions
              word={currentWord}
              mode={mode}
              onKnown={handleKnown}
              onNotKnown={handleNotKnown}
              onSkip={handleSkip}
            />

            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full flex-shrink-0"
              disabled={currentIndex === total - 1}
              onClick={goNext}
              title="بعدی (→)"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>

          {/* Footer: pronounce + edit link (compact) */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <button
              onClick={pronounce}
              disabled={muted}
              className="inline-flex items-center gap-1.5 hover:text-primary transition-colors disabled:opacity-40 disabled:hover:text-muted-foreground"
            >
              <Volume2 className="h-3.5 w-3.5" />
              {isNative() ? 'پخش تلفظ' : 'پخش تلفظ (P)'}
            </button>
            <button
              onClick={() => navigate(`/admin/words/${currentWord.id}/edit`)}
              className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
            >
              <SquarePen className="h-3.5 w-3.5" />
              اصلاح این واژه
            </button>
          </div>

          {/* Keyboard hint — web only (no physical keyboard on the app) */}
          {!isNative() && (
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground/80">
              {(
                [
                  { key: '→', label: 'قبلی' },
                  { key: '←', label: 'بعدی' },
                  { key: 'Space', label: 'برگرداندن' },
                  { key: '↑', label: 'بلدم' },
                  { key: '↓', label: 'بلد نیستم' },
                  { key: 'P', label: 'تلفظ' },
                ] as { key: string; label: string }[]
              ).map((s) => (
                <span key={s.label} className="inline-flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded border border-border font-mono text-[11px]">
                    {s.key}
                  </kbd>
                  {s.label}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
