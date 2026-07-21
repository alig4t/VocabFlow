import { PrismaClient, WordStatus } from '@prisma/client'

const prisma = new PrismaClient()

export class PlanRepository {
  /** Active plans for a user with their volume + book context, oldest first. */
  async findByUser(userId: string) {
    return prisma.learningPlan.findMany({
      where: { userId },
      include: {
        volume: {
          select: {
            id: true,
            volumeNumber: true,
            title: true,
            book: { select: { id: true, title: true, coverImage: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  async findById(id: string) {
    return prisma.learningPlan.findUnique({ where: { id } })
  }

  async volumeExists(volumeId: string): Promise<boolean> {
    const v = await prisma.volume.findUnique({ where: { id: volumeId }, select: { id: true } })
    return v !== null
  }

  /** Idempotent create: re-activates + updates targets if the plan already exists. */
  async upsert(userId: string, volumeId: string, dailyNewWords: number, dailyGoal: number) {
    return prisma.learningPlan.upsert({
      where: { userId_volumeId: { userId, volumeId } },
      create: { userId, volumeId, dailyNewWords, dailyGoal, isActive: true },
      update: { dailyNewWords, dailyGoal, isActive: true },
      include: {
        volume: {
          select: {
            id: true,
            volumeNumber: true,
            title: true,
            book: { select: { id: true, title: true } },
          },
        },
      },
    })
  }

  async update(id: string, data: { dailyNewWords?: number; dailyGoal?: number; isActive?: boolean }) {
    return prisma.learningPlan.update({ where: { id }, data })
  }

  async remove(id: string) {
    return prisma.learningPlan.delete({ where: { id } })
  }

  /**
   * Clear the SM-2 daily-program state for every word in a volume (so re-adding
   * the plan starts fresh). The separate MANUAL mark (`manualStatus`) is left
   * intact — it's an independent track.
   */
  async resetVolumeSm2(userId: string, volumeId: string) {
    return prisma.userWordProgress.updateMany({
      where: { userId, word: { lesson: { volumeId } } },
      data: {
        status: WordStatus.NOT_READ,
        repetitions: 0,
        intervalDays: 0,
        easeFactor: 2.5,
        reviewCount: 0,
        correctCount: 0,
        wrongCount: 0,
        lastReviewedAt: null,
        nextReviewAt: null,
        introducedAt: null,
      },
    })
  }

  /** Total words in a volume. */
  async countVolumeWords(volumeId: string) {
    return prisma.word.count({ where: { lesson: { volumeId } } })
  }

  /** Sum of dailyNewWords across this user's active plans, excluding one volume. */
  async sumActiveDailyNewWordsExcluding(userId: string, volumeId: string): Promise<number> {
    const rows = await prisma.learningPlan.findMany({
      where: { userId, isActive: true, NOT: { volumeId } },
      select: { dailyNewWords: true },
    })
    return rows.reduce((sum, r) => sum + r.dailyNewWords, 0)
  }
}
