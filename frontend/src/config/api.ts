export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const API_ENDPOINTS = {
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    me: '/auth/me',
  },
  words: {
    list: '/words',
    modules: '/words/modules',
    detail: (id: string) => `/words/${id}`,
    examples: (id: string) => `/words/${id}/examples`,
    example: (id: string, exId: string) => `/words/${id}/examples/${exId}`,
  },
  books: {
    list: '/books',
    simple: '/books/simple',
    detail: (id: string) => `/books/${id}`,
    volumes: (bookId: string) => `/books/${bookId}/volumes`,
    volumesSimple: (bookId: string) => `/books/${bookId}/volumes/simple`,
    volume: (bookId: string, volumeId: string) => `/books/${bookId}/volumes/${volumeId}`,
    lessons: (bookId: string, volumeId: string) => `/books/${bookId}/volumes/${volumeId}/lessons`,
    lessonsSimple: (bookId: string, volumeId: string) => `/books/${bookId}/volumes/${volumeId}/lessons/simple`,
    lesson: (bookId: string, volumeId: string, lessonId: string) =>
      `/books/${bookId}/volumes/${volumeId}/lessons/${lessonId}`,
  },
  progress: {
    update: (wordId: string) => `/progress/words/${wordId}`,
    stats: '/progress/stats',
    reset: '/progress/reset',
  },
  synonyms: {
    get: (wordId: string) => `/synonyms/words/${wordId}`,
  },
} as const
