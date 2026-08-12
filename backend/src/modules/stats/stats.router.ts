import { Router } from 'express'
import { authenticate } from '../../shared/middleware/auth.middleware'
import { StatsRepository } from './stats.repository'
import { StatsService } from './stats.service'
import { StatsController } from './stats.controller'

const statsRepository = new StatsRepository()
const statsService = new StatsService(statsRepository)
const statsController = new StatsController(statsService)

export const statsRouter = Router()

statsRouter.use(authenticate)

statsRouter.get('/', statsController.getStats)
