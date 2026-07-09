import { PrismaClient, ReviewMode, WordStatus } from '@prisma/client'

const prisma = new PrismaClient()

export interface ProgressStats {
  reviewMode: ReviewMode
  KNOWN: number
  NOT_KNOWN: number
  NOT_READ: number
}

export class ProgressRepository {
  /**
   * Manual free-review mark. Writes `manualStatus` only — a track entirely
   * separate from the SM-2 daily program (`status` + scheduling fields), so
   * marking a word here never affects "Study Today".
   */
  async upsertProgress(
    userId: string,
    wordId: string,
    reviewMode: ReviewMode,
    status: WordStatus,
  ) {
    return prisma.userWordProgress.upsert({
      where: {
        userId_wordId_reviewMode: { userId, wordId, reviewMode },
      },
      update: { manualStatus: status },
      create: { userId, wordId, reviewMode, manualStatus: status },
    })
  }

  async getUserProgress(userId: string, reviewMode?: ReviewMode) {
    return prisma.userWordProgress.findMany({
      where: {
        userId,
        ...(reviewMode ? { reviewMode } : {}),
      },
      include: { word: true },
    })
  }

  async getProgressStats(userId: string): Promise<ProgressStats[]> {
    const rows = await prisma.userWordProgress.groupBy({
      by: ['reviewMode', 'manualStatus'],
      where: { userId },
      _count: { manualStatus: true },
    })

    const modes = Object.values(ReviewMode)
    const statsMap: Record<ReviewMode, ProgressStats> = {} as Record<
      ReviewMode,
      ProgressStats
    >

    for (const mode of modes) {
      statsMap[mode] = { reviewMode: mode, KNOWN: 0, NOT_KNOWN: 0, NOT_READ: 0 }
    }

    for (const row of rows) {
      statsMap[row.reviewMode][row.manualStatus] = row._count.manualStatus
    }

    return Object.values(statsMap)
  }

  /**
   * Reset the MANUAL marks only. Rows also carry SM-2 program data, so we clear
   * `manualStatus` back to NOT_READ rather than deleting the rows.
   */
  async resetProgress(userId: string, reviewMode?: ReviewMode) {
    return prisma.userWordProgress.updateMany({
      where: {
        userId,
        ...(reviewMode ? { reviewMode } : {}),
      },
      data: { manualStatus: WordStatus.NOT_READ },
    })
  }
}
