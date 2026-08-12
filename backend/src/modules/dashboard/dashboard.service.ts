import { ReviewMode } from '@prisma/client'
import { DashboardRepository } from './dashboard.repository'
import { startOfDay, endOfDay } from '../study/srs'

// Mirrors the frontend `DashboardData` shape (frontend/src/types/index.ts).
export interface WatchlistBook {
  id: string
  bookId: string
  title: string
  coverImage?: string
  totalWords: number
  knownWords: number
  unknownWords: number
  /** KNOWN words in this volume that were answered "سخت" (HARD) at least once. */
  hardWords: number
  notReadWords: number
  reviewedToday: number
  lastStudiedAt: string | null
  dueCount: number
  estimatedDays: number
}

export interface DashboardGlobalStats {
  watchlistCount: number
  totalWordsLearned: number
  reviewsToday: number
  currentStreak: number
  avgStudyMinutes: number
  accuracyRate: number
}

export interface HeatmapDay {
  date: string
  count: number
}

export interface ReviewQueueItem {
  bookId: string
  title: string
  dueCount: number
}

/** SM-2 memory-strength split across every introduced word. */
export interface MemoryBreakdown {
  /** fresh + learning + stable (i.e. all introduced words). */
  total: number
  fresh: number
  learning: number
  stable: number
}

/** One day of the review forecast (day 0 = today, includes overdue). */
export interface UpcomingDay {
  date: string
  count: number
}

/** A word the user keeps getting wrong / marking as hard. */
export interface HardWordItem {
  wordId: string
  eng: string
  per: string
  hardCount: number
  wrongCount: number
}

/** One point of the "stable words over time" curve. */
export interface GrowthPoint {
  date: string
  count: number
}

export interface DashboardData {
  stats: DashboardGlobalStats
  watchlist: WatchlistBook[]
  heatmap: HeatmapDay[]
  queue: ReviewQueueItem[]
  memory: MemoryBreakdown
  upcoming: UpcomingDay[]
  hardWords: HardWordItem[]
  growth: GrowthPoint[]
}

const HEATMAP_DAYS = 126
const GROWTH_DAYS = 30
const UPCOMING_DAYS = 7
const HARD_WORDS_LIMIT = 5
/** The standalone "واژه‌های سخت" page shows the full list, not just the top 5. */
const HARD_WORDS_PAGE_LIMIT = 100

/**
 * Local YYYY-MM-DD bucket for a date (heatmap/streak buckets are day-granular).
 * Uses the same 06:00 day-boundary as the study queue (`startOfDay` from
 * `study/srs.ts`) so a session at 1am buckets into the previous day everywhere.
 */
function isoDay(d: Date): string {
  const local = startOfDay(d)
  const y = local.getFullYear()
  const m = String(local.getMonth() + 1).padStart(2, '0')
  const day = String(local.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export class DashboardService {
  constructor(private readonly repo: DashboardRepository) {}

  async getDashboard(userId: string, now = new Date()): Promise<DashboardData> {
    const settings = await this.repo.getUserSettings(userId)
    const mode: ReviewMode = settings?.studyDirection ?? ReviewMode.EN_TO_FA

    const dayStart = startOfDay(now)
    const dayEnd = endOfDay(now)

    const plans = await this.repo.getActivePlans(userId)

    // Per-volume watchlist rows.
    const watchlist: WatchlistBook[] = await Promise.all(
      plans.map(async (plan) => {
        const s = await this.repo.getVolumeStats(userId, mode, plan.volume.id, dayStart, dayEnd)
        const remainingNew = Math.max(0, s.totalWords - s.introducedWords)
        const estimatedDays =
          plan.dailyNewWords > 0 ? Math.ceil(remainingNew / plan.dailyNewWords) : 0
        const volumeTitle = plan.volume.title ?? `جلد ${plan.volume.volumeNumber}`
        return {
          id: plan.id,
          bookId: plan.volume.book.id,
          title: `${plan.volume.book.title} — ${volumeTitle}`,
          coverImage: plan.volume.coverImage ?? plan.volume.book.coverImage ?? undefined,
          totalWords: s.totalWords,
          knownWords: s.knownWords,
          unknownWords: s.unknownWords,
          hardWords: s.hardWords,
          notReadWords: Math.max(0, s.totalWords - s.introducedWords),
          reviewedToday: s.reviewedToday,
          lastStudiedAt: s.lastStudiedAt ? s.lastStudiedAt.toISOString() : null,
          dueCount: s.dueCount,
          estimatedDays,
        }
      }),
    )

    // Global stats.
    const since = new Date(dayStart)
    since.setDate(since.getDate() - (HEATMAP_DAYS - 1))
    const [totalWordsLearned, sessions, sessionDates] = await Promise.all([
      this.repo.countKnown(userId, mode),
      this.repo.getSessions(userId, since),
      this.repo.getSessionDates(userId),
    ])

    const reviewsToday = sessions
      .filter((sess) => sess.startedAt >= dayStart && sess.startedAt <= dayEnd)
      .reduce((sum, sess) => sum + sess.reviewedCount, 0)

    const totalCorrect = sessions.reduce((s, x) => s + x.correctCount, 0)
    const totalWrong = sessions.reduce((s, x) => s + x.wrongCount, 0)
    const accuracyRate =
      totalCorrect + totalWrong > 0
        ? Math.round((totalCorrect / (totalCorrect + totalWrong)) * 100)
        : 0
    const avgStudyMinutes =
      sessions.length > 0
        ? Math.round(sessions.reduce((s, x) => s + x.durationSec, 0) / sessions.length / 60)
        : 0

    const watchlistBookIds = new Set(plans.map((p) => p.volume.book.id))

    const stats: DashboardGlobalStats = {
      watchlistCount: watchlistBookIds.size,
      totalWordsLearned,
      reviewsToday,
      currentStreak: this.computeStreak(sessionDates.map((s) => s.startedAt), now),
      avgStudyMinutes,
      accuracyRate,
    }

    // Heatmap: sum reviewedCount per day across the window (fill gaps with 0).
    const perDay = new Map<string, number>()
    for (const sess of sessions) {
      const key = isoDay(sess.startedAt)
      perDay.set(key, (perDay.get(key) ?? 0) + sess.reviewedCount)
    }
    const heatmap: HeatmapDay[] = []
    for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
      const d = new Date(dayStart)
      d.setDate(d.getDate() - i)
      const key = isoDay(d)
      heatmap.push({ date: key, count: perDay.get(key) ?? 0 })
    }

    const queue: ReviewQueueItem[] = watchlist
      .filter((b) => b.dueCount > 0)
      .map((b) => ({ bookId: b.bookId, title: b.title, dueCount: b.dueCount }))

    // ── Memory / forecast / hard words / growth ───────────────────────────────
    const growthSince = new Date(dayStart)
    growthSince.setDate(growthSince.getDate() - (GROWTH_DAYS - 1))
    const upcomingUntil = new Date(dayEnd)
    upcomingUntil.setDate(upcomingUntil.getDate() + (UPCOMING_DAYS - 1))

    const buckets = await this.repo.getMemoryBuckets(userId, mode)
    const [stableReviewDates, dueDates, hardRows] = await Promise.all([
      this.repo.getStableReviewDates(userId, mode, growthSince),
      this.repo.getUpcomingDue(userId, mode, upcomingUntil),
      this.repo.getHardWords(userId, mode, HARD_WORDS_LIMIT),
    ])

    const memory: MemoryBreakdown = {
      total: buckets.fresh + buckets.learning + buckets.stable,
      ...buckets,
    }

    const upcoming = this.buildForecast(dueDates, dayStart, dayEnd)
    const growth = this.buildGrowth(stableReviewDates, buckets.stable, dayStart)

    const hardWords: HardWordItem[] = hardRows.map((r) => ({
      wordId: r.word.id,
      eng: r.word.eng,
      per: r.word.per,
      hardCount: r.hardCount,
      wrongCount: r.wrongCount,
    }))

    return { stats, watchlist, heatmap, queue, memory, upcoming, hardWords, growth }
  }

  /**
   * The full "words that need more attention" list, for the dedicated page.
   * Same ordering as the dashboard card — that card is just the top 5 of this.
   */
  async getHardWords(userId: string): Promise<HardWordItem[]> {
    const settings = await this.repo.getUserSettings(userId)
    const mode: ReviewMode = settings?.studyDirection ?? ReviewMode.EN_TO_FA
    const rows = await this.repo.getHardWords(userId, mode, HARD_WORDS_PAGE_LIMIT)
    return rows.map((r) => ({
      wordId: r.word.id,
      eng: r.word.eng,
      per: r.word.per,
      hardCount: r.hardCount,
      wrongCount: r.wrongCount,
    }))
  }

  /**
   * Words due per day for the next `UPCOMING_DAYS`. Everything already overdue
   * folds into day 0 — that is exactly what the study queue will serve today.
   */
  private buildForecast(dueDates: Date[], dayStart: Date, dayEnd: Date): UpcomingDay[] {
    const days: UpcomingDay[] = []
    for (let i = 0; i < UPCOMING_DAYS; i++) {
      const d = new Date(dayStart)
      d.setDate(d.getDate() + i)
      days.push({ date: isoDay(d), count: 0 })
    }
    for (const due of dueDates) {
      if (due <= dayEnd) {
        days[0].count++
        continue
      }
      // endOfDay(dayStart + i) — the first bucket whose boundary is past `due`.
      const offset = Math.floor((due.getTime() - dayEnd.getTime()) / 86_400_000) + 1
      if (offset >= 0 && offset < UPCOMING_DAYS) days[offset].count++
    }
    return days
  }

  /**
   * Approximate "stable words over the last 30 days".
   *
   * `user_word_progress` keeps no history, so the curve is reconstructed
   * backwards from today's stable set: a word that is stable now and was last
   * reviewed on day D is assumed to have *become* stable on day D. Words last
   * reviewed before the window were already stable throughout it. The result is
   * monotonically non-decreasing and always ends at the real current count.
   */
  private buildGrowth(stableReviewDates: Date[], stableTotal: number, dayStart: Date): GrowthPoint[] {
    const perDay = new Map<string, number>()
    for (const d of stableReviewDates) {
      const key = isoDay(d)
      perDay.set(key, (perDay.get(key) ?? 0) + 1)
    }

    const keys: string[] = []
    for (let i = GROWTH_DAYS - 1; i >= 0; i--) {
      const d = new Date(dayStart)
      d.setDate(d.getDate() - i)
      keys.push(isoDay(d))
    }

    const points: GrowthPoint[] = new Array(GROWTH_DAYS)
    let running = stableTotal
    for (let i = GROWTH_DAYS - 1; i >= 0; i--) {
      points[i] = { date: keys[i], count: Math.max(0, running) }
      running -= perDay.get(keys[i]) ?? 0
    }
    return points
  }

  /** Consecutive days ending today (or yesterday) that have a study session. */
  private computeStreak(dates: Date[], now: Date): number {
    if (dates.length === 0) return 0
    const days = new Set(dates.map((d) => isoDay(d)))
    let streak = 0
    const cursor = startOfDay(now)
    // Allow the streak to still count if the user hasn't studied *yet* today.
    if (!days.has(isoDay(cursor))) cursor.setDate(cursor.getDate() - 1)
    while (days.has(isoDay(cursor))) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }
    return streak
  }
}
