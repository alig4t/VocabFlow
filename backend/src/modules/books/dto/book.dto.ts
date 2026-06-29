import { z } from 'zod'

export const createBookSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  coverImage: z.string().optional(),
})

export const updateBookSchema = createBookSchema.partial()

export const createVolumeSchema = z.object({
  volumeNumber: z.number().int().positive(),
  title: z.string().optional(),
  coverImage: z.string().optional(),
})

export const updateVolumeSchema = createVolumeSchema.partial()

export const createLessonSchema = z.object({
  lessonNumber: z.number().int().positive(),
  title: z.string().optional(),
})

export const updateLessonSchema = createLessonSchema.partial()

export type CreateBookDto = z.infer<typeof createBookSchema>
export type UpdateBookDto = z.infer<typeof updateBookSchema>
export type CreateVolumeDto = z.infer<typeof createVolumeSchema>
export type UpdateVolumeDto = z.infer<typeof updateVolumeSchema>
export type CreateLessonDto = z.infer<typeof createLessonSchema>
export type UpdateLessonDto = z.infer<typeof updateLessonSchema>
