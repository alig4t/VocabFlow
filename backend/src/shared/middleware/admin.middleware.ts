import { Request, Response, NextFunction } from 'express'
import { ForbiddenError } from '../errors'

/**
 * Requires authenticate middleware to run first so that req.user is populated.
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user || req.user.role !== 'ADMIN') {
    throw new ForbiddenError('Admin access required')
  }

  next()
}
