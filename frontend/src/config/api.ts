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
  progress: {
    update: (wordId: string) => `/progress/words/${wordId}`,
    stats: '/progress/stats',
    reset: '/progress/reset',
  },
  synonyms: {
    get: (wordId: string) => `/synonyms/words/${wordId}`,
  },
} as const
