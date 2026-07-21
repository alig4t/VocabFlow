import { WordStatus } from '@prisma/client'

/**
 * SM-2 spaced-repetition scheduler.
 *
 * The daily study flow offers four answers. They map onto SM-2 recall qualities
 * (0–5) as follows, with SKIP being a no-op that leaves the schedule untouched:
 *
 *   AGAIN → q1 (lapse: reset repetitions, review again today)
 *   HARD  → q3 (pass, but ease drops so intervals grow slowly)
 *   EASY  → q5 (pass, ease rises so intervals grow quickly)
 *   SKIP  → unchanged (the card is requeued in-session, not rescheduled)
 */
export type StudyAnswer = 'EASY' | 'HARD' | 'AGAIN' | 'SKIP'

const QUALITY: Record<Exclude<StudyAnswer, 'SKIP'>, number> = {
  AGAIN: 1,
  HARD: 3,
  EASY: 5,
}

/** The scheduling fields a word carries before an answer (nulls for new words). */
export interface SrsState {
  repetitions: number
  intervalDays: number
  easeFactor: number
  status: WordStatus
  nextReviewAt: Date | null
}

/** The scheduling outcome to persist plus per-answer flags for the summary. */
export interface SrsResult {
  repetitions: number
  intervalDays: number
  easeFactor: number
  status: WordStatus
  nextReviewAt: Date
  /** Answer counted as a successful recall (HARD/EASY). */
  correct: boolean
  /** This specific answer was "سخت" (HARD) — a recall that succeeded but struggled. */
  hard: boolean
}

const DEFAULT_EASE = 2.5
const MIN_EASE = 1.3

/**
 * The daily program's "day" starts at this local hour, not midnight — so
 * studying at 1am still counts as the previous day's session and the queue
 * doesn't reset under you. Keep in sync with `frontend/src/offline/srs.ts`.
 */
const DAY_START_HOUR = 6

export function startOfDay(now: Date): Date {
  const d = new Date(now)
  d.setHours(DAY_START_HOUR, 0, 0, 0)
  if (d.getTime() > now.getTime()) d.setDate(d.getDate() - 1)
  return d
}

export function endOfDay(now: Date): Date {
  const d = startOfDay(now)
  d.setDate(d.getDate() + 1)
  d.setMilliseconds(d.getMilliseconds() - 1)
  return d
}

export function addDays(base: Date, days: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

/**
 * Compute the next schedule for a word given the user's answer.
 * Returns `null` for SKIP — callers should treat that as "no change".
 */
export function schedule(prev: Partial<SrsState> | null, answer: StudyAnswer, now: Date): SrsResult | null {
  if (answer === 'SKIP') return null

  const q = QUALITY[answer]
  let repetitions = prev?.repetitions ?? 0
  let intervalDays = prev?.intervalDays ?? 0
  let easeFactor = prev?.easeFactor ?? DEFAULT_EASE

  if (q < 3) {
    // Lapse: relearn from scratch, due again the same day.
    repetitions = 0
    intervalDays = 0
  } else {
    if (repetitions === 0) intervalDays = 1
    else if (repetitions === 1) intervalDays = 6
    else intervalDays = Math.round(intervalDays * easeFactor)
    repetitions += 1
  }

  // Standard SM-2 ease update, clamped to a 1.3 floor.
  easeFactor = Math.max(MIN_EASE, easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))

  // intervalDays 0 (a lapse) is due today; otherwise due at the start of the
  // target day so it surfaces in that day's "due" query.
  const nextReviewAt = intervalDays === 0 ? startOfDay(now) : addDays(startOfDay(now), intervalDays)

  return {
    repetitions,
    intervalDays,
    easeFactor,
    status: q < 3 ? WordStatus.NOT_KNOWN : WordStatus.KNOWN,
    nextReviewAt,
    correct: q >= 3,
    hard: answer === 'HARD',
  }
}
