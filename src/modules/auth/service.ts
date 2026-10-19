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
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { specialist: { select: { id: true } } },
    })
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
      include: { user: { include: { specialist: { select: { id: true } } } } },
    })

    if (!stored) throw new Error('INVALID_REFRESH_TOKEN')

    // Reuse of an already-revoked token means it may have been stolen:
    // revoke every live token of that user (forces a fresh login everywhere).
    if (stored.revokedAt) {
      await this.revokeAllForUser(stored.userId)
      throw new Error('INVALID_REFRESH_TOKEN')
    }

    if (stored.expiresAt < new Date() || !stored.user.isActive) {
      throw new Error('INVALID_REFRESH_TOKEN')
    }

    // Atomic rotation: only one concurrent request can flip revokedAt from null
    const rotated = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    if (rotated.count !== 1) {
      await this.revokeAllForUser(stored.userId)
      throw new Error('INVALID_REFRESH_TOKEN')
    }

    return this.generateTokens(stored.user)
  }

  private async revokeAllForUser(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  async logout(refreshToken: string) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    })
  }

  private async generateTokens(user: { id: string; email: string; role: UserRole; fullName?: string | null; specialistId?: string | null; specialist?: { id: string } | null }) {
    const specialistId = user.specialistId ?? user.specialist?.id ?? null
    const payload = { id: user.id, email: user.email, role: user.role, specialistId }

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

    return { accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role, fullName: user.fullName ?? null, specialistId } }
  }
}