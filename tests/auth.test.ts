import { describe, it, expect, beforeEach } from 'vitest'
import { app, prisma, registerAndLogin, loginAs } from './setup.js'
import { createTestUser, createTestSpecialist, createAvailabilityRule } from './utils/factories.js'
import { UserRole, Specialty } from '@prisma/client'

describe('Auth Module', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new patient', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'newpatient@example.com',
          password: 'SecurePass123!',
          fullName: 'Nuevo Paciente',
          phone: '11-2222-3333',
        },
      })

      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.body)
      expect(body).toHaveProperty('accessToken')
      expect(body).toHaveProperty('user')
      expect(body.user.email).toBe('newpatient@example.com')
      expect(body.user.role).toBe('PATIENT')
      // Verificar cookie en header set-cookie
      const setCookie = res.headers['set-cookie'] || ''
      expect(setCookie).toContain('refreshToken=')
    })

    it('should reject duplicate email', async () => {
      await createTestUser(prisma, { email: 'dup@example.com' })

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'dup@example.com',
          password: 'SecurePass123!',
          fullName: 'Otro',
        },
      })

      expect(res.statusCode).toBe(409)
    })

    it('should validate password strength', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'weak@example.com',
          password: '123',
          fullName: 'Weak',
        },
      })
      expect(res.statusCode).toBe(400)
    })
  })

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await createTestUser(prisma, {
        email: 'login@test.com',
        password: 'CorrectPass123!',
        fullName: 'Login User',
      })
    })

    it('should login with correct credentials', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'login@test.com', password: 'CorrectPass123!' },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.accessToken).toBeDefined()
      // Verificar cookie en header set-cookie
      const setCookie = res.headers['set-cookie'] || ''
      expect(setCookie).toContain('refreshToken=')
    })

    it('should reject wrong password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'login@test.com', password: 'WrongPass123!' },
      })
      expect(res.statusCode).toBe(401)
    })

    it('should reject inactive user', async () => {
      await createTestUser(prisma, { email: 'inactive@test.com', password: 'Pass123!', isActive: false })
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'inactive@test.com', password: 'Pass123!' },
      })
      expect(res.statusCode).toBe(401)
    })
  })

  describe('POST /api/v1/auth/refresh', () => {
    it('should rotate refresh token', async () => {
      const { refreshToken } = await registerAndLogin({
        email: 'refresh@test.com',
        password: 'Pass123!',
        fullName: 'Refresh User',
      })

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        cookies: { refreshToken: refreshToken! },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.accessToken).toBeDefined()
      // The new token travels only in the httpOnly cookie, never in JSON
      expect(body.refreshToken).toBeUndefined()
      const rotated = String(res.headers['set-cookie']).match(/refreshToken=([^;]+)/)?.[1]
      expect(rotated).toBeDefined()
      expect(rotated).not.toBe(refreshToken)
    })

    it('should not accept the refresh token from the body', async () => {
      const { refreshToken } = await registerAndLogin({
        email: 'bodyrefresh@test.com',
        password: 'Pass123!',
        fullName: 'Body Refresh',
      })
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken },
      })
      expect(res.statusCode).toBe(401)
    })

    it('should reject refresh for inactive users', async () => {
      const { refreshToken, user } = await registerAndLogin({
        email: 'inactive@test.com',
        password: 'Pass123!',
        fullName: 'Inactive User',
      })
      await prisma.user.update({ where: { id: user.id }, data: { isActive: false } })
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        cookies: { refreshToken: refreshToken! },
      })
      expect(res.statusCode).toBe(401)
    })

    it('should revoke all user tokens when a revoked token is reused', async () => {
      const { refreshToken, user } = await registerAndLogin({
        email: 'theft@test.com',
        password: 'Pass123!',
        fullName: 'Theft User',
      })
      const first = await app.inject({ method: 'POST', url: '/api/v1/auth/refresh', cookies: { refreshToken: refreshToken! } })
      const rotated = String(first.headers['set-cookie']).match(/refreshToken=([^;]+)/)![1]

      // Attacker replays the old (revoked) token
      const replay = await app.inject({ method: 'POST', url: '/api/v1/auth/refresh', cookies: { refreshToken: refreshToken! } })
      expect(replay.statusCode).toBe(401)

      // The legitimate rotated token is now dead too
      const legit = await app.inject({ method: 'POST', url: '/api/v1/auth/refresh', cookies: { refreshToken: rotated } })
      expect(legit.statusCode).toBe(401)
      const live = await prisma.refreshToken.count({ where: { userId: user.id, revokedAt: null } })
      expect(live).toBe(0)
    })

    it('should reject reused refresh token', async () => {
      const { refreshToken } = await registerAndLogin({
        email: 'reuse@test.com',
        password: 'Pass123!',
        fullName: 'Reuse User',
      })

      // Primer uso
      await app.inject({ method: 'POST', url: '/api/v1/auth/refresh', cookies: { refreshToken: refreshToken! } })

      // Segundo uso del mismo token (ya revocado)
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        cookies: { refreshToken: refreshToken! },
      })
      expect(res.statusCode).toBe(401)
    })
  })

  describe('GET /api/v1/auth/me', () => {
    it('should return current user with specialistId if specialist', async () => {
      const specialist = await createTestSpecialist(prisma, { specialty: Specialty.CIRUGIA })
      const { accessToken } = await loginAs(specialist.user.email, 'Test1234!')

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { authorization: `Bearer ${accessToken}` },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.user.specialistId).toBe(specialist.id)
      expect(body.user.role).toBe('SPECIALIST')
    })
  })
})