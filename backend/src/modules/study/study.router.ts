import { Router } from 'express'
import { authenticate } from '../../shared/middleware/auth.middleware'
import { StudyRepository } from './study.repository'
import { StudyService } from './study.service'
import { StudyController } from './study.controller'

const studyRepository = new StudyRepository()
const studyService = new StudyService(studyRepository)
const studyController = new StudyController(studyService)

export const studyRouter = Router()

studyRouter.use(authenticate)

studyRouter.get('/today', studyController.getToday)
studyRouter.post('/answer', studyController.answer)
studyRouter.post('/session', studyController.recordSession)
