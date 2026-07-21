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

const ALLOWED_DAILY_NEW = [10, 20, 30, 40, 50]
// A "هدف روزانه (مرور)" outside this range would either hide the queue almost
// entirely (too low → backlog never clears) or make the cap meaningless (too
// high) — see study.service.ts, which caps each volume's due-review query at
// its plan's dailyGoal.
const MIN_DAILY_GOAL = 5
const MAX_DAILY_GOAL = 500
// Across ALL active plans (possibly several books) combined, so new-word
// introduction can't snowball into an unmanageable review backlog the next day.
const MAX_TOTAL_DAILY_NEW = 200

export class PlanService {
  constructor(private readonly repo: PlanRepository) {}

  private assertDailyGoal(dailyNewWords: number, dailyGoal: number) {
    if (dailyGoal < dailyNewWords) {
      throw new ValidationError('dailyGoal must be at least dailyNewWords')
    }
    if (dailyGoal < MIN_DAILY_GOAL || dailyGoal > MAX_DAILY_GOAL) {
      throw new ValidationError(`dailyGoal must be between ${MIN_DAILY_GOAL} and ${MAX_DAILY_GOAL}`)
    }
  }

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
    this.assertDailyGoal(dailyNewWords, dailyGoal)
    const exists = await this.repo.volumeExists(volumeId)
    if (!exists) throw new NotFoundError('Volume')

    // Sum of dailyNewWords across every OTHER active plan (a plan for this same
    // volume, if any, is being replaced by this call, not added to).
    const otherTotal = await this.repo.sumActiveDailyNewWordsExcluding(userId, volumeId)
    if (otherTotal + dailyNewWords > MAX_TOTAL_DAILY_NEW) {
      throw new ValidationError(
        `مجموع لغات جدید روزانه در همه‌ی برنامه‌های فعال نمی‌تواند از ${MAX_TOTAL_DAILY_NEW} بیشتر شود`,
      )
    }

    const plan = await this.repo.upsert(userId, volumeId, dailyNewWords, dailyGoal)
    return { id: plan.id, volumeId: plan.volumeId }
  }

  async update(
    userId: string,
    id: string,
    data: { dailyNewWords?: number; dailyGoal?: number; isActive?: boolean },
  ) {
    const plan = await this.assertOwned(userId, id)
    if (data.dailyNewWords !== undefined && !ALLOWED_DAILY_NEW.includes(data.dailyNewWords)) {
      throw new ValidationError(`dailyNewWords must be one of ${ALLOWED_DAILY_NEW.join(', ')}`)
    }
    const dailyNewWords = data.dailyNewWords ?? plan.dailyNewWords
    const dailyGoal = data.dailyGoal ?? plan.dailyGoal
    this.assertDailyGoal(dailyNewWords, dailyGoal)

    const isActive = data.isActive ?? plan.isActive
    if (isActive) {
      const otherTotal = await this.repo.sumActiveDailyNewWordsExcluding(userId, plan.volumeId)
      if (otherTotal + dailyNewWords > MAX_TOTAL_DAILY_NEW) {
        throw new ValidationError(
          `مجموع لغات جدید روزانه در همه‌ی برنامه‌های فعال نمی‌تواند از ${MAX_TOTAL_DAILY_NEW} بیشتر شود`,
        )
      }
    }

    return this.repo.update(id, data)
  }

  async remove(userId: string, id: string) {
    const plan = await this.assertOwned(userId, id)
    // Clear the SM-2 program data for this volume (manual marks are preserved).
    await this.repo.resetVolumeSm2(userId, plan.volumeId)
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
