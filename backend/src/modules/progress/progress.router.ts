import { Router } from 'express'
import { authenticate } from '../../shared/middleware/auth.middleware'
import {
  updateStatus,
  getStats,
  resetProgress,
} from './progress.controller'

export const progressRouter = Router()

progressRouter.put('/words/:wordId', authenticate, updateStatus)
progressRouter.get('/stats', authenticate, getStats)
progressRouter.delete('/reset', authenticate, resetProgress)
