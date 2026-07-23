import { Request, Response } from 'express'
import { z } from 'zod'
import { StudyService } from './study.service'
import { ValidationError } from '../../shared/errors'

const answerSchema = z.object({
  wordId: z.string().min(1),
  answer: z.enum(['EASY', 'HARD', 'AGAIN', 'SKIP']),
})

const sessionSchema = z.object({
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date(),
  durationSec: z.number().int().nonnegative(),
  reviewedCount: z.number().int().nonnegative(),
  correctCount: z.number().int().nonnegative(),
  wrongCount: z.number().int().nonnegative(),
  hardCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
  newCount: z.number().int().nonnegative(),
})

function parseOrThrow<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
    throw new ValidationError(message)
  }
  return parsed.data
}

export class StudyController {
  constructor(private readonly service: StudyService) {}

  getToday = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.getToday(req.user!.sub)
    res.json({ success: true, data })
  }

  getTodayNew = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.getTodayNewWords(req.user!.sub)
    res.json({ success: true, data })
  }

  answer = async (req: Request, res: Response): Promise<void> => {
    const { wordId, answer } = parseOrThrow(answerSchema, req.body)
    const result = await this.service.answer(req.user!.sub, wordId, answer)
    res.json({ success: true, data: result })
  }

  recordSession = async (req: Request, res: Response): Promise<void> => {
    const input = parseOrThrow(sessionSchema, req.body)
    const session = await this.service.recordSession(req.user!.sub, input)
    res.status(201).json({ success: true, data: { id: session.id } })
  }
}
