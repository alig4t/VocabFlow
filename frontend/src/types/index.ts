export type Role = 'USER' | 'ADMIN'
export type ReviewMode = 'EN_TO_FA' | 'FA_TO_EN'
export type WordStatus = 'NOT_READ' | 'KNOWN' | 'NOT_KNOWN'

export interface User {
  id: string
  email: string
  name: string
  role: Role
  createdAt: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}

export interface Book {
  id: string
  title: string
  description?: string
  coverImage?: string
  createdAt: string
  updatedAt: string
  _count?: { volumes: number }
  volumes?: Volume[]
}

export interface BookSimple {
  id: string
  title: string
}

export interface Volume {
  id: string
  bookId: string
  volumeNumber: number
  title?: string
  coverImage?: string
  createdAt: string
  _count?: { lessons: number }
  lessons?: Lesson[]
}

export interface VolumeSimple {
  id: string
  volumeNumber: number
  title?: string
}

export interface Lesson {
  id: string
  volumeId: string
  lessonNumber: number
  title?: string
  createdAt: string
  _count?: { words: number }
}

export interface LessonSimple {
  id: string
  lessonNumber: number
  title?: string
}

export interface WordLesson {
  id: string
  lessonNumber: number
  title?: string
  volume: {
    id: string
    volumeNumber: number
    title?: string
    book: { id: string; title: string }
  }
}

export interface Word {
  id: string
  eng: string
  per: string
  description?: string
  pronunciation?: string
  partOfSpeech?: string
  wordForms?: string
  synonyms: string[]
  antonyms: string[]
  primaryExample?: string
  primaryExampleTrs?: string
  pronunciationAudio?: string
  chapter?: number
  unit?: number
  lessonId?: string
  moduleId: string
  lesson?: WordLesson
  examples: WordExample[]
  phrases: WordPhrase[]
  progress?: UserWordProgress[]
  createdAt: string
  updatedAt: string
}

export interface WordExample {
  id: string
  wordId: string
  engSentence: string
  perTranslation: string
  order: number
}

export interface WordPhrase {
  id: string
  wordId: string
  patternEng: string
  patternPer: string
  order: number
  examples: WordPhraseExample[]
}

export interface WordPhraseExample {
  id: string
  phraseId: string
  engSentence: string
  perTranslation: string
  order: number
}

export interface UserWordProgress {
  id: string
  userId: string
  wordId: string
  reviewMode: ReviewMode
  status: WordStatus
}

export interface LearningModule {
  id: string
  name: string
  slug: string
  description?: string
  isActive: boolean
  order: number
}

export interface WordFilters {
  page?: number
  limit?: number
  chapter?: number
  unit?: number
  lessonId?: string
  volumeId?: string
  bookId?: string
  /** Restrict to any of several books (sent comma-separated). */
  bookIds?: string[]
  status?: WordStatus | 'ALL'
  mode?: ReviewMode
  sort?: 'chapter' | 'unit' | 'eng' | 'per'
  order?: 'asc' | 'desc'
  search?: string
}

export interface PaginatedWords {
  data: Word[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ProgressStats {
  EN_TO_FA: { KNOWN: number; NOT_KNOWN: number; NOT_READ: number; total: number }
  FA_TO_EN: { KNOWN: number; NOT_KNOWN: number; NOT_READ: number; total: number }
}

export interface SynonymResult {
  word: string
  similarity: number
  source: string
}

// ─── Watchlist Dashboard (feature: personalized learning) ──────────────────────

/** A book the user has added to their personal learning list, with progress. */
export interface WatchlistBook {
  id: string
  bookId: string
  title: string
  coverImage?: string
  totalWords: number
  knownWords: number
  unknownWords: number
  notReadWords: number
  reviewedToday: number
  /** ISO date of the last study session, or null if never studied. */
  lastStudiedAt: string | null
  /** Words currently due for review (spaced repetition). */
  dueCount: number
  /** Estimated days to finish at the user's recent pace. */
  estimatedDays: number
}

/** Cross-book user statistics shown in the global header strip. */
export interface DashboardGlobalStats {
  watchlistCount: number
  totalWordsLearned: number
  reviewsToday: number
  /** Consecutive days with at least one study session. */
  currentStreak: number
  avgStudyMinutes: number
  /** 0–100, share of reviews marked "known". */
  accuracyRate: number
}

/** One day of activity for the GitHub-style heatmap. */
export interface HeatmapDay {
  /** ISO date (YYYY-MM-DD). */
  date: string
  count: number
}

/** A book with words due, shown in the Continue Learning queue. */
export interface ReviewQueueItem {
  bookId: string
  title: string
  dueCount: number
}

export interface DashboardData {
  stats: DashboardGlobalStats
  watchlist: WatchlistBook[]
  heatmap: HeatmapDay[]
  queue: ReviewQueueItem[]
}

/** A book in the discovery/library view, with watchlist membership flag. */
export interface DiscoveryBook {
  id: string
  title: string
  description?: string
  coverImage?: string
  totalWords: number
  inWatchlist: boolean
}

// ─── Daily learning system (SM-2) ──────────────────────────────────────────────

export type CardOrder = 'SEQUENTIAL' | 'RANDOM'

/** The four answers offered during a daily study session. */
export type StudyAnswer = 'EASY' | 'HARD' | 'AGAIN' | 'SKIP'

/** A user's per-volume learning plan (the source of truth for "my list"). */
export interface LearningPlan {
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

/** One active volume's daily context, shown on Home and during the session. */
export interface StudyPlanMeta {
  planId: string
  volumeId: string
  bookTitle: string
  volumeTitle: string
  dailyNewWords: number
  dailyGoal: number
  currentLesson: number | null
  newToday: number
  continueLesson: boolean
}

/** Today's study queue: due reviews first, then new words, plus metadata. */
export interface StudyToday {
  due: Word[]
  new: Word[]
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

/** Result of applying an answer to a word. */
export interface StudyAnswerResult {
  wordId: string
  skipped: boolean
  status?: WordStatus
  nextReviewAt?: string
  correct?: boolean
}

/** Payload recorded at the end of a session (drives summary/streak/heatmap). */
export interface SessionSummary {
  startedAt: string
  endedAt: string
  durationSec: number
  reviewedCount: number
  correctCount: number
  wrongCount: number
  hardCount: number
  skippedCount: number
  newCount: number
}

export interface UserSettings {
  studyDirection: ReviewMode
  autoPlayAudio: boolean
  showPhonetics: boolean
  showExamples: boolean
  cardOrder: CardOrder
}
