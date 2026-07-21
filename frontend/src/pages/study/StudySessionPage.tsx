import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Volume2, VolumeX, BookOpen, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { ReviewCard } from '@/components/vocabulary/ReviewCard'
import { SessionSummaryScreen, type SessionStats } from '@/components/study/SessionSummaryScreen'
import { useStudyToday } from '@/hooks/useStudy'
import { useSettings } from '@/hooks/useSettings'
import { studyService } from '@/services/study.service'
import { cn } from '@/lib/utils'
import { isNative } from '@/lib/platform'
import { rescheduleNotifications } from '@/lib/notifications'
import { playPronunciation, stopPronunciation, warmUpPronunciation } from '@/lib/pronounce'
import type { ReviewMode, StudyAnswer, Word } from '@/types'

interface QueueItem {
  word: Word
  isNew: boolean
}

const MUTE_KEY = 'vocab_review_muted'

function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

// Persist the in-progress session (queue, position, tallies) so leaving the
// page (back button, accidental nav, phone lock) and returning resumes at the
// exact same card instead of re-fetching and losing position. Cleared on
// finish/restart. sessionStorage (not localStorage) so a stale session never
// survives a full app close+reopen days later.
const SESSION_KEY = 'vocab_study_session_v1'

interface PersistedSession {
  queue: QueueItem[]
  index: number
  counters: { easy: number; hard: number; again: number; skip: number }
  introducedNew: string[]
  seenNewOnce: string[]
  startedAt: string
}

function loadPersistedSession(): PersistedSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as PersistedSession) : null
  } catch {
    return null
  }
}

function savePersistedSession(s: PersistedSession) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s))
  } catch {
    /* ignore (quota / private mode) */
  }
}

function clearPersistedSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}

/** Answer buttons — revealed only after the card is flipped (spec: view then rate). */
function AnswerBar({ onAnswer }: { onAnswer: (a: StudyAnswer) => void }) {
  const btn =
    'w-full whitespace-nowrap rounded-lg border px-2 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2'
  return (
    <div className="flex items-stretch gap-2">
      <Tooltip label="اصلاً یادم نیامد" className="flex-1">
        <button
          onClick={() => onAnswer('AGAIN')}
          className={cn(
            btn,
            'border-red-300 text-red-700 hover:bg-red-50 focus-visible:ring-red-400 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40',
            `${isNative() ? 'flex flex-col' : ''}`
          )}
        >
          بلد نیستم
          {isNative() && <span className='text-[7px]'>(اصلاً یادم نیامد)</span>}

        </button>
      </Tooltip>
      <Tooltip label="به سختی یادم آمد" className="flex-1">
        <button
          onClick={() => onAnswer('HARD')}
          className={cn(
            btn,
            'border-amber-300 text-amber-700 hover:bg-amber-50 focus-visible:ring-amber-400 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/40',
            `${isNative() ? 'flex flex-col' : ''}`
          )}
        >
          سخت
          {isNative() && <span className='text-[7px]'>(به سختی یادم آمد)</span>}
        </button>
      </Tooltip>
      <Tooltip label="به‌راحتی یادم آمد" className="flex-1">
        <button
          onClick={() => onAnswer('EASY')}
          className={cn(
            btn,
            'border-green-300 text-green-700 hover:bg-green-50 focus-visible:ring-green-400 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950/40',
            `${isNative() ? 'flex flex-col' : ''}`
          )}
        >
          بلدم
          {isNative() && <span className='text-[7px]'>(به‌راحتی یادم آمد)</span>}

        </button>
      </Tooltip>
      <Tooltip label={!isNative() ? "فعلاً رد کن (بدون تغییر زمان‌بندی)" : ""}>
        <button
          onClick={() => onAnswer('SKIP')}
          className={cn(
            btn,
            'max-w-[4.5rem] border-dashed border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring',
            `${isNative() ? 'flex flex-col' : ''}`
          )}
        >
          رد
          {isNative() && <span className='text-[7px]'>(فعلاً رد کن)</span>}

        </button>
      </Tooltip>
    </div>
  )
}

/**
 * Buttons shown the very first time a brand-new word appears in the session.
 * "خواندم" (Read) behaves exactly like "بلد نیستم" (AGAIN) — same scheduling —
 * it only carries a gentler label for a word the user is meeting for the first
 * time. On any later appearance the word falls back to the full AnswerBar.
 */
function ReadBar({ onAnswer }: { onAnswer: (a: StudyAnswer) => void }) {
  const btn =
    'whitespace-nowrap rounded-lg border px-2 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2'
  return (
    <div className="flex items-stretch gap-2">
      <Tooltip label="این لغت جدید را خواندم" className="flex-1">
        <button
          onClick={() => onAnswer('AGAIN')}
          className={cn(
            btn,
            'w-full border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 focus-visible:ring-primary/40',
          )}
        >
          خواندم
        </button>
      </Tooltip>
      <Tooltip label={!isNative() ? 'فعلاً رد کن (بدون تغییر زمان‌بندی)' : ''}>
        <button
          onClick={() => onAnswer('SKIP')}
          className={cn(
            btn,
            'max-w-[4.5rem] border-dashed border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring',
          )}
        >
          رد
        </button>
      </Tooltip>
    </div>
  )
}

export function StudySessionPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: today, isLoading, isError, isFetching, refetch } = useStudyToday()
  const { data: settings } = useSettings()

  const mode: ReviewMode = today?.meta.direction ?? settings?.studyDirection ?? 'EN_TO_FA'
  const autoPlay = settings?.autoPlayAudio ?? true
  const showPhonetics = settings?.showPhonetics ?? true
  const showExamples = settings?.showExamples ?? true

  // Frozen session queue (due reviews first, then new words). Requeued items
  // (Again/Skip) are appended so they resurface later in the same session.
  const [queue, setQueue] = useState<QueueItem[] | null>(null)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [muted, setMuted] = useState<boolean>(loadMuted)
  const [summary, setSummary] = useState<SessionStats | null>(null)
  const [saving, setSaving] = useState(false)

  const startedAtRef = useRef<Date>(new Date())
  const counters = useRef({ easy: 0, hard: 0, again: 0, skip: 0 })
  const introducedNew = useRef<Set<string>>(new Set())
  // New words the user has already been shown once this session. A new word gets
  // the Read/Skip bar only on its FIRST appearance; once seen (even if requeued
  // by Read/Again), it uses the standard AnswerBar.
  const seenNewOnce = useRef<Set<string>>(new Set())

  // Resume an in-progress session if one was left mid-way (see SESSION_KEY);
  // otherwise freeze a fresh queue once today's data lands — but only when
  // it's FRESH (not a stale/in-flight refetch), so a just-created plan isn't
  // missed and the session doesn't freeze an empty "nothing today" list.
  useEffect(() => {
    if (queue !== null) return

    const persisted = loadPersistedSession()
    if (persisted && persisted.queue.length > 0) {
      setQueue(persisted.queue)
      setIndex(persisted.index)
      counters.current = { ...persisted.counters }
      introducedNew.current = new Set(persisted.introducedNew)
      seenNewOnce.current = new Set(persisted.seenNewOnce)
      startedAtRef.current = new Date(persisted.startedAt)
      return
    }

    if (today && !isFetching) {
      const initial = [
        ...today.due.map((w) => ({ word: w, isNew: false })),
        ...today.new.map((w) => ({ word: w, isNew: true })),
      ]
      setQueue(initial)
      startedAtRef.current = new Date()
      if (initial.length > 0) {
        savePersistedSession({
          queue: initial,
          index: 0,
          counters: counters.current,
          introducedNew: [],
          seenNewOnce: [],
          startedAt: startedAtRef.current.toISOString(),
        })
      }
    }
  }, [today, queue, isFetching])

  // Leaving the session (even mid-way) → refresh the dashboard + today counts so
  // due/new numbers reflect the answers just given.
  useEffect(() => {
    return () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['study', 'today'] })
    }
  }, [queryClient])

  const current = queue && index < queue.length ? queue[index] : null
  const total = queue?.length ?? 0

  // First time this new word is shown → offer only Read/Skip.
  const isFirstExposure = !!current?.isNew && !seenNewOnce.current.has(current.word.id)

  const finish = useCallback(() => {
    const c = counters.current
    const stats: SessionStats = {
      correctCount: c.easy + c.hard,
      wrongCount: c.again,
      hardCount: c.hard,
      skippedCount: c.skip,
      newCount: introducedNew.current.size,
      reviewedCount: c.easy + c.hard + c.again,
      durationSec: Math.max(0, Math.round((Date.now() - startedAtRef.current.getTime()) / 1000)),
    }
    setSummary(stats)
    clearPersistedSession()
    stopPronunciation()

    // Only record a session if the user actually did something.
    if (stats.reviewedCount + stats.skippedCount > 0) {
      setSaving(true)
      studyService
        .recordSession({
          startedAt: startedAtRef.current.toISOString(),
          endedAt: new Date().toISOString(),
          durationSec: stats.durationSec,
          reviewedCount: stats.reviewedCount,
          correctCount: stats.correctCount,
          wrongCount: stats.wrongCount,
          hardCount: stats.hardCount,
          skippedCount: stats.skippedCount,
          newCount: stats.newCount,
        })
        .catch((e) => console.error('recordSession failed', e))
        .finally(() => {
          setSaving(false)
          queryClient.invalidateQueries({ queryKey: ['dashboard'] })
          queryClient.invalidateQueries({ queryKey: ['study', 'today'] })
          // Studied today → drop tonight's reminder (and refresh the horizon).
          rescheduleNotifications()
        })
    }
  }, [queryClient])

  const handleAnswer = useCallback(
    (a: StudyAnswer) => {
      if (!current || !queue) return
      const cur = current

      // Persist (fire-and-forget; SKIP is a no-op server-side).
      if (a !== 'SKIP') {
        void studyService.answer(cur.word.id, a).catch((e) => console.error('answer failed', e))
      }

      // Tally.
      if (a === 'EASY') counters.current.easy += 1
      else if (a === 'HARD') counters.current.hard += 1
      else if (a === 'AGAIN') counters.current.again += 1
      else counters.current.skip += 1
      if (a !== 'SKIP' && cur.isNew) introducedNew.current.add(cur.word.id)
      // After this answer the word is no longer on its first exposure, so any
      // later appearance (e.g. an Again/Read requeue) uses the standard buttons.
      if (cur.isNew) seenNewOnce.current.add(cur.word.id)

      // "بلد نیستم" (Again) → requeue so the card returns later this session.
      // "رد" (Skip) → just move on; no reschedule, no requeue (distinct behavior).
      const willRequeue = a === 'AGAIN'
      const nextQueue = willRequeue ? [...queue, cur] : queue
      if (willRequeue) setQueue(nextQueue)

      const nextIndex = index + 1
      if (nextIndex >= nextQueue.length) {
        finish()
      } else {
        setIndex(nextIndex)
        setFlipped(false)
        savePersistedSession({
          queue: nextQueue,
          index: nextIndex,
          counters: { ...counters.current },
          introducedNew: [...introducedNew.current],
          seenNewOnce: [...seenNewOnce.current],
          startedAt: startedAtRef.current.toISOString(),
        })
      }
    },
    [current, queue, index, finish],
  )

  const toggleFlip = useCallback(() => setFlipped((f) => !f), [])

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

  const restart = useCallback(() => {
    clearPersistedSession()
    counters.current = { easy: 0, hard: 0, again: 0, skip: 0 }
    introducedNew.current = new Set()
    seenNewOnce.current = new Set()
    setSummary(null)
    setQueue(null)
    setIndex(0)
    setFlipped(false)
    refetch()
  }, [refetch])

  // Auto-play the English word when entering a new card (EN→FA, unmuted, enabled).
  useEffect(() => {
    if (!muted && autoPlay && mode === 'EN_TO_FA' && current && !summary) {
      playPronunciation(current.word)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.word.id, summary])

  useEffect(() => {
    warmUpPronunciation()
    return () => stopPronunciation()
  }, [])

  // Keyboard: Space flips; once flipped, 1=Again 2=Hard 3=Easy S=Skip; P pronounce.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return
      if (summary || !current) return
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        toggleFlip()
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault()
        if (!muted) playPronunciation(current.word)
      } else if (flipped) {
        if (isFirstExposure) {
          // First exposure of a new word: only Read (1/Enter) and Skip (s).
          if (e.key === '1' || e.key === 'Enter') handleAnswer('AGAIN')
          else if (e.key === 's' || e.key === 'S') handleAnswer('SKIP')
        } else if (e.key === '1') handleAnswer('AGAIN')
        else if (e.key === '2') handleAnswer('HARD')
        else if (e.key === '3') handleAnswer('EASY')
        else if (e.key === 's' || e.key === 'S') handleAnswer('SKIP')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [summary, current, flipped, muted, toggleFlip, handleAnswer, isFirstExposure])

  const progressPercent = total > 0 ? Math.round((Math.min(index, total) / total) * 100) : 0

  const planLabel = useMemo(() => {
    const plans = today?.meta.plans ?? []
    if (plans.length === 0) return null
    const p = plans[0]
    const lesson = p.currentLesson != null ? `درس ${p.currentLesson}` : ''
    const verb = p.continueLesson ? 'ادامه‌ی' : 'شروع'
    return `${p.bookTitle} — ${p.volumeTitle}${lesson ? ` · ${verb} ${lesson}` : ''}`
  }, [today])

  // ── Render states ──────────────────────────────────────────────────────────

  if (summary) {
    return (
      <SessionSummaryScreen
        stats={summary}
        saving={saving}
        onHome={() => navigate('/dashboard')}
        onAgain={restart}
      />
    )
  }

  if (isLoading || (today && queue === null)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="h-[420px] animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (isError) {
    return (
      <div dir="rtl" className="font-persian mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-sm font-medium text-destructive">خطا در بارگذاری مطالعه امروز.</p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
          تلاش دوباره
        </Button>
      </div>
    )
  }

  const noPlans = today && !today.meta.hasPlans
  const nothingToday = today && today.meta.hasPlans && total === 0

  if (noPlans) {
    return (
      <div dir="rtl" className="font-persian mx-auto max-w-2xl px-4 py-16 text-center space-y-3">
        <BookOpen className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-semibold text-foreground">هنوز برنامه‌ی یادگیری ندارید</p>
        <p className="text-sm text-muted-foreground">
          برای شروع، از کتابخانه یک جلد را انتخاب کنید و به برنامه‌ی یادگیری‌تان اضافه کنید.
        </p>
        <Button className="mt-2" onClick={() => navigate('/library')}>
          رفتن به کتابخانه
        </Button>
      </div>
    )
  }

  if (nothingToday) {
    return (
      <div dir="rtl" className="font-persian mx-auto max-w-2xl px-4 py-16 text-center space-y-3">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
          <RotateCcw className="h-8 w-8 text-green-500" />
        </div>
        <p className="text-lg font-semibold text-foreground">برای امروز کاری نمانده! 🎉</p>
        <p className="text-sm text-muted-foreground">
          همه‌ی مرورها و لغات جدید امروز را تمام کردید. فردا برگردید.
        </p>
        <Button className="mt-2" onClick={() => navigate('/dashboard')}>
          بازگشت به خانه
        </Button>
      </div>
    )
  }

  return (
    <div dir="rtl" className="font-persian mx-auto max-w-3xl space-y-4 px-2 py-4 sm:px-4 sm:py-6">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
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
          <h1 className="truncate text-sm font-bold text-foreground">مطالعه امروز</h1>
          {planLabel && <p className="truncate text-xs text-muted-foreground">{planLabel}</p>}
        </div>
        <button
          onClick={toggleMuted}
          title={muted ? 'صدا خاموش' : 'صدا روشن'}
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

      {/* Progress + due/new badges */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
          <span className="flex items-center gap-2">
            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-blue-600 dark:text-blue-400">
              مرور {today?.meta.dueCount ?? 0}
            </span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
              جدید {today?.meta.newCount ?? 0}
            </span>
            {current?.isNew && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-primary-foreground">
                لغت جدید
              </span>
            )}
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

      {/* Card */}
      {current && (
        <div className="space-y-4">
          <ReviewCard
            key={current.word.id + '-' + index + mode}
            word={current.word}
            mode={mode}
            flipped={flipped}
            onToggle={toggleFlip}
            showPhonetics={showPhonetics}
            showExamples={showExamples}
          />

          {flipped ? (
            isFirstExposure ? (
              <ReadBar onAnswer={handleAnswer} />
            ) : (
              <AnswerBar onAnswer={handleAnswer} />
            )
          ) : (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" className="min-w-[10rem]" onClick={toggleFlip}>
                نمایش پاسخ
              </Button>
              <button
                onClick={() => handleAnswer('SKIP')}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                رد
              </button>
            </div>
          )}

          {/* Keyboard hint (web only) */}
          {!isNative() && flipped && (
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground/80">
              {(isFirstExposure
                ? [
                    { key: '1', label: 'خواندم' },
                    { key: 'S', label: 'رد' },
                    { key: 'P', label: 'تلفظ' },
                  ]
                : [
                    { key: '1', label: 'بلد نیستم' },
                    { key: '2', label: 'سخت' },
                    { key: '3', label: 'بلدم' },
                    { key: 'S', label: 'رد' },
                    { key: 'P', label: 'تلفظ' },
                  ]
              ).map((s) => (
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
