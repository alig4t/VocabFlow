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
  /** "سخت" (HARD) answers given today, across all sessions. */
  hardToday: number
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

export interface DashboardData {
  stats: DashboardGlobalStats
  watchlist: WatchlistBook[]
  heatmap: HeatmapDay[]
  queue: ReviewQueueItem[]
}

const HEATMAP_DAYS = 126

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

    const todaysSessions = sessions.filter(
      (sess) => sess.startedAt >= dayStart && sess.startedAt <= dayEnd,
    )
    const reviewsToday = todaysSessions.reduce((sum, sess) => sum + sess.reviewedCount, 0)
    const hardToday = todaysSessions.reduce((sum, sess) => sum + sess.hardCount, 0)

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
      hardToday,
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

    return { stats, watchlist, heatmap, queue }
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
