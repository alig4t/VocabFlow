import { Role, ReviewMode, WordStatus } from '@prisma/client'

export { Role, ReviewMode, WordStatus }

export interface JwtPayload {
  sub: string
  email: string
  role: Role
  iat?: number
  exp?: number
}

export interface RefreshTokenPayload {
  sub: string
  jti: string
  iat?: number
  exp?: number
}

export interface PaginationQuery {
  page?: number
  limit?: number
}

export interface WordFilters extends PaginationQuery {
  chapter?: number
  unit?: number
  lessonId?: string
  volumeId?: string
  bookId?: string
  status?: WordStatus
  mode?: ReviewMode
  sort?: 'chapter' | 'unit' | 'eng' | 'per'
  order?: 'asc' | 'desc'
  search?: string
}

export interface ApiResponse<T = void> {
  success: boolean
  data?: T
  message?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}
