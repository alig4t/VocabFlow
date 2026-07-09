import { Router } from 'express'
import { authenticate } from '../../shared/middleware/auth.middleware'
import { DashboardRepository } from './dashboard.repository'
import { DashboardService } from './dashboard.service'
import { DashboardController } from './dashboard.controller'

const dashboardRepository = new DashboardRepository()
const dashboardService = new DashboardService(dashboardRepository)
const dashboardController = new DashboardController(dashboardService)

export const dashboardRouter = Router()

dashboardRouter.use(authenticate)

dashboardRouter.get('/', dashboardController.getDashboard)
