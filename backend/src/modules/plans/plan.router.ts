import { Router } from 'express'
import { authenticate } from '../../shared/middleware/auth.middleware'
import { PlanRepository } from './plan.repository'
import { PlanService } from './plan.service'
import { PlanController } from './plan.controller'

const planRepository = new PlanRepository()
const planService = new PlanService(planRepository)
const planController = new PlanController(planService)

export const planRouter = Router()

planRouter.use(authenticate)

planRouter.get('/', planController.list)
planRouter.post('/', planController.create)
planRouter.patch('/:id', planController.update)
planRouter.delete('/:id', planController.remove)
