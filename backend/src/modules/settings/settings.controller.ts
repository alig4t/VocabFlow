import { Request, Response } from 'express'
import { z } from 'zod'
import { CardOrder, ReviewMode } from '@prisma/client'
import { SettingsService } from './settings.service'
import { ValidationError } from '../../shared/errors'

const updateSchema = z
  .object({
    studyDirection: z.nativeEnum(ReviewMode).optional(),
    autoPlayAudio: z.boolean().optional(),
    showPhonetics: z.boolean().optional(),
    showExamples: z.boolean().optional(),
    cardOrder: z.nativeEnum(CardOrder).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'no fields to update' })

export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  get = async (req: Request, res: Response): Promise<void> => {
    const settings = await this.service.get(req.user!.sub)
    res.json({ success: true, data: settings })
  }

  update = async (req: Request, res: Response): Promise<void> => {
    const parsed = updateSchema.safeParse(req.body)
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      throw new ValidationError(message)
    }
    const settings = await this.service.update(req.user!.sub, parsed.data)
    res.json({ success: true, data: settings })
  }
}
