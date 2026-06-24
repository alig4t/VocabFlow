import { UserRepository } from './user.repository'
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../../shared/errors'
import {
  hashPassword,
  comparePassword,
} from '../../shared/utils/password.util'

export class UserService {
  private readonly repository: UserRepository

  constructor(repository = new UserRepository()) {
    this.repository = repository
  }

  async getMe(userId: string) {
    const user = await this.repository.findById(userId)
    if (!user) throw new NotFoundError('User')

    const { passwordHash: _, ...safeUser } = user
    return safeUser
  }

  async updateProfile(
    userId: string,
    data: { name?: string; email?: string },
  ) {
    if (data.email) {
      const existing = await this.repository.findByEmail(data.email)
      if (existing && existing.id !== userId) {
        throw new ConflictError('Email is already in use')
      }
    }

    const updated = await this.repository.update(userId, data)
    const { passwordHash: _, ...safeUser } = updated
    return safeUser
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.repository.findById(userId)
    if (!user) throw new NotFoundError('User')

    const valid = await comparePassword(currentPassword, user.passwordHash)
    if (!valid) throw new ValidationError('Current password is incorrect')

    const passwordHash = await hashPassword(newPassword)
    await this.repository.updatePassword(userId, passwordHash)
  }
}
