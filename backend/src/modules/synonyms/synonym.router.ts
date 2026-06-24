import { Router } from 'express'
import { authenticate } from '../../shared/middleware/auth.middleware'
import { getSynonyms } from './synonym.controller'

export const synonymRouter = Router()

synonymRouter.get('/words/:wordId', authenticate, getSynonyms)
