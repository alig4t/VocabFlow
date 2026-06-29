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
