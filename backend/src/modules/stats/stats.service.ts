import { ReviewMode } from '@prisma/client'
import { StatsRepository, EventRow, STABLE_INTERVAL_DAYS } from './stats.repository'
import { startOfDay } from '../study/srs'

// Mirrors the frontend `LearningStats` shape (frontend/src/types/index.ts).

export interface StatTotals {
  reviews: number
  correct: number
  wrong: number
  hard: number
  easy: number
  /** Words forgotten: an already-recalled word answered AGAIN. */
  lapses: number
  /** Answers that introduced a brand-new word. */
  newIntroduced: number
  sessions: number
  studyMinutes: number
  activeDays: number
}

export interface ModeAccuracy {
  mode: ReviewMode
  reviews: number
  accuracy: number
}

export interface DailyStat {
  date: string
  reviews: number
  correct: number
  minutes: number
}

export interface StatRecords {
  bestDayReviews: { date: string; count: number } | null
  bestDayMinutes: { date: string; minutes: number } | null
  /** Best rolling 7-day window, keyed by its first day. */
  bestWeekReviews: { weekStart: string; count: number } | null
  longestStreak: number
}

export interface MemoryBreakdown {
  total: number
  fresh: number
  learning: number
  stable: number
}

export interface HardWordItem {
  wordId: string
  eng: string
  per: string
  hardCount: number
  wrongCount: number
}

export interface GrowthPoint {
  date: string
  count: number
}

export interface HeatmapDay {
  date: string
  count: number
}

export interface LearningStats {
  /** False when the review log is empty — the UI explains that stats start now. */
  hasEvents: boolean
  direction: ReviewMode
  totals: StatTotals
  accuracy: number
  byMode: ModeAccuracy[]
  memory: MemoryBreakdown
  /** Distinct words forgotten at least once. */
  forgottenWords: number
  /** Mean number of reviews a word needed before reaching a ≥21-day interval. */
  avgReviewsToStable: number
  hardestWords: HardWordItem[]
  records: StatRecords
  /** Exact stable-word count per day, replayed from the log. */
  growth: GrowthPoint[]
  daily: DailyStat[]
  heatmap: HeatmapDay[]
}

const GROWTH_DAYS = 90
const DAILY_DAYS = 30
const HEATMAP_DAYS = 126
const HARDEST_LIMIT = 10
const DAY_MS = 86_400_000

/** Local YYYY-MM-DD bucket, on the same 06:00 day boundary as the study queue. */
function isoDay(d: Date): string {
  const local = startOfDay(d)
  const y = local.getFullYear()
  const m = String(local.getMonth() + 1).padStart(2, '0')
  const day = String(local.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** The `count` most recent day keys, oldest first, ending at `dayStart`. */
function recentDayKeys(dayStart: Date, count: number): string[] {
  const keys: string[] = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(dayStart)
    d.setDate(d.getDate() - i)
    keys.push(isoDay(d))
  }
  return keys
}

export class StatsService {
  constructor(private readonly repo: StatsRepository) {}

  async getStats(userId: string, now = new Date()): Promise<LearningStats> {
    const settings = await this.repo.getUserSettings(userId)
    const mode: ReviewMode = settings?.studyDirection ?? ReviewMode.EN_TO_FA
    const dayStart = startOfDay(now)

    const [events, sessions, buckets, hardRows] = await Promise.all([
      this.repo.getAllEvents(userId),
      this.repo.getSessions(userId),
      this.repo.getMemoryBuckets(userId, mode),
      this.repo.getHardWords(userId, mode, HARDEST_LIMIT),
    ])

    // ── Per-day aggregates ────────────────────────────────────────────────────
    const reviewsPerDay = new Map<string, number>()
    const correctPerDay = new Map<string, number>()
    const minutesPerDay = new Map<string, number>()

    let correct = 0
    let wrong = 0
    let hard = 0
    let easy = 0
    let lapses = 0
    let newIntroduced = 0
    const forgotten = new Set<string>()
    const perModeTotal = new Map<ReviewMode, { reviews: number; correct: number }>()

    for (const e of events) {
      const key = isoDay(e.reviewedAt)
      reviewsPerDay.set(key, (reviewsPerDay.get(key) ?? 0) + 1)

      const ok = e.answer !== 'AGAIN'
      if (ok) {
        correct++
        correctPerDay.set(key, (correctPerDay.get(key) ?? 0) + 1)
      } else {
        wrong++
      }
      if (e.answer === 'HARD') hard++
      if (e.answer === 'EASY') easy++
      if (e.isLapse) {
        lapses++
        forgotten.add(e.wordId)
      }
      if (e.isFirst) newIntroduced++

      const m = perModeTotal.get(e.reviewMode) ?? { reviews: 0, correct: 0 }
      m.reviews++
      if (ok) m.correct++
      perModeTotal.set(e.reviewMode, m)
    }

    let studySeconds = 0
    for (const s of sessions) {
      const key = isoDay(s.startedAt)
      minutesPerDay.set(key, (minutesPerDay.get(key) ?? 0) + s.durationSec / 60)
      studySeconds += s.durationSec
    }

    // A day counts as active if it has either an answer or a recorded session.
    const activeDayKeys = new Set<string>([...reviewsPerDay.keys(), ...minutesPerDay.keys()])

    const totals: StatTotals = {
      reviews: events.length,
      correct,
      wrong,
      hard,
      easy,
      lapses,
      newIntroduced,
      sessions: sessions.length,
      studyMinutes: Math.round(studySeconds / 60),
      activeDays: activeDayKeys.size,
    }

    const accuracy = events.length > 0 ? Math.round((correct / events.length) * 100) : 0

    const byMode: ModeAccuracy[] = [ReviewMode.EN_TO_FA, ReviewMode.FA_TO_EN].map((m) => {
      const row = perModeTotal.get(m)
      return {
        mode: m,
        reviews: row?.reviews ?? 0,
        accuracy: row && row.reviews > 0 ? Math.round((row.correct / row.reviews) * 100) : 0,
      }
    })

    // ── Series ────────────────────────────────────────────────────────────────
    const daily: DailyStat[] = recentDayKeys(dayStart, DAILY_DAYS).map((date) => ({
      date,
      reviews: reviewsPerDay.get(date) ?? 0,
      correct: correctPerDay.get(date) ?? 0,
      minutes: Math.round(minutesPerDay.get(date) ?? 0),
    }))

    const heatmap: HeatmapDay[] = recentDayKeys(dayStart, HEATMAP_DAYS).map((date) => ({
      date,
      count: reviewsPerDay.get(date) ?? 0,
    }))

    const growth = this.buildGrowth(events, mode, dayStart)

    return {
      hasEvents: events.length > 0,
      direction: mode,
      totals,
      accuracy,
      byMode,
      memory: { total: buckets.fresh + buckets.learning + buckets.stable, ...buckets },
      forgottenWords: forgotten.size,
      avgReviewsToStable: this.avgReviewsToStable(events, mode),
      hardestWords: hardRows.map((r) => ({
        wordId: r.word.id,
        eng: r.word.eng,
        per: r.word.per,
        hardCount: r.hardCount,
        wrongCount: r.wrongCount,
      })),
      records: this.buildRecords(reviewsPerDay, minutesPerDay, activeDayKeys, dayStart),
      growth,
      daily,
      heatmap,
    }
  }

  /**
   * Exact stable-word count per day, by replaying the log.
   *
   * Every event carries the interval the word had *after* that answer, so
   * walking the log in order and keeping the latest interval per word gives the
   * true stable set at any instant — including words that lapsed back out of it.
   * Events older than the window are replayed first to establish the baseline.
   */
  private buildGrowth(events: EventRow[], mode: ReviewMode, dayStart: Date): GrowthPoint[] {
    const keys = recentDayKeys(dayStart, GROWTH_DAYS)
    const windowStart = new Date(dayStart)
    windowStart.setDate(windowStart.getDate() - (GROWTH_DAYS - 1))

    const interval = new Map<string, number>()
    let stable = 0
    const apply = (e: EventRow) => {
      const was = (interval.get(e.wordId) ?? 0) >= STABLE_INTERVAL_DAYS
      interval.set(e.wordId, e.intervalDays)
      const is = e.intervalDays >= STABLE_INTERVAL_DAYS
      if (!was && is) stable++
      else if (was && !is) stable--
    }

    const scoped = events.filter((e) => e.reviewMode === mode)
    let i = 0
    while (i < scoped.length && scoped[i].reviewedAt < windowStart) apply(scoped[i++])

    const points: GrowthPoint[] = []
    for (let d = 0; d < keys.length; d++) {
      const boundary = new Date(windowStart)
      boundary.setDate(boundary.getDate() + d + 1)
      while (i < scoped.length && scoped[i].reviewedAt < boundary) apply(scoped[i++])
      points.push({ date: keys[d], count: stable })
    }
    return points
  }

  /**
   * Mean answers a word needed before its interval first reached 21 days.
   * Words that never got there are excluded — they have no answer yet.
   */
  private avgReviewsToStable(events: EventRow[], mode: ReviewMode): number {
    const seen = new Map<string, number>()
    const settled = new Map<string, number>()
    for (const e of events) {
      if (e.reviewMode !== mode) continue
      if (settled.has(e.wordId)) continue
      const count = (seen.get(e.wordId) ?? 0) + 1
      seen.set(e.wordId, count)
      if (e.intervalDays >= STABLE_INTERVAL_DAYS) settled.set(e.wordId, count)
    }
    if (settled.size === 0) return 0
    let sum = 0
    for (const c of settled.values()) sum += c
    return Math.round((sum / settled.size) * 10) / 10
  }

  /** Personal bests: busiest day, longest session day, best week, longest streak. */
  private buildRecords(
    reviewsPerDay: Map<string, number>,
    minutesPerDay: Map<string, number>,
    activeDayKeys: Set<string>,
    dayStart: Date,
  ): StatRecords {
    let bestDayReviews: StatRecords['bestDayReviews'] = null
    for (const [date, count] of reviewsPerDay) {
      if (count > 0 && (!bestDayReviews || count > bestDayReviews.count)) {
        bestDayReviews = { date, count }
      }
    }

    let bestDayMinutes: StatRecords['bestDayMinutes'] = null
    for (const [date, mins] of minutesPerDay) {
      const minutes = Math.round(mins)
      if (minutes > 0 && (!bestDayMinutes || minutes > bestDayMinutes.minutes)) {
        bestDayMinutes = { date, minutes }
      }
    }

    // Best rolling 7-day window over the last year — a fixed calendar week
    // would split a strong streak across two buckets and understate it.
    const yearKeys = recentDayKeys(dayStart, 365)
    let bestWeekReviews: StatRecords['bestWeekReviews'] = null
    let window = 0
    for (let i = 0; i < yearKeys.length; i++) {
      window += reviewsPerDay.get(yearKeys[i]) ?? 0
      if (i >= 7) window -= reviewsPerDay.get(yearKeys[i - 7]) ?? 0
      if (window > 0 && (!bestWeekReviews || window > bestWeekReviews.count)) {
        bestWeekReviews = { weekStart: yearKeys[Math.max(0, i - 6)], count: window }
      }
    }

    // Longest run of consecutive active days, anywhere in the history.
    const sorted = [...activeDayKeys].sort()
    let longestStreak = 0
    let run = 0
    let prev: number | null = null
    for (const key of sorted) {
      const t = new Date(`${key}T12:00:00`).getTime()
      run = prev !== null && Math.round((t - prev) / DAY_MS) === 1 ? run + 1 : 1
      if (run > longestStreak) longestStreak = run
      prev = t
    }

    return { bestDayReviews, bestDayMinutes, bestWeekReviews, longestStreak }
  }
}
