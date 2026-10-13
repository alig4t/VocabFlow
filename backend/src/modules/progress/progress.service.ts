import { ReviewMode, WordStatus } from '@prisma/client'
import { ProgressRepository } from './progress.repository'
import { WordScopeFilters } from '../../shared/types'

export class ProgressService {
  private readonly repository: ProgressRepository

  constructor(repository = new ProgressRepository()) {
    this.repository = repository
  }

  async updateWordStatus(
    userId: string,
    wordId: string,
    reviewMode: ReviewMode,
    status: WordStatus,
  ) {
    return this.repository.upsertProgress(userId, wordId, reviewMode, status)
  }

  async getStats(userId: string, filters: WordScopeFilters = {}) {
    return this.repository.getProgressStats(userId, filters)
  }

  async resetProgress(userId: string, reviewMode?: ReviewMode) {
    return this.repository.resetProgress(userId, reviewMode)
  }
}
