import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Dumbbell,
  Trophy,
  Sparkles,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ReviewCard } from '@/components/vocabulary/ReviewCard'
import { ReviewActions } from '@/components/vocabulary/ReviewActions'
import { useTodayNewWords } from '@/hooks/useStudy'
import { useSettings } from '@/hooks/useSettings'
import { useUpdateWordStatus } from '@/hooks/useProgress'
import { cn } from '@/lib/utils'
import { isNative } from '@/lib/platform'
import { playPronunciation, stopPronunciation, warmUpPronunciation } from '@/lib/pronounce'
import type { ReviewMode, Word } from '@/types'

const MUTE_KEY = 'vocab_review_muted'

function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * "تمرین: مرور مجدد واژگان جدید امروز" — a free-review replay of the words the
 * user met for the first time today.
 *
 * Deliberately built on the FREE-REVIEW parts (`ReviewCard` + `ReviewActions`),
 * not on the daily session: marking here writes only the manual status, exactly
 * like `/vocabulary/review`. **Nothing on this page touches SM-2** — no
 * `study/answer` call, no interval/ease/next-review change — so practising as
 * often as you like can never disturb tomorrow's queue.
 */
export function ReviewTodayPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useTodayNewWords()
  const { data: settings } = useSettings()
  const { mutate: updateStatus } = useUpdateWordStatus()

  // Frozen word list: marking a word updates it in place (so its badge changes)
  // but never reorders or drops it mid-practice — same contract as ReviewPage.
  const [words, setWords] = useState<Word[] | null>(null)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [muted, setMuted] = useState<boolean>(loadMuted)
  const [finished, setFinished] = useState(false)
  const [tally, setTally] = useState({ known: 0, notKnown: 0 })

  const [mode, setMode] = useState<ReviewMode | null>(null)
  const activeMode: ReviewMode = mode ?? data?.direction ?? settings?.studyDirection ?? 'EN_TO_FA'

  useEffect(() => {
    if (words === null && data) setWords(data.words)
  }, [data, words])

  const total = words?.length ?? 0
  const currentWord = words && index < total ? words[index] : null
  const progressPercent = total > 0 ? Math.round(((index + 1) / total) * 100) : 0

  // Advancing past the last card ends the practice (no wrap-around). Computed
  // from the rendered index rather than inside a state updater, so the finish
  // flag is never flipped twice by a double-invoked updater.
  const goNext = useCallback(() => {
    setFlipped(false)
    if (index + 1 >= total) setFinished(true)
    else setIndex(index + 1)
  }, [index, total])

  const goPrev = useCallback(() => {
    setFlipped(false)
    setIndex((i) => Math.max(i - 1, 0))
  }, [])

  const toggleFlip = useCallback(() => setFlipped((f) => !f), [])

  const pronounce = useCallback(() => {
    if (muted || !currentWord) return
    playPronunciation(currentWord)
  }, [muted, currentWord])

  const toggleMuted = useCallback(() => {
    setMuted((m) => {
      const next = !m
      try {
        localStorage.setItem(MUTE_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      if (next) stopPronunciation()
      return next
    })
  }, [])

  const markStatus = useCallback(
    (status: 'KNOWN' | 'NOT_KNOWN') => {
      if (!currentWord) return
      const wordId = currentWord.id
      setWords((list) =>
        (list ?? []).map((w) =>
          w.id === wordId
            ? {
                ...w,
                progress: [
                  ...(w.progress ?? []).filter((p) => p.reviewMode !== activeMode),
                  // Manual free-review mark only — the SM-2 `status` is untouched.
                  {
                    id: '',
                    userId: '',
                    wordId,
                    reviewMode: activeMode,
                    status: 'NOT_READ' as const,
                    manualStatus: status,
                  },
                ],
              }
            : w,
        ),
      )
      setTally((t) =>
        status === 'KNOWN' ? { ...t, known: t.known + 1 } : { ...t, notKnown: t.notKnown + 1 },
      )
      updateStatus({ wordId, reviewMode: activeMode, status })
      goNext()
    },
    [currentWord, activeMode, updateStatus, goNext],
  )

  const handleKnown = useCallback(() => markStatus('KNOWN'), [markStatus])
  const handleNotKnown = useCallback(() => markStatus('NOT_KNOWN'), [markStatus])

  const restart = useCallback(() => {
    setFinished(false)
    setIndex(0)
    setFlipped(false)
    setTally({ known: 0, notKnown: 0 })
    setWords(null)
    refetch()
  }, [refetch])

  // Auto-play the English word on entering a card (EN→FA, unmuted) — same rule
  // as the daily session and free review.
  useEffect(() => {
    if (!muted && activeMode === 'EN_TO_FA' && currentWord && !finished) {
      playPronunciation(currentWord)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWord?.id, finished])

  useEffect(() => {
    warmUpPronunciation()
    return () => stopPronunciation()
  }, [])

  // Keyboard: ← → navigate, Space flips, ↑ گرفتم, ↓ نگرفتم, P pronounce.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return
      if (finished || !currentWord) return

      if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        toggleFlip()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        handleKnown()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        handleNotKnown()
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault()
        pronounce()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [finished, currentWord, goNext, goPrev, toggleFlip, handleKnown, handleNotKnown, pronounce])

  const bookLabel = useMemo(() => {
    const lesson = words?.[index]?.lesson
    if (!lesson) return null
    const volume = lesson.volume
    if (!volume) return null
    return `${volume.book?.title ?? ''} — ${volume.title ?? `جلد ${volume.volumeNumber}`}`
  }, [words, index])

  // ── Render states ──────────────────────────────────────────────────────────

  if (isLoading || (data && words === null)) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="h-[420px] animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (isError) {
    return (
      <div dir="rtl" className="font-persian mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-sm font-medium text-destructive">خطا در بارگذاری واژه‌های امروز.</p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
          تلاش دوباره
        </Button>
      </div>
    )
  }

  if (total === 0) {
    return (
      <div dir="rtl" className="font-persian mx-auto max-w-2xl space-y-3 px-4 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Dumbbell className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-lg font-semibold text-foreground">امروز واژه‌ی جدیدی نخوانده‌اید</p>
        <p className="text-sm text-muted-foreground">
          بعد از تمام‌کردن «مطالعه امروز»، واژه‌های تازه‌ی همان روز اینجا برای تمرین آماده می‌شوند.
        </p>
        <Button className="mt-2" onClick={() => navigate('/dashboard')}>
          بازگشت به خانه
        </Button>
      </div>
    )
  }

  if (finished) {
    return (
      <div dir="rtl" className="font-persian mx-auto max-w-xl space-y-6 px-4 py-10 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/15">
          <Trophy className="h-10 w-10 text-primary" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold text-foreground">تمرین امروز تمام شد! 💪</h1>
          <p className="text-sm text-muted-foreground">
            {total} واژه‌ی جدید امروز را دوباره مرور کردید.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card px-3 py-4">
            <p className="text-2xl font-bold tabular-nums text-green-500">{tally.known}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">گرفتم</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-3 py-4">
            <p className="text-2xl font-bold tabular-nums text-red-500">{tally.notKnown}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">نگرفتم</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          این تمرین روی زمان‌بندی مرور فردا هیچ اثری نگذاشت.
        </p>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button className="w-full sm:w-auto" onClick={() => navigate('/dashboard')}>
            بازگشت به خانه
          </Button>
          <Button variant="outline" className="w-full gap-2 sm:w-auto" onClick={restart}>
            <RotateCcw className="h-4 w-4" />
            تمرین دوباره
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="font-persian mx-auto max-w-4xl space-y-4 px-2 py-4 sm:px-4 sm:py-6">
      {/* Practice banner — gold identity, and an explicit "SM-2 untouched" promise. */}
      <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Dumbbell className="h-5 w-5" />
        </span>
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-bold text-foreground">تمرین — مرور مجدد واژگان جدید امروز</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            واژه‌هایی که امروز برای اولین بار خواندید، یک‌بار دیگر. این تمرین آزاد است و روی
            زمان‌بندی «مطالعه امروز» هیچ تأثیری ندارد.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 px-3 py-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
            className="h-8 w-8 flex-shrink-0"
            title="بازگشت"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-bold text-foreground">تمرین امروز</h1>
            {bookLabel && <p className="truncate text-[11px] text-muted-foreground">{bookLabel}</p>}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 rounded-full bg-muted p-0.5">
              {(['EN_TO_FA', 'FA_TO_EN'] as ReviewMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m)
                    setFlipped(false)
                  }}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    activeMode === m
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {m === 'EN_TO_FA' ? 'EN→FA' : 'FA→EN'}
                </button>
              ))}
            </div>

            <button
              onClick={toggleMuted}
              title={muted ? 'صدا خاموش است' : 'صدا روشن است'}
              aria-label={muted ? 'روشن کردن صدا' : 'خاموش کردن صدا'}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border transition-colors',
                muted
                  ? 'border-border bg-muted text-muted-foreground'
                  : 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20',
              )}
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-1 border-t border-border/60 px-3 py-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
              <Sparkles className="h-3 w-3" />
              واژه‌های جدید امروز
            </span>
            <span>
              <span className="font-semibold text-foreground">{Math.min(index + 1, total)}</span>
              {' / '}
              {total}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {currentWord && (
        <div className="space-y-4">
          <ReviewCard
            key={currentWord.id + activeMode}
            word={currentWord}
            mode={activeMode}
            flipped={flipped}
            onToggle={toggleFlip}
            showPhonetics={settings?.showPhonetics ?? true}
            showExamples={settings?.showExamples ?? true}
          />

          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 flex-shrink-0 rounded-full"
              disabled={index === 0}
              onClick={goPrev}
              title="قبلی (←)"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>

            <ReviewActions
              word={currentWord}
              mode={activeMode}
              onKnown={handleKnown}
              onNotKnown={handleNotKnown}
              onSkip={goNext}
            />

            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 flex-shrink-0 rounded-full"
              onClick={goNext}
              title="بعدی (→)"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <button
              onClick={pronounce}
              disabled={muted}
              className="inline-flex items-center gap-1.5 transition-colors hover:text-primary disabled:opacity-40 disabled:hover:text-muted-foreground"
            >
              <Volume2 className="h-3.5 w-3.5" />
              {isNative() ? 'پخش تلفظ' : 'پخش تلفظ (P)'}
            </button>
          </div>

          {!isNative() && (
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground/80">
              {[
                { key: '→', label: 'قبلی' },
                { key: '←', label: 'بعدی' },
                { key: 'Space', label: 'برگرداندن' },
                { key: '↑', label: 'گرفتم' },
                { key: '↓', label: 'نگرفتم' },
                { key: 'P', label: 'تلفظ' },
              ].map((s) => (
                <span key={s.label} className="inline-flex items-center gap-1">
                  <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-[11px]">
                    {s.key}
                  </kbd>
                  {s.label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
