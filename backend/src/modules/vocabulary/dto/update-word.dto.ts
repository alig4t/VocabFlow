import { z } from 'zod'
import { createWordSchema } from './create-word.dto'

export const updateWordSchema = createWordSchema.partial().omit({ examples: true })
export type UpdateWordDto = z.infer<typeof updateWordSchema>

export const createExampleSchema = z.object({
  engSentence: z.string().min(1),
  perTranslation: z.string().min(1),
  order: z.number().int().default(0),
})
export type CreateExampleDto = z.infer<typeof createExampleSchema>
