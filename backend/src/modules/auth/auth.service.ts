import { randomUUID } from 'crypto'
import { AuthRepository } from './auth.repository'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { hashPassword, comparePassword } from '../../shared/utils/password.util'
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../../shared/utils/jwt.util'
import { ConflictError, UnauthorizedError } from '../../shared/errors'
import { config } from '../../config'
import { Role } from '../../shared/types'

interface AuthTokens {
  accessToken: string
  refreshToken: string
}

interface AuthUser {
  id: string
  email: string
  name: string
  role: Role
}

interface AuthResult extends AuthTokens {
  user: AuthUser
}

function msFromExpiresIn(value: string): number {
  const unit = value.slice(-1)
  const amount = parseInt(value.slice(0, -1), 10)
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  }
  return amount * (multipliers[unit] ?? 1000)
}

export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  private buildTokens(userId: string, email: string, role: Role): AuthTokens {
    const tokenId = randomUUID()
    const accessToken = generateAccessToken({ sub: userId, email, role })
    const refreshToken = generateRefreshToken(userId, tokenId)
    return { accessToken, refreshToken }
  }

  private refreshTokenExpiresAt(): Date {
    const ms = msFromExpiresIn(config.jwt.refreshExpiresIn)
    return new Date(Date.now() + ms)
  }

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.authRepository.findUserByEmail(dto.email)
    if (existing) {
      throw new ConflictError('Email is already registered')
    }

    const passwordHash = await hashPassword(dto.password)
    const user = await this.authRepository.createUser({
      email: dto.email,
      passwordHash,
      name: dto.name,
    })

    const { accessToken, refreshToken } = this.buildTokens(
      user.id,
      user.email,
      user.role,
    )

    await this.authRepository.saveRefreshToken(
      user.id,
      refreshToken,
      this.refreshTokenExpiresAt(),
    )

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      accessToken,
      refreshToken,
    }
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.authRepository.findUserByEmail(dto.email)
    if (!user) {
      throw new UnauthorizedError('Invalid email or password')
    }

    const passwordValid = await comparePassword(dto.password, user.passwordHash)
    if (!passwordValid) {
      throw new UnauthorizedError('Invalid email or password')
    }

    const { accessToken, refreshToken } = this.buildTokens(
      user.id,
      user.email,
      user.role,
    )

    await this.authRepository.saveRefreshToken(
      user.id,
      refreshToken,
      this.refreshTokenExpiresAt(),
    )

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      accessToken,
      refreshToken,
    }
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: { sub: string }
    try {
      payload = verifyRefreshToken(refreshToken)
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token')
    }

    const stored = await this.authRepository.findRefreshToken(refreshToken)
    if (!stored) {
      throw new UnauthorizedError('Refresh token not found or already revoked')
    }

    if (stored.expiresAt < new Date()) {
      await this.authRepository.deleteRefreshToken(refreshToken)
      throw new UnauthorizedError('Refresh token has expired')
    }

    if (stored.userId !== payload.sub) {
      throw new UnauthorizedError('Refresh token mismatch')
    }

    const { user } = stored

    await this.authRepository.deleteRefreshToken(refreshToken)

    const tokens = this.buildTokens(user.id, user.email, user.role)

    await this.authRepository.saveRefreshToken(
      user.id,
      tokens.refreshToken,
      this.refreshTokenExpiresAt(),
    )

    return tokens
  }

  async logout(refreshToken: string): Promise<void> {
    const stored = await this.authRepository.findRefreshToken(refreshToken)
    if (stored) {
      await this.authRepository.deleteRefreshToken(refreshToken)
    }
  }
}
