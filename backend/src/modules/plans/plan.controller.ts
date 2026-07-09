import { Request, Response } from 'express'
import { z } from 'zod'
import { PlanService } from './plan.service'
import { ValidationError } from '../../shared/errors'

const createSchema = z.object({
  volumeId: z.string().min(1),
  dailyNewWords: z.number().int().positive(),
  dailyGoal: z.number().int().positive().optional(),
})

const updateSchema = z.object({
  dailyNewWords: z.number().int().positive().optional(),
  dailyGoal: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
})

function parseOrThrow<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
    throw new ValidationError(message)
  }
  return parsed.data
}

export class PlanController {
  constructor(private readonly service: PlanService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const plans = await this.service.list(req.user!.sub)
    res.json({ success: true, data: plans })
  }

  create = async (req: Request, res: Response): Promise<void> => {
    const { volumeId, dailyNewWords, dailyGoal } = parseOrThrow(createSchema, req.body)
    const result = await this.service.create(
      req.user!.sub,
      volumeId,
      dailyNewWords,
      dailyGoal ?? dailyNewWords * 3,
    )
    res.status(201).json({ success: true, data: result })
  }

  update = async (req: Request, res: Response): Promise<void> => {
    const data = parseOrThrow(updateSchema, req.body)
    const result = await this.service.update(req.user!.sub, req.params.id, data)
    res.json({ success: true, data: result })
  }

  remove = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.remove(req.user!.sub, req.params.id)
    res.json({ success: true, data: result })
  }
}
