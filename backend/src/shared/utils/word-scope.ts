import { Prisma } from '@prisma/client'
import { WordFilters } from '../types'

/** Content scope shared by word browsing and manual-progress counts. */
export function wordScopeWhere(filters: WordFilters): Prisma.WordWhereInput {
  const { chapter, unit, lessonId, volumeId, bookId, bookIds, search } = filters
  return {
    ...(chapter !== undefined && { chapter }),
    ...(unit !== undefined && { unit }),
    ...(lessonId !== undefined && { lessonId }),
    ...((volumeId !== undefined || bookId !== undefined || bookIds?.length) && {
      lesson: {
        ...(volumeId !== undefined && { volumeId }),
        ...(bookId !== undefined
          ? { volume: { bookId } }
          : bookIds?.length
            ? { volume: { bookId: { in: bookIds } } }
            : {}),
      },
    }),
    ...(search && {
      OR: [
        { eng: { contains: search, mode: 'insensitive' } },
        { per: { contains: search, mode: 'insensitive' } },
      ],
    }),
  }
}
