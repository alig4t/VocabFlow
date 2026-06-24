import { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { UnauthorizedError } from '../../shared/errors'

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as RegisterDto
    const result = await this.authService.register(dto)

    res.status(201).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    })
  }

  login = async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as LoginDto
    const result = await this.authService.login(dto)

    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    })
  }

  refresh = async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body as { refreshToken: string }

    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token is required')
    }

    const tokens = await this.authService.refresh(refreshToken)

    res.status(200).json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    })
  }

  logout = async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body as { refreshToken: string }

    if (refreshToken) {
      await this.authService.logout(refreshToken)
    }

    res.status(200).json({
      success: true,
      message: 'Logged out',
    })
  }

  getMe = (req: Request, res: Response): void => {
    if (!req.user) {
      throw new UnauthorizedError()
    }

    res.status(200).json({
      success: true,
      data: {
        user: req.user,
      },
    })
  }
}
