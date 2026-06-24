import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { AuthRepository } from './auth.repository'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { authenticate } from '../../shared/middleware/auth.middleware'
import { validate } from '../../shared/middleware/validate.middleware'
import { registerSchema } from './dto/register.dto'
import { loginSchema } from './dto/login.dto'

const prisma = new PrismaClient()
const authRepository = new AuthRepository(prisma)
const authService = new AuthService(authRepository)
const authController = new AuthController(authService)

const authRouter = Router()

authRouter.post('/register', validate(registerSchema), authController.register)
authRouter.post('/login', validate(loginSchema), authController.login)
authRouter.post('/refresh', authController.refresh)
authRouter.post('/logout', authController.logout)
authRouter.get('/me', authenticate, authController.getMe)

export { authRouter }
