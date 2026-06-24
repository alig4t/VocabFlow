import { Request, Response } from 'express'
import { z } from 'zod'
import { UserService } from './user.service'
import { UnauthorizedError, ValidationError } from '../../shared/errors'

const userService = new UserService()

const updateProfileSchema = z
  .object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
  })
  .refine((data) => data.name !== undefined || data.email !== undefined, {
    message: 'At least one field (name or email) must be provided',
  })

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters'),
})

export async function getMe(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError()

  const user = await userService.getMe(req.user.sub)

  res.json({ success: true, data: user })
}

export async function updateProfile(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) throw new UnauthorizedError()

  const parsed = updateProfileSchema.safeParse(req.body)
  if (!parsed.success) {
    const message = parsed.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('; ')
    throw new ValidationError(message)
  }

  const user = await userService.updateProfile(req.user.sub, parsed.data)

  res.json({ success: true, data: user })
}

export async function changePassword(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) throw new UnauthorizedError()

  const parsed = changePasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    const message = parsed.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('; ')
    throw new ValidationError(message)
  }

  const { currentPassword, newPassword } = parsed.data

  await userService.changePassword(req.user.sub, currentPassword, newPassword)

  res.json({ success: true, message: 'Password changed successfully' })
}
