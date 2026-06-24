import { PrismaClient, ReviewMode, WordStatus } from '@prisma/client'

const prisma = new PrismaClient()

export interface ProgressStats {
  reviewMode: ReviewMode
  KNOWN: number
  NOT_KNOWN: number
  NOT_READ: number
}

export class ProgressRepository {
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
      update: { status },
      create: { userId, wordId, reviewMode, status },
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
      by: ['reviewMode', 'status'],
      where: { userId },
      _count: { status: true },
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
      statsMap[row.reviewMode][row.status] = row._count.status
    }

    return Object.values(statsMap)
  }

  async resetProgress(userId: string, reviewMode?: ReviewMode) {
    return prisma.userWordProgress.deleteMany({
      where: {
        userId,
        ...(reviewMode ? { reviewMode } : {}),
      },
    })
  }
}
