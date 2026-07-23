import { CardOrder, ReviewMode } from '@prisma/client'
import { NotFoundError } from '../../shared/errors'
import { StudyRepository, SessionInput } from './study.repository'
import { schedule, startOfDay, endOfDay, StudyAnswer } from './srs'

/** In-place Fisher–Yates shuffle, returning a new array. */
function shuffle<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

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
    /** New words already met today — the size of the "practice" pool on Home. */
    introducedToday: number
    hasPlans: boolean
    direction: ReviewMode
    plans: StudyPlanMeta[]
  }
}

/** Today's newly-introduced words, for the manual practice reviewer. */
export interface TodayNewWords {
  words: unknown[]
  count: number
  direction: ReviewMode
}

export class StudyService {
  constructor(private readonly repo: StudyRepository) {}

  /** The scheduling direction + card order, from user settings. */
  private async resolveSettings(
    userId: string,
  ): Promise<{ mode: ReviewMode; cardOrder: CardOrder }> {
    const settings = await this.repo.getUserSettings(userId)
    return {
      mode: settings?.studyDirection ?? ReviewMode.EN_TO_FA,
      cardOrder: settings?.cardOrder ?? CardOrder.SEQUENTIAL,
    }
  }

  async getToday(userId: string, now = new Date()): Promise<StudyToday> {
    const { mode, cardOrder } = await this.resolveSettings(userId)
    const plans = await this.repo.getActivePlans(userId)

    const dayStart = startOfDay(now)
    const dayEnd = endOfDay(now)

    // Due reviews are capped per volume by that plan's own dailyGoal (oldest-due
    // first, so a cap only ever defers the least-urgent words). Without this cap
    // a large backlog would show as one giant, unbounded list every day.
    const dueWords: unknown[] = []
    const newWords: unknown[] = []
    const planMeta: StudyPlanMeta[] = []
    let introducedTodayTotal = 0

    for (const plan of plans) {
      const volumeId = plan.volume.id
      const dueInVolume = await this.repo.getDueWords(
        userId,
        mode,
        [volumeId],
        dayEnd,
        plan.dailyGoal,
      )
      dueWords.push(...dueInVolume)

      const introducedToday = await this.repo.countIntroducedToday(userId, mode, volumeId, dayStart)
      introducedTodayTotal += introducedToday
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

    // Shuffle within each group when RANDOM — review-before-new always holds,
    // only the order *inside* each group changes.
    const orderedDue = cardOrder === CardOrder.RANDOM ? shuffle(dueWords) : dueWords
    const orderedNew = cardOrder === CardOrder.RANDOM ? shuffle(newWords) : newWords

    return {
      due: orderedDue,
      new: orderedNew,
      meta: {
        dueCount: dueWords.length,
        newCount: newWords.length,
        dailyGoal: plans.reduce((s, p) => s + p.dailyGoal, 0),
        reviewedToday: 0, // filled by dashboard; not needed for the session itself
        introducedToday: introducedTodayTotal,
        hasPlans: plans.length > 0,
        direction: mode,
        plans: planMeta,
      },
    }
  }

  /**
   * The words introduced today, for the free "practice" reviewer on Home.
   * Read-only: nothing here writes to the SM-2 schedule.
   */
  async getTodayNewWords(userId: string, now = new Date()): Promise<TodayNewWords> {
    const { mode } = await this.resolveSettings(userId)
    const words = await this.repo.getIntroducedTodayWords(userId, mode, startOfDay(now))
    return { words, count: words.length, direction: mode }
  }

  /** Apply an answer to a word and return the new schedule (or a skip marker). */
  async answer(userId: string, wordId: string, answer: StudyAnswer, now = new Date()) {
    const exists = await this.repo.wordExists(wordId)
    if (!exists) throw new NotFoundError('Word')

    const { mode } = await this.resolveSettings(userId)
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
