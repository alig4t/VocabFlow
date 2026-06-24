import { Router } from 'express'
import { authenticate } from '../../shared/middleware/auth.middleware'
import { requireAdmin } from '../../shared/middleware/admin.middleware'
import { validate } from '../../shared/middleware/validate.middleware'
import { createWordSchema } from './dto/create-word.dto'
import { updateWordSchema, createExampleSchema } from './dto/update-word.dto'
import { WordRepository } from './word.repository'
import { WordService } from './word.service'
import { WordController } from './word.controller'

const wordRepository = new WordRepository()
const wordService = new WordService(wordRepository)
const wordController = new WordController(wordService)

export const wordRouter = Router()

// Public / optionally-authenticated routes
wordRouter.get('/', authenticate, wordController.getWords)
wordRouter.get('/modules', wordController.getModules)
wordRouter.get('/:id', wordController.getWord)

// Admin-only routes — words
wordRouter.post(
  '/',
  authenticate,
  requireAdmin,
  validate(createWordSchema),
  wordController.createWord,
)

wordRouter.put(
  '/:id',
  authenticate,
  requireAdmin,
  validate(updateWordSchema),
  wordController.updateWord,
)

wordRouter.delete(
  '/:id',
  authenticate,
  requireAdmin,
  wordController.deleteWord,
)

// Admin-only routes — examples
wordRouter.post(
  '/:id/examples',
  authenticate,
  requireAdmin,
  validate(createExampleSchema),
  wordController.addExample,
)

wordRouter.put(
  '/:id/examples/:exampleId',
  authenticate,
  requireAdmin,
  wordController.updateExample,
)

wordRouter.delete(
  '/:id/examples/:exampleId',
  authenticate,
  requireAdmin,
  wordController.deleteExample,
)
