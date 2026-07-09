import { ForbiddenError, NotFoundError, ValidationError } from '../../shared/errors'
import { PlanRepository } from './plan.repository'

export interface PlanSummary {
  id: string
  volumeId: string
  bookId: string
  bookTitle: string
  volumeTitle: string
  volumeNumber: number
  dailyNewWords: number
  dailyGoal: number
  isActive: boolean
  totalWords: number
}

const ALLOWED_DAILY_NEW = [10, 20, 30, 50]

export class PlanService {
  constructor(private readonly repo: PlanRepository) {}

  async list(userId: string): Promise<PlanSummary[]> {
    const plans = await this.repo.findByUser(userId)
    const counts = await Promise.all(plans.map((p) => this.repo.countVolumeWords(p.volume.id)))
    return plans.map((p, i) => ({
      id: p.id,
      volumeId: p.volume.id,
      bookId: p.volume.book.id,
      bookTitle: p.volume.book.title,
      volumeTitle: p.volume.title ?? `جلد ${p.volume.volumeNumber}`,
      volumeNumber: p.volume.volumeNumber,
      dailyNewWords: p.dailyNewWords,
      dailyGoal: p.dailyGoal,
      isActive: p.isActive,
      totalWords: counts[i],
    }))
  }

  async create(userId: string, volumeId: string, dailyNewWords: number, dailyGoal: number) {
    if (!ALLOWED_DAILY_NEW.includes(dailyNewWords)) {
      throw new ValidationError(`dailyNewWords must be one of ${ALLOWED_DAILY_NEW.join(', ')}`)
    }
    if (dailyGoal < dailyNewWords) {
      throw new ValidationError('dailyGoal must be at least dailyNewWords')
    }
    const exists = await this.repo.volumeExists(volumeId)
    if (!exists) throw new NotFoundError('Volume')
    const plan = await this.repo.upsert(userId, volumeId, dailyNewWords, dailyGoal)
    return { id: plan.id, volumeId: plan.volumeId }
  }

  async update(
    userId: string,
    id: string,
    data: { dailyNewWords?: number; dailyGoal?: number; isActive?: boolean },
  ) {
    const plan = await this.assertOwned(userId, id)
    const dailyNewWords = data.dailyNewWords ?? plan.dailyNewWords
    const dailyGoal = data.dailyGoal ?? plan.dailyGoal
    if (dailyGoal < dailyNewWords) {
      throw new ValidationError('dailyGoal must be at least dailyNewWords')
    }
    return this.repo.update(id, data)
  }

  async remove(userId: string, id: string) {
    await this.assertOwned(userId, id)
    await this.repo.remove(id)
    return { id }
  }

  private async assertOwned(userId: string, id: string) {
    const plan = await this.repo.findById(id)
    if (!plan) throw new NotFoundError('LearningPlan')
    if (plan.userId !== userId) throw new ForbiddenError()
    return plan
  }
}
