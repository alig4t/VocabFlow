import { z } from 'zod'

const phraseExampleSchema = z.object({
  engSentence: z.string().min(1),
  perTranslation: z.string().min(1),
  order: z.number().int().default(0),
})

const phraseSchema = z.object({
  patternEng: z.string().min(1),
  patternPer: z.string().default(''),
  order: z.number().int().default(0),
  examples: z.array(phraseExampleSchema).optional(),
})

export const createWordSchema = z.object({
  eng: z.string().min(1).max(255),
  per: z.string().min(1).max(255),
  description: z.string().optional(),
  descriptionPer: z.string().optional(),
  pronunciation: z.string().optional(),
  partOfSpeech: z.string().optional(),
  wordForms: z.string().optional(),
  synonyms: z.array(z.string()).optional(),
  antonyms: z.array(z.string()).optional(),
  primaryExample: z.string().optional(),
  primaryExampleTrs: z.string().optional(),
  pronunciationAudio: z.string().optional(),
  chapter: z.number().int().positive().optional(),
  unit: z.number().int().positive().optional(),
  lessonId: z.string().optional(),
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
  phrases: z.array(phraseSchema).optional(),
})

export type CreateWordDto = z.infer<typeof createWordSchema>
