import { PrismaClient, Prisma, ReviewMode, WordStatus } from '@prisma/client'
import { SrsResult } from './srs'

const prisma = new PrismaClient()

const lessonSelect = {
  select: {
    id: true,
    lessonNumber: true,
    title: true,
    volume: {
      select: {
        id: true,
        volumeNumber: true,
        title: true,
        book: { select: { id: true, title: true } },
      },
    },
  },
}

const phrasesInclude = {
  orderBy: { order: 'asc' as const },
  include: { examples: { orderBy: { order: 'asc' as const } } },
}

/** Full word payload for study cards, including this user's progress in the mode. */
function wordInclude(userId: string, mode: ReviewMode): Prisma.WordInclude {
  return {
    examples: { orderBy: { order: 'asc' } },
    phrases: phrasesInclude,
    lesson: lessonSelect,
    module: { select: { id: true, name: true, slug: true } },
    progress: {
      where: { userId, reviewMode: mode },
      select: { status: true, reviewMode: true },
    },
  }
}

/** Deterministic learning order: lesson, then legacy chapter, then insertion. */
const NEW_WORD_ORDER: Prisma.WordOrderByWithRelationInput[] = [
  { lesson: { lessonNumber: 'asc' } },
  { chapter: 'asc' },
  { createdAt: 'asc' },
  { id: 'asc' },
]

export class StudyRepository {
  async getUserSettings(userId: string) {
    return prisma.userSettings.findUnique({ where: { userId } })
  }

  async getActivePlans(userId: string) {
    return prisma.learningPlan.findMany({
      where: { userId, isActive: true },
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
      orderBy: { createdAt: 'asc' },
    })
  }

  /**
   * Words already due for review (introduced, nextReviewAt in the past/today),
   * oldest-due first. `take` caps how many are returned (e.g. a volume's
   * `dailyGoal`) — the oldest-due-first order means a cap always drops the
   * *least* overdue words, never the most urgent ones.
   */
  async getDueWords(
    userId: string,
    mode: ReviewMode,
    volumeIds: string[],
    dueBefore: Date,
    take?: number,
  ) {
    if (volumeIds.length === 0) return []
    const rows = await prisma.userWordProgress.findMany({
      where: {
        userId,
        reviewMode: mode,
        introducedAt: { not: null },
        nextReviewAt: { lte: dueBefore },
        word: { lesson: { volumeId: { in: volumeIds } } },
      },
      orderBy: { nextReviewAt: 'asc' },
      ...(take !== undefined ? { take } : {}),
      include: { word: { include: wordInclude(userId, mode) } },
    })
    return rows.map((r) => r.word)
  }

  /** Not-yet-introduced words in a volume, in learning order, capped at `take`. */
  async getNewWords(userId: string, mode: ReviewMode, volumeId: string, take: number) {
    if (take <= 0) return []
    return prisma.word.findMany({
      where: {
        lesson: { volumeId },
        NOT: { progress: { some: { userId, reviewMode: mode, introducedAt: { not: null } } } },
      },
      orderBy: NEW_WORD_ORDER,
      take,
      include: wordInclude(userId, mode),
    })
  }

  /** How many new words this user has already started in a volume today. */
  async countIntroducedToday(userId: string, mode: ReviewMode, volumeId: string, since: Date) {
    return prisma.userWordProgress.count({
      where: {
        userId,
        reviewMode: mode,
        introducedAt: { gte: since },
        word: { lesson: { volumeId } },
      },
    })
  }

  /** Remaining not-introduced words in a volume (for progress/ETA). */
  async countRemainingNew(userId: string, mode: ReviewMode, volumeId: string) {
    return prisma.word.count({
      where: {
        lesson: { volumeId },
        NOT: { progress: { some: { userId, reviewMode: mode, introducedAt: { not: null } } } },
      },
    })
  }

  /** Whether this lesson already has introduced words (⇒ resuming, "Continue Lesson"). */
  async hasIntroducedInLesson(userId: string, mode: ReviewMode, lessonId: string): Promise<boolean> {
    const count = await prisma.userWordProgress.count({
      where: {
        userId,
        reviewMode: mode,
        introducedAt: { not: null },
        word: { lessonId },
      },
    })
    return count > 0
  }

  async getProgressRow(userId: string, wordId: string, mode: ReviewMode) {
    return prisma.userWordProgress.findUnique({
      where: { userId_wordId_reviewMode: { userId, wordId, reviewMode: mode } },
    })
  }

  /** Persist an SM-2 outcome, stamping introducedAt on first entry into the cycle. */
  async saveSchedule(
    userId: string,
    wordId: string,
    mode: ReviewMode,
    result: SrsResult,
    now: Date,
    existingIntroducedAt: Date | null,
  ) {
    const introducedAt = existingIntroducedAt ?? now
    return prisma.userWordProgress.upsert({
      where: { userId_wordId_reviewMode: { userId, wordId, reviewMode: mode } },
      create: {
        userId,
        wordId,
        reviewMode: mode,
        status: result.status,
        repetitions: result.repetitions,
        intervalDays: result.intervalDays,
        easeFactor: result.easeFactor,
        reviewCount: 1,
        correctCount: result.correct ? 1 : 0,
        wrongCount: result.correct ? 0 : 1,
        lastReviewedAt: now,
        nextReviewAt: result.nextReviewAt,
        introducedAt,
      },
      update: {
        status: result.status,
        repetitions: result.repetitions,
        intervalDays: result.intervalDays,
        easeFactor: result.easeFactor,
        reviewCount: { increment: 1 },
        correctCount: { increment: result.correct ? 1 : 0 },
        wrongCount: { increment: result.correct ? 0 : 1 },
        lastReviewedAt: now,
        nextReviewAt: result.nextReviewAt,
        introducedAt,
      },
    })
  }

  async wordExists(wordId: string): Promise<boolean> {
    const w = await prisma.word.findUnique({ where: { id: wordId }, select: { id: true } })
    return w !== null
  }

  async createSession(userId: string, data: SessionInput) {
    return prisma.studySession.create({
      data: {
        userId,
        startedAt: data.startedAt,
        endedAt: data.endedAt,
        durationSec: data.durationSec,
        reviewedCount: data.reviewedCount,
        correctCount: data.correctCount,
        wrongCount: data.wrongCount,
        hardCount: data.hardCount,
        skippedCount: data.skippedCount,
        newCount: data.newCount,
      },
    })
  }
}

export interface SessionInput {
  startedAt: Date
  endedAt: Date
  durationSec: number
  reviewedCount: number
  correctCount: number
  wrongCount: number
  hardCount: number
  skippedCount: number
  newCount: number
}

export { WordStatus }
