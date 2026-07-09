import { PrismaClient, CardOrder, ReviewMode } from '@prisma/client'

const prisma = new PrismaClient()

export interface SettingsUpdate {
  studyDirection?: ReviewMode
  autoPlayAudio?: boolean
  showPhonetics?: boolean
  showExamples?: boolean
  cardOrder?: CardOrder
}

export class SettingsRepository {
  async find(userId: string) {
    return prisma.userSettings.findUnique({ where: { userId } })
  }

  /** Lazily create defaults so the client always gets a full settings object. */
  async findOrCreate(userId: string) {
    return prisma.userSettings.upsert({
      where: { userId },
      create: { userId },
      update: {},
    })
  }

  async update(userId: string, data: SettingsUpdate) {
    return prisma.userSettings.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    })
  }
}
