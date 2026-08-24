import { describe, it, expect, beforeEach } from 'vitest'
import { app, prisma, registerAndLogin, loginAs } from './setup.js'
import { createTestUser, createTestSpecialist, createAvailabilityRule } from './utils/factories.js'
import { UserRole, Specialty } from '@prisma/client'

describe('Specialists Module', () => {
  let adminToken: string
  let specialistToken: string
  let specialistId: string

  beforeEach(async () => {
    // Admin
    const admin = await createTestUser(prisma, app, { email: 'admin@test.com', role: UserRole.ADMIN })
    const adminLogin = await loginAs('admin@test.com', 'Test1234!')
    adminToken = adminLogin.accessToken

    // Especialista
    const spec = await createTestSpecialist(prisma, app, { specialty: Specialty.ORTODONCIA })
    specialistId = spec.id
    const specLogin = await loginAs(spec.user.email, 'Test1234!')
    specialistToken = specLogin.accessToken

    // Regla de disponibilidad
    await createAvailabilityRule(prisma, specialistId, { weekday: 1, startTime: '08:00', endTime: '14:00' })
  })

  describe('GET /api/v1/specialists', () => {
    it('should return active specialists publicly', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/specialists' })
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.specialists).toHaveLength(1)
      expect(body.specialists[0].specialty).toBe('ORTODONCIA')
    })

    it('should not return inactive specialists', async () => {
      await createTestSpecialist(prisma, app, { specialty: Specialty.ESTETICA, isActive: false })
      const res = await app.inject({ method: 'GET', url: '/api/v1/specialists' })
      const body = JSON.parse(res.body)
      expect(body.specialists).toHaveLength(1)
    })
  })

  describe('POST /api/v1/specialists (ADMIN)', () => {
    it('should create specialist with user account', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/specialists',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          email: 'newdoc@test.com',
          password: 'DocPass123!',
          fullName: 'Dr. Nuevo',
          licenseNumber: 'LIC-NEW-001',
          specialty: 'CIRUGIA',
        },
      })

      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.body)
      expect(body.specialist.licenseNumber).toBe('LIC-NEW-001')
      expect(body.specialist.specialty).toBe('CIRUGIA')
    })

    it('should reject duplicate license number', async () => {
      await createTestSpecialist(prisma, app, { licenseNumber: 'LIC-DUP' })
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/specialists',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          email: 'dup@test.com',
          password: 'Pass123!',
          fullName: 'Dr. Dup',
          licenseNumber: 'LIC-DUP',
          specialty: 'ESTETICA',
        },
      })
      expect(res.statusCode).toBe(409)
    })

    it('should forbid non-admin', async () => {
      const patient = await registerAndLogin({ email: 'pat@test.com', password: 'Pass123!', fullName: 'Patient' })
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/specialists',
        headers: { authorization: `Bearer ${patient.accessToken}` },
        payload: { email: 'x@x.com', password: 'x', fullName: 'x', licenseNumber: 'x', specialty: 'ORTODONCIA' },
      })
      expect(res.statusCode).toBe(403)
    })
  })

  describe('PATCH /api/v1/specialists/:id', () => {
    it('should allow specialist to update own profile', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/specialists/${specialistId}`,
        headers: { authorization: `Bearer ${specialistToken}` },
        payload: { bio: 'Nueva bio', phone: '11-9999-8888' },
      })
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.specialist.bio).toBe('Nueva bio')
    })

    it('should forbid other specialist', async () => {
      const other = await createTestSpecialist(prisma, app, { specialty: Specialty.ESTETICA })
      const otherLogin = await loginAs(other.user.email, 'Test1234!')
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/specialists/${specialistId}`,
        headers: { authorization: `Bearer ${otherLogin.accessToken}` },
        payload: { bio: 'Hack' },
      })
      expect(res.statusCode).toBe(403)
    })
  })
})