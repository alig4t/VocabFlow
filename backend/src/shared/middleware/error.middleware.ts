import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { AppError } from '../errors'

export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  // next is required by Express to recognise this as an error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
): void {
  const isDevelopment = process.env.NODE_ENV === 'development'

  // Log errors in development
  if (isDevelopment) {
    console.error('[Error]', err)
  }

  // Known application error
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
    })
    return
  }

  // Zod validation error
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }))

    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    })
    return
  }

  // Prisma known request errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      // Unique constraint violation
      const fields = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'field'
      res.status(409).json({
        success: false,
        message: `A record with that ${fields} already exists`,
        code: 'CONFLICT',
      })
      return
    }

    if (err.code === 'P2025') {
      // Record not found
      res.status(404).json({
        success: false,
        message: 'Record not found',
        code: 'NOT_FOUND',
      })
      return
    }
  }

  // Fallback: 500 Internal Server Error
  res.status(500).json({
    success: false,
    message: isDevelopment && err instanceof Error
      ? err.message
      : 'Internal server error',
    code: 'INTERNAL_ERROR',
  })
}
