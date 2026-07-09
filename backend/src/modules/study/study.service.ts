import { ReviewMode } from '@prisma/client'
import { NotFoundError } from '../../shared/errors'
import { StudyRepository, SessionInput } from './study.repository'
import { schedule, startOfDay, endOfDay, StudyAnswer } from './srs'

/** One active volume's daily-learning context, shown on Home / in the session. */
export interface StudyPlanMeta {
  planId: string
  volumeId: string
  bookTitle: string
  volumeTitle: string
  dailyNewWords: number
  dailyGoal: number
  /** Lesson number the next new word belongs to (null if the volume is finished). */
  currentLesson: number | null
  /** New words that will be introduced today for this volume. */
  newToday: number
  /** True when today's new words resume a lesson already started ("Continue Lesson"). */
  continueLesson: boolean
}

export interface StudyToday {
  due: unknown[]
  new: unknown[]
  meta: {
    dueCount: number
    newCount: number
    dailyGoal: number
    reviewedToday: number
    hasPlans: boolean
    direction: ReviewMode
    plans: StudyPlanMeta[]
  }
}

export class StudyService {
  constructor(private readonly repo: StudyRepository) {}

  /** The scheduling direction, from user settings (defaults to EN→FA). */
  private async resolveMode(userId: string): Promise<ReviewMode> {
    const settings = await this.repo.getUserSettings(userId)
    return settings?.studyDirection ?? ReviewMode.EN_TO_FA
  }

  async getToday(userId: string, now = new Date()): Promise<StudyToday> {
    const mode = await this.resolveMode(userId)
    const plans = await this.repo.getActivePlans(userId)

    const volumeIds = plans.map((p) => p.volume.id)
    const dueWords = await this.repo.getDueWords(userId, mode, volumeIds, endOfDay(now))

    const dayStart = startOfDay(now)
    const newWords: unknown[] = []
    const planMeta: StudyPlanMeta[] = []

    for (const plan of plans) {
      const volumeId = plan.volume.id
      const introducedToday = await this.repo.countIntroducedToday(userId, mode, volumeId, dayStart)
      const capacity = Math.max(0, plan.dailyNewWords - introducedToday)

      // Fetch one extra beyond capacity so we can still name the "current lesson"
      // even when today's quota is already spent.
      const preview = await this.repo.getNewWords(userId, mode, volumeId, Math.max(capacity, 1))
      const todaysNew = capacity > 0 ? preview.slice(0, capacity) : []
      newWords.push(...todaysNew)

      const nextWord = preview[0] as
        | { lesson?: { id: string; lessonNumber: number } | null }
        | undefined
      const currentLesson = nextWord?.lesson?.lessonNumber ?? null
      const continueLesson = nextWord?.lesson?.id
        ? await this.repo.hasIntroducedInLesson(userId, mode, nextWord.lesson.id)
        : false

      planMeta.push({
        planId: plan.id,
        volumeId,
        bookTitle: plan.volume.book.title,
        volumeTitle: plan.volume.title ?? `جلد ${plan.volume.volumeNumber}`,
        dailyNewWords: plan.dailyNewWords,
        dailyGoal: plan.dailyGoal,
        currentLesson,
        newToday: todaysNew.length,
        continueLesson,
      })
    }

    return {
      due: dueWords,
      new: newWords,
      meta: {
        dueCount: dueWords.length,
        newCount: newWords.length,
        dailyGoal: plans.reduce((s, p) => s + p.dailyGoal, 0),
        reviewedToday: 0, // filled by dashboard; not needed for the session itself
        hasPlans: plans.length > 0,
        direction: mode,
        plans: planMeta,
      },
    }
  }

  /** Apply an answer to a word and return the new schedule (or a skip marker). */
  async answer(userId: string, wordId: string, answer: StudyAnswer, now = new Date()) {
    const exists = await this.repo.wordExists(wordId)
    if (!exists) throw new NotFoundError('Word')

    const mode = await this.resolveMode(userId)
    const existing = await this.repo.getProgressRow(userId, wordId, mode)

    const result = schedule(existing, answer, now)
    if (result === null) {
      // SKIP — leave the schedule untouched; the client requeues in-session.
      return { wordId, skipped: true as const }
    }

    await this.repo.saveSchedule(userId, wordId, mode, result, now, existing?.introducedAt ?? null)

    return {
      wordId,
      skipped: false as const,
      status: result.status,
      repetitions: result.repetitions,
      intervalDays: result.intervalDays,
      easeFactor: result.easeFactor,
      nextReviewAt: result.nextReviewAt,
      correct: result.correct,
    }
  }

  async recordSession(userId: string, input: SessionInput) {
    return this.repo.createSession(userId, input)
  }
}
