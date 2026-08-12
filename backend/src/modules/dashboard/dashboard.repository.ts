import { PrismaClient, ReviewMode, WordStatus } from '@prisma/client'

const prisma = new PrismaClient()

export interface VolumeStats {
  totalWords: number
  knownWords: number
  unknownWords: number
  /** KNOWN words that were answered "سخت" (HARD) at least once — a subset of knownWords. */
  hardWords: number
  introducedWords: number
  reviewedToday: number
  dueCount: number
  lastStudiedAt: Date | null
}

/**
 * SM-2 memory-strength buckets (Anki's young/mature convention):
 * a word is "پایدار" once its scheduling interval reaches three weeks, and
 * "در حال یادگیری" once it has survived at least two successful repetitions.
 */
export const STABLE_INTERVAL_DAYS = 21
export const LEARNING_MIN_REPETITIONS = 2

export interface MemoryBuckets {
  fresh: number
  learning: number
  stable: number
}

export class DashboardRepository {
  async getUserSettings(userId: string) {
    return prisma.userSettings.findUnique({ where: { userId } })
  }

  async getActivePlans(userId: string) {
    return prisma.learningPlan.findMany({
      where: { userId, isActive: true },
      include: {
        volume: {
          select: {
            id: true,
            volumeNumber: true,
            title: true,
            coverImage: true,
            book: { select: { id: true, title: true, coverImage: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  /** Per-volume learning stats for one user + direction. */
  async getVolumeStats(
    userId: string,
    mode: ReviewMode,
    volumeId: string,
    dayStart: Date,
    dayEnd: Date,
  ): Promise<VolumeStats> {
    const inVolume = { lesson: { volumeId } }
    const progressInVolume = { userId, reviewMode: mode, word: inVolume }

    const [totalWords, knownWords, unknownWords, hardWords, introducedWords, reviewedToday, dueCount, lastRow] =
      await Promise.all([
        prisma.word.count({ where: inVolume }),
        prisma.userWordProgress.count({ where: { ...progressInVolume, status: WordStatus.KNOWN } }),
        prisma.userWordProgress.count({
          where: { ...progressInVolume, status: WordStatus.NOT_KNOWN },
        }),
        prisma.userWordProgress.count({
          where: { ...progressInVolume, status: WordStatus.KNOWN, hardCount: { gt: 0 } },
        }),
        prisma.userWordProgress.count({
          where: { ...progressInVolume, introducedAt: { not: null } },
        }),
        prisma.userWordProgress.count({
          where: { ...progressInVolume, lastReviewedAt: { gte: dayStart, lte: dayEnd } },
        }),
        prisma.userWordProgress.count({
          where: {
            ...progressInVolume,
            introducedAt: { not: null },
            nextReviewAt: { lte: dayEnd },
          },
        }),
        prisma.userWordProgress.findFirst({
          where: { ...progressInVolume, lastReviewedAt: { not: null } },
          orderBy: { lastReviewedAt: 'desc' },
          select: { lastReviewedAt: true },
        }),
      ])

    return {
      totalWords,
      knownWords,
      unknownWords,
      hardWords,
      introducedWords,
      reviewedToday,
      dueCount,
      lastStudiedAt: lastRow?.lastReviewedAt ?? null,
    }
  }

  /** Total KNOWN words across everything the user has learned in a direction. */
  async countKnown(userId: string, mode: ReviewMode) {
    return prisma.userWordProgress.count({
      where: { userId, reviewMode: mode, status: WordStatus.KNOWN },
    })
  }

  /** Sessions in a date range (oldest first) for streak / heatmap / stats. */
  async getSessions(userId: string, since: Date) {
    return prisma.studySession.findMany({
      where: { userId, startedAt: { gte: since } },
      select: {
        startedAt: true,
        durationSec: true,
        reviewedCount: true,
        correctCount: true,
        wrongCount: true,
      },
      orderBy: { startedAt: 'asc' },
    })
  }

  /** Distinct session day-stamps (local ISO date), newest first, for the streak. */
  async getSessionDates(userId: string) {
    return prisma.studySession.findMany({
      where: { userId },
      select: { startedAt: true },
      orderBy: { startedAt: 'desc' },
    })
  }

  /**
   * Memory-strength split over every *introduced* word in a direction.
   * Buckets are mutually exclusive, so fresh + learning + stable = introduced.
   */
  async getMemoryBuckets(userId: string, mode: ReviewMode): Promise<MemoryBuckets> {
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

  /**
   * `lastReviewedAt` of the currently-stable words reviewed since `since`.
   * The growth curve is reconstructed backwards from these (see the service):
   * the schema keeps no history, so "when did this word become stable" is
   * approximated by the last review that pushed it there.
   */
  async getStableReviewDates(userId: string, mode: ReviewMode, since: Date) {
    const rows = await prisma.userWordProgress.findMany({
      where: {
        userId,
        reviewMode: mode,
        intervalDays: { gte: STABLE_INTERVAL_DAYS },
        lastReviewedAt: { gte: since },
      },
      select: { lastReviewedAt: true },
    })
    return rows.map((r) => r.lastReviewedAt).filter((d): d is Date => d !== null)
  }

  /** Due dates of every scheduled word up to `until` (for the forecast chart). */
  async getUpcomingDue(userId: string, mode: ReviewMode, until: Date) {
    const rows = await prisma.userWordProgress.findMany({
      where: {
        userId,
        reviewMode: mode,
        introducedAt: { not: null },
        nextReviewAt: { not: null, lte: until },
      },
      select: { nextReviewAt: true },
    })
    return rows.map((r) => r.nextReviewAt).filter((d): d is Date => d !== null)
  }

  /** The words the user struggles with most: answered HARD or wrong the most. */
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
