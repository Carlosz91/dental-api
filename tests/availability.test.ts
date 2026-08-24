import { describe, it, expect, beforeEach } from 'vitest'
import { app, prisma, loginAs } from './setup.js'
import { createTestSpecialist, createAvailabilityRule, createTestUser } from './utils/factories.js'
import { Specialty, UserRole } from '@prisma/client'
import dayjs from 'dayjs'

describe('Availability Module', () => {
  let specialistId: string
  let adminToken: string

  beforeEach(async () => {
    const spec = await createTestSpecialist(prisma, { specialty: Specialty.ORTODONCIA })
    specialistId = spec.id

    const admin = await createTestUser(prisma, { email: 'admin@test.com', role: UserRole.ADMIN })
    const adminLogin = await loginAs('admin@test.com', 'Test1234!')
    adminToken = adminLogin.accessToken

    // Lunes 08:00-14:00, slots 30min, buffer 5min
    await createAvailabilityRule(prisma, specialistId, {
      weekday: 1, // Lunes
      startTime: '08:00',
      endTime: '14:00',
      slotMinutes: 30,
      bufferMinutes: 5,
    })
  })

  describe('GET /api/v1/availability/:specialistId/slots', () => {
    it('should return available slots for a Monday', async () => {
      const monday = dayjs('2026-08-24').format('YYYY-MM-DD') // Lunes
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/availability/${specialistId}/slots?date=${monday}`,
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.slots.length).toBeGreaterThan(0)
      expect(body.slots.every((s: any) => s.available === true)).toBe(true)
      // 08:00 a 14:00 = 6h = 360min / (30+5) = ~10 slots
      expect(body.slots.length).toBe(10)
    })

    it('should return empty for Sunday (no rules)', async () => {
      const sunday = dayjs('2026-08-23').format('YYYY-MM-DD')
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/availability/${specialistId}/slots?date=${sunday}`,
      })
      const body = JSON.parse(res.body)
      expect(body.slots).toHaveLength(0)
    })

    it('should mark slots as unavailable when appointment exists', async () => {
      const monday = dayjs('2026-08-24').format('YYYY-MM-DD')
      // Crear cita en el primer slot
      const patient = await createTestUser(prisma, { email: 'pat@test.com' })
      await prisma.appointment.create({
        data: {
          specialistId,
          patientId: patient.id,
          startsAt: new Date('2026-08-24T08:00:00-03:00'),
          endsAt: new Date('2026-08-24T08:30:00-03:00'),
          specialty: Specialty.ORTODONCIA,
          status: 'CONFIRMADO',
        },
      })

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/availability/${specialistId}/slots?date=${monday}`,
      })
      const body = JSON.parse(res.body)
      const firstSlot = body.slots[0]
      expect(firstSlot.available).toBe(false)
      expect(firstSlot.appointmentId).toBeDefined()
    })

    it('should mark slots as blocked when blockedSlot exists', async () => {
      const monday = dayjs('2026-08-24').format('YYYY-MM-DD')
      await prisma.blockedSlot.create({
        data: {
          specialistId,
          startsAt: new Date('2026-08-24T10:00:00-03:00'),
          endsAt: new Date('2026-08-24T11:00:00-03:00'),
          reason: 'Mantenimiento',
        },
      })

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/availability/${specialistId}/slots?date=${monday}`,
      })
      const body = JSON.parse(res.body)
      const blockedSlots = body.slots.filter((s: any) => s.blocked)
      expect(blockedSlots.length).toBeGreaterThan(0)
      expect(blockedSlots[0].blockReason).toBe('Mantenimiento')
    })
  })

  describe('POST /api/v1/availability/:specialistId/rules (ADMIN/STAFF)', () => {
    it('should create new availability rule', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/availability/${specialistId}/rules`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          weekday: 2, // Martes
          startTime: '09:00',
          endTime: '13:00',
          slotMinutes: 40,
          bufferMinutes: 10,
        },
      })
      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.body)
      expect(body.rule.weekday).toBe(2)
      expect(body.rule.slotMinutes).toBe(40)
    })

    it('should validate startTime < endTime', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/availability/${specialistId}/rules`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { weekday: 2, startTime: '14:00', endTime: '09:00' },
      })
      expect(res.statusCode).toBe(400)
    })
  })

  describe('POST /api/v1/availability/:specialistId/blocks', () => {
    it('should allow specialist to block own schedule', async () => {
      // Get the specialist to find the correct email
      const specialist = await prisma.specialist.findUnique({ where: { id: specialistId }, include: { user: true } })
      const specLogin = await loginAs(specialist!.user.email, 'Test1234!')
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/availability/${specialistId}/blocks`,
        headers: { authorization: `Bearer ${specLogin.accessToken}` },
        payload: {
          startsAt: '2026-08-24T12:00:00-03:00',
          endsAt: '2026-08-24T13:00:00-03:00',
          reason: 'Almuerzo',
        },
      })
      expect(res.statusCode).toBe(201)
    })

    it('should forbid other specialist', async () => {
      const other = await createTestSpecialist(prisma, { specialty: Specialty.CIRUGIA })
      const otherLogin = await loginAs(other.user.email, 'Test1234!')
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/availability/${specialistId}/blocks`,
        headers: { authorization: `Bearer ${otherLogin.accessToken}` },
        payload: { startsAt: '2026-08-24T12:00:00-03:00', endsAt: '2026-08-24T13:00:00-03:00', reason: 'Hack' },
      })
      expect(res.statusCode).toBe(403)
    })
  })
})