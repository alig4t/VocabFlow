import api from '@/lib/axios'
import { API_ENDPOINTS } from '@/config/api'
import type { Word, WordFilters, WordExample, LearningModule, PaginatedWords } from '@/types'

export interface CreateWordData {
  eng: string
  per: string
  description?: string
  primaryExample?: string
  primaryExampleTrs?: string
  pronunciationAudio?: string
  chapter?: number
  unit?: number
  lessonId?: string
  moduleId: string
}

export type UpdateWordData = Partial<CreateWordData>

export interface CreateExampleData {
  engSentence: string
  perTranslation: string
  order?: number
}

export type UpdateExampleData = Partial<CreateExampleData>

export const vocabularyService = {
  getWords(filters: WordFilters): Promise<PaginatedWords> {
    const params: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined) {
        params[key] = value
      }
    }
    return api
      .get<PaginatedWords>(API_ENDPOINTS.words.list, { params })
      .then((res) => res.data)
  },

  getWord(id: string): Promise<Word> {
    return api.get<Word>(API_ENDPOINTS.words.detail(id)).then((res) => res.data)
  },

  getModules(): Promise<LearningModule[]> {
    return api.get<LearningModule[]>(API_ENDPOINTS.words.modules).then((res) => res.data)
  },

  createWord(data: CreateWordData): Promise<Word> {
    return api.post<Word>(API_ENDPOINTS.words.list, data).then((res) => res.data)
  },

  updateWord(id: string, data: UpdateWordData): Promise<Word> {
    return api.put<Word>(API_ENDPOINTS.words.detail(id), data).then((res) => res.data)
  },

  deleteWord(id: string): Promise<void> {
    return api.delete(API_ENDPOINTS.words.detail(id)).then((res) => res.data)
  },

  addExample(wordId: string, data: CreateExampleData): Promise<WordExample> {
    return api
      .post<WordExample>(API_ENDPOINTS.words.examples(wordId), data)
      .then((res) => res.data)
  },

  updateExample(
    wordId: string,
    exampleId: string,
    data: UpdateExampleData,
  ): Promise<WordExample> {
    return api
      .put<WordExample>(API_ENDPOINTS.words.example(wordId, exampleId), data)
      .then((res) => res.data)
  },

  deleteExample(wordId: string, exampleId: string): Promise<void> {
    return api
      .delete(API_ENDPOINTS.words.example(wordId, exampleId))
      .then((res) => res.data)
  },
}
