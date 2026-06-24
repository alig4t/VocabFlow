import { Request, Response } from 'express'
import { z } from 'zod'
import { ReviewMode, WordStatus } from '@prisma/client'
import { ProgressService } from './progress.service'
import { ValidationError, UnauthorizedError } from '../../shared/errors'

const progressService = new ProgressService()

const updateStatusSchema = z.object({
  reviewMode: z.nativeEnum(ReviewMode),
  status: z.nativeEnum(WordStatus),
})

const resetSchema = z.object({
  reviewMode: z.nativeEnum(ReviewMode).optional(),
})

export async function updateStatus(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError()

  const parsed = updateStatusSchema.safeParse(req.body)
  if (!parsed.success) {
    const message = parsed.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('; ')
    throw new ValidationError(message)
  }

  const { reviewMode, status } = parsed.data
  const { wordId } = req.params

  const progress = await progressService.updateWordStatus(
    req.user.sub,
    wordId,
    reviewMode,
    status,
  )

  res.json({ success: true, data: progress })
}

export async function getStats(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError()

  const stats = await progressService.getStats(req.user.sub)

  res.json({ success: true, data: stats })
}

export async function resetProgress(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) throw new UnauthorizedError()

  const parsed = resetSchema.safeParse(req.body)
  if (!parsed.success) {
    const message = parsed.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('; ')
    throw new ValidationError(message)
  }

  const { reviewMode } = parsed.data

  await progressService.resetProgress(req.user.sub, reviewMode)

  res.json({ success: true, message: 'Progress reset successfully' })
}
