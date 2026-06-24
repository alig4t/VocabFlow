import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export class UserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } })
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } })
  }

  async update(id: string, data: { name?: string; email?: string }) {
    return prisma.user.update({ where: { id }, data })
  }

  async updatePassword(id: string, passwordHash: string) {
    return prisma.user.update({ where: { id }, data: { passwordHash } })
  }
}
