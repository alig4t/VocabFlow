import { PrismaClient, ReviewMode, WordStatus } from '@prisma/client'
import { WordScopeFilters } from '../../shared/types'
import { wordScopeWhere } from '../../shared/utils/word-scope'

const prisma = new PrismaClient()

export interface ProgressStats {
  reviewMode: ReviewMode
  KNOWN: number
  NOT_KNOWN: number
  NOT_READ: number
  total: number
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

  async getProgressStats(
    userId: string,
    filters: WordScopeFilters = {},
  ): Promise<ProgressStats[]> {
    const where = wordScopeWhere(filters)
    const grouped = prisma.userWordProgress.groupBy({
      by: ['reviewMode', 'manualStatus'],
      where: { userId, word: where },
      _count: { manualStatus: true },
    })
    const [total, rows] = await prisma.$transaction([
      prisma.word.count({ where }),
      grouped,
    ])

    const modes = Object.values(ReviewMode)
    const statsMap: Record<ReviewMode, ProgressStats> = {} as Record<
      ReviewMode,
      ProgressStats
    >

    for (const mode of modes) {
      statsMap[mode] = {
        reviewMode: mode,
        KNOWN: 0,
        NOT_KNOWN: 0,
        NOT_READ: total,
        total,
      }
    }

    for (const row of rows) {
      if (row.manualStatus !== 'NOT_READ') {
        statsMap[row.reviewMode][row.manualStatus] = row._count.manualStatus
      }
    }

    for (const mode of modes) {
      statsMap[mode].NOT_READ =
        total - statsMap[mode].KNOWN - statsMap[mode].NOT_KNOWN
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
