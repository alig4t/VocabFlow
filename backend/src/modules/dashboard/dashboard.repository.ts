import { PrismaClient, ReviewMode, WordStatus } from '@prisma/client'

const prisma = new PrismaClient()

export interface VolumeStats {
  totalWords: number
  knownWords: number
  unknownWords: number
  introducedWords: number
  reviewedToday: number
  dueCount: number
  lastStudiedAt: Date | null
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

    const [totalWords, knownWords, unknownWords, introducedWords, reviewedToday, dueCount, lastRow] =
      await Promise.all([
        prisma.word.count({ where: inVolume }),
        prisma.userWordProgress.count({ where: { ...progressInVolume, status: WordStatus.KNOWN } }),
        prisma.userWordProgress.count({
          where: { ...progressInVolume, status: WordStatus.NOT_KNOWN },
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
        hardCount: true,
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
}
