import { PrismaClient } from '@prisma/client'

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

  /** Total words in a volume. */
  async countVolumeWords(volumeId: string) {
    return prisma.word.count({ where: { lesson: { volumeId } } })
  }
}
