import { z } from 'zod'

export const createWordSchema = z.object({
  eng: z.string().min(1).max(255),
  per: z.string().min(1).max(255),
  description: z.string().optional(),
  primaryExample: z.string().optional(),
  primaryExampleTrs: z.string().optional(),
  chapter: z.number().int().positive().optional(),
  unit: z.number().int().positive().optional(),
  moduleId: z.string().cuid(),
  examples: z
    .array(
      z.object({
        engSentence: z.string().min(1),
        perTranslation: z.string().min(1),
        order: z.number().int().default(0),
      }),
    )
    .optional(),
})

export type CreateWordDto = z.infer<typeof createWordSchema>
