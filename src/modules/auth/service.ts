import { PrismaClient, UserRole } from '@prisma/client'
import { FastifyInstance } from 'fastify'
import { hashPassword, verifyPassword } from '../../utils/password.js'
import crypto from 'node:crypto'

export class AuthService {
  constructor(private prisma: PrismaClient, private fastify: FastifyInstance) {}

  async register(data: { email: string; password: string; fullName: string; phone?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } })
    if (existing) throw new Error('EMAIL_EXISTS')

    const passwordHash = await hashPassword(data.password)

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        phone: data.phone,
        role: UserRole.PATIENT,
      },
      select: { id: true, email: true, fullName: true, role: true, createdAt: true },
    })

    return this.generateTokens(user)
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user || !user.isActive) throw new Error('INVALID_CREDENTIALS')

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) throw new Error('INVALID_CREDENTIALS')

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    return this.generateTokens(user)
  }

  async refresh(refreshToken: string) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    })

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new Error('INVALID_REFRESH_TOKEN')
    }

    // Rotar refresh token
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    })

    return this.generateTokens(stored.user)
  }

  async logout(refreshToken: string) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    })
  }

  private async generateTokens(user: { id: string; email: string; role: UserRole; specialistId?: string }) {
    const payload = { id: user.id, email: user.email, role: user.role, specialistId: user.specialistId }

    const accessToken = this.fastify.jwt.sign(payload)
    const refreshToken = crypto.randomBytes(64).toString('hex')
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
      },
    })

    return { accessToken, refreshToken, user: payload }
  }
}