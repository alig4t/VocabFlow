import type { StudyAnswer, WordStatus } from '@/types'

/**
 * Offline SM-2 scheduler — mirrors `backend/src/modules/study/srs.ts`.
 * Kept as a standalone copy because the native build has no backend access.
 */

const QUALITY: Record<Exclude<StudyAnswer, 'SKIP'>, number> = { AGAIN: 1, HARD: 3, EASY: 5 }
const DEFAULT_EASE = 2.5
const MIN_EASE = 1.3

export interface SrsPrev {
  repetitions: number
  intervalDays: number
  easeFactor: number
}

export interface SrsResult {
  repetitions: number
  intervalDays: number
  easeFactor: number
  status: WordStatus
  nextReviewAt: Date
  correct: boolean
}

export function startOfDay(now: Date): Date {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfDay(now: Date): Date {
  const d = new Date(now)
  d.setHours(23, 59, 59, 999)
  return d
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

export function schedule(prev: SrsPrev | null, answer: StudyAnswer, now: Date): SrsResult | null {
  if (answer === 'SKIP') return null

  const q = QUALITY[answer]
  let repetitions = prev?.repetitions ?? 0
  let intervalDays = prev?.intervalDays ?? 0
  let easeFactor = prev?.easeFactor ?? DEFAULT_EASE

  if (q < 3) {
    repetitions = 0
    intervalDays = 0
  } else {
    if (repetitions === 0) intervalDays = 1
    else if (repetitions === 1) intervalDays = 6
    else intervalDays = Math.round(intervalDays * easeFactor)
    repetitions += 1
  }

  easeFactor = Math.max(MIN_EASE, easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))
  const nextReviewAt = intervalDays === 0 ? startOfDay(now) : addDays(startOfDay(now), intervalDays)

  return {
    repetitions,
    intervalDays,
    easeFactor,
    status: q < 3 ? 'NOT_KNOWN' : 'KNOWN',
    nextReviewAt,
    correct: q >= 3,
  }
}
