import { PrismaClient, ReviewMode } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Interval (days) at which a word counts as "پایدار", and the repetition count
 * that separates "تازه" from "در حال یادگیری". Kept identical to
 * `dashboard.repository.ts` — the two pages must never disagree.
 */
export const STABLE_INTERVAL_DAYS = 21
export const LEARNING_MIN_REPETITIONS = 2

export interface EventRow {
  wordId: string
  reviewMode: ReviewMode
  answer: string
  intervalDays: number
  isFirst: boolean
  isLapse: boolean
  reviewedAt: Date
}

export class StatsRepository {
  async getUserSettings(userId: string) {
    return prisma.userSettings.findUnique({ where: { userId } })
  }

  /**
   * The whole review log, oldest first, across both directions.
   *
   * Deliberately unbounded: the growth curve is produced by replaying the log
   * from the beginning, so a windowed fetch would silently lose the baseline
   * state of every word reviewed before the window. Six columns per row keeps
   * this cheap even for a few tens of thousands of answers.
   */
  async getAllEvents(userId: string): Promise<EventRow[]> {
    return prisma.reviewEvent.findMany({
      where: { userId },
      select: {
        wordId: true,
        reviewMode: true,
        answer: true,
        intervalDays: true,
        isFirst: true,
        isLapse: true,
        reviewedAt: true,
      },
      orderBy: { reviewedAt: 'asc' },
    })
  }

  /** Sessions (oldest first) — the only source of study *time*. */
  async getSessions(userId: string) {
    return prisma.studySession.findMany({
      where: { userId },
      select: { startedAt: true, durationSec: true },
      orderBy: { startedAt: 'asc' },
    })
  }

  /** Memory-strength split — same definition as the dashboard. */
  async getMemoryBuckets(userId: string, mode: ReviewMode) {
    const base = { userId, reviewMode: mode, introducedAt: { not: null } }
    const young = { intervalDays: { lt: STABLE_INTERVAL_DAYS } }
    const [fresh, learning, stable] = await Promise.all([
      prisma.userWordProgress.count({
        where: { ...base, ...young, repetitions: { lt: LEARNING_MIN_REPETITIONS } },
      }),
      prisma.userWordProgress.count({
        where: { ...base, ...young, repetitions: { gte: LEARNING_MIN_REPETITIONS } },
      }),
      prisma.userWordProgress.count({
        where: { ...base, intervalDays: { gte: STABLE_INTERVAL_DAYS } },
      }),
    ])
    return { fresh, learning, stable }
  }

  /** Hardest words for the given direction (same ordering as the dashboard). */
  async getHardWords(userId: string, mode: ReviewMode, limit: number) {
    return prisma.userWordProgress.findMany({
      where: {
        userId,
        reviewMode: mode,
        introducedAt: { not: null },
        OR: [{ hardCount: { gt: 0 } }, { wrongCount: { gt: 0 } }],
      },
      orderBy: [{ hardCount: 'desc' }, { wrongCount: 'desc' }],
      take: limit,
      select: {
        hardCount: true,
        wrongCount: true,
        word: { select: { id: true, eng: true, per: true } },
      },
    })
  }
}
