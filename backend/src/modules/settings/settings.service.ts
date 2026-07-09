import { CardOrder, ReviewMode } from '@prisma/client'
import { SettingsRepository } from './settings.repository'

export interface UserSettingsDto {
  studyDirection: ReviewMode
  autoPlayAudio: boolean
  showPhonetics: boolean
  showExamples: boolean
  cardOrder: CardOrder
}

export interface UpdateSettingsInput {
  studyDirection?: ReviewMode
  autoPlayAudio?: boolean
  showPhonetics?: boolean
  showExamples?: boolean
  cardOrder?: CardOrder
}

export class SettingsService {
  constructor(private readonly repo: SettingsRepository) {}

  async get(userId: string): Promise<UserSettingsDto> {
    return this.toDto(await this.repo.findOrCreate(userId))
  }

  async update(userId: string, input: UpdateSettingsInput): Promise<UserSettingsDto> {
    return this.toDto(await this.repo.update(userId, input))
  }

  private toDto(s: {
    studyDirection: ReviewMode
    autoPlayAudio: boolean
    showPhonetics: boolean
    showExamples: boolean
    cardOrder: CardOrder
  }): UserSettingsDto {
    return {
      studyDirection: s.studyDirection,
      autoPlayAudio: s.autoPlayAudio,
      showPhonetics: s.showPhonetics,
      showExamples: s.showExamples,
      cardOrder: s.cardOrder,
    }
  }
}
