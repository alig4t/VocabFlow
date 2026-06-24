import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../utils/jwt.util'
import { UnauthorizedError } from '../errors'

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid Authorization header')
  }

  const token = authHeader.slice(7)

  try {
    const decoded = verifyAccessToken(token)
    req.user = decoded
    next()
  } catch {
    throw new UnauthorizedError('Invalid or expired access token')
  }
}
