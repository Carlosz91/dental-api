import { describe, it, expect, beforeEach } from 'vitest'
import { app, prisma, loginAs, registerAndLogin } from './setup.js'
import { createTestSpecialist, createAvailabilityRule, createTestUser, createAppointment } from './utils/factories.js'
import { Specialty, UserRole, AppointmentStatus } from '@prisma/client'
import dayjs from 'dayjs'

describe('Appointments Module', () => {
  let specialistId: string
  let patientToken: string
  let patientId: string
  let adminToken: string

  beforeEach(async () => {
    // Especialista con disponibilidad Lunes 08:00-14:00
    const spec = await createTestSpecialist(prisma, { specialty: Specialty.ORTODONCIA })
    specialistId = spec.id
    await createAvailabilityRule(prisma, specialistId, { weekday: 1, startTime: '08:00', endTime: '14:00' })

    // Paciente
    const patient = await registerAndLogin({ email: 'patient@test.com', password: 'Pass123!', fullName: 'Paciente Test', phone: '11-1111-2222' })
    patientToken = patient.accessToken
    patientId = patient.user.id

    // Admin
    const admin = await createTestUser(prisma, { email: 'admin@test.com', role: UserRole.ADMIN })
    const adminLogin = await loginAs('admin@test.com', 'Test1234!')
    adminToken = adminLogin.accessToken
  })

  describe('POST /api/v1/appointments', () => {
    it('should allow patient to book available slot', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/appointments',
        headers: { authorization: `Bearer ${patientToken}` },
        payload: {
          specialistId,
          patientName: 'Paciente Test',
          patientPhone: '11-1111-2222',
          startsAt: '2026-08-24T08:00:00-03:00',
          endsAt: '2026-08-24T08:30:00-03:00',
          specialty: 'ORTODONCIA',
        },
      })

      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.body)
      expect(body.appointment.status).toBe('PENDIENTE')
      expect(body.appointment.patientId).toBe(patientId)
    })

    it('should reject booking already taken slot (race condition)', async () => {
      // Primera reserva
      await app.inject({
        method: 'POST',
        url: '/api/v1/appointments',
        headers: { authorization: `Bearer ${patientToken}` },
        payload: {
          specialistId,
          patientName: 'Paciente Test',
          patientPhone: '11-1111-2222',
          startsAt: '2026-08-24T08:00:00-03:00',
          endsAt: '2026-08-24T08:30:00-03:00',
          specialty: 'ORTODONCIA',
        },
      })

      // Segunda reserva mismo slot (otro paciente)
      const otherPatient = await registerAndLogin({ email: 'other@test.com', password: 'Pass123!', fullName: 'Otro', phone: '11-3333-4444' })
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/appointments',
        headers: { authorization: `Bearer ${otherPatient.accessToken}` },
        payload: {
          specialistId,
          patientName: 'Otro',
          patientPhone: '11-3333-4444',
          startsAt: '2026-08-24T08:00:00-03:00',
          endsAt: '2026-08-24T08:30:00-03:00',
          specialty: 'ORTODONCIA',
        },
      })

      expect(res.statusCode).toBe(409)
    })

    it('should reject invalid specialty mismatch', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/appointments',
        headers: { authorization: `Bearer ${patientToken}` },
        payload: {
          specialistId,
          patientName: 'Paciente',
          patientPhone: '11-1111-2222',
          startsAt: '2026-08-24T08:00:00-03:00',
          endsAt: '2026-08-24T08:30:00-03:00',
          specialty: 'CIRUGIA', // Especialista es ORTODONCIA
        },
      })
      expect(res.statusCode).toBe(400)
    })
  })

  describe('GET /api/v1/appointments', () => {
    beforeEach(async () => {
      // Crear algunas citas
      await createAppointment(prisma, {
        specialistId,
        patientId,
        startsAt: new Date('2026-08-24T08:00:00-03:00'),
        endsAt: new Date('2026-08-24T08:30:00-03:00'),
        status: AppointmentStatus.CONFIRMADO,
      })
      await createAppointment(prisma, {
        specialistId,
        patientId,
        startsAt: new Date('2026-08-24T09:00:00-03:00'),
        endsAt: new Date('2026-08-24T09:30:00-03:00'),
        status: AppointmentStatus.PENDIENTE,
      })
    })

    it('should return patient own appointments', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/appointments',
        headers: { authorization: `Bearer ${patientToken}` },
      })
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.appointments).toHaveLength(2)
      expect(body.appointments.every((a: any) => a.patientId === patientId)).toBe(true)
    })

    it('should allow admin to see all with filters', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/appointments?status=CONFIRMADO',
        headers: { authorization: `Bearer ${adminToken}` },
      })
      const body = JSON.parse(res.body)
      expect(body.appointments).toHaveLength(1)
      expect(body.appointments[0].status).toBe('CONFIRMADO')
    })
  })

  describe('PATCH /api/v1/appointments/:id', () => {
    let appointmentId: string

    beforeEach(async () => {
      const appt = await createAppointment(prisma, {
        specialistId,
        patientId,
        startsAt: new Date('2026-08-24T08:00:00-03:00'),
        endsAt: new Date('2026-08-24T08:30:00-03:00'),
        status: AppointmentStatus.PENDIENTE,
      })
      appointmentId = appt.id
    })

    it('should allow patient to cancel own appointment', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/appointments/${appointmentId}`,
        headers: { authorization: `Bearer ${patientToken}` },
        payload: { status: 'CANCELADO', cancellationReason: 'No puedo ir' },
      })
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.appointment.status).toBe('CANCELADO')
    })

    it('should allow specialist to confirm appointment', async () => {
      const specLogin = await loginAs(`doc-${specialistId}@example.com`, 'Test1234!')
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/appointments/${appointmentId}`,
        headers: { authorization: `Bearer ${specLogin.accessToken}` },
        payload: { status: 'CONFIRMADO' },
      })
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.appointment.status).toBe('CONFIRMADO')
    })

    it('should enforce valid status transitions', async () => {
      // PENDIENTE -> FINALIZADO no permitido
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/appointments/${appointmentId}`,
        headers: { authorization: `Bearer ${patientToken}` },
        payload: { status: 'FINALIZADO' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('should allow rescheduling to free slot', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/appointments/${appointmentId}`,
        headers: { authorization: `Bearer ${patientToken}` },
        payload: {
          startsAt: '2026-08-24T09:00:00-03:00',
          endsAt: '2026-08-24T09:30:00-03:00',
        },
      })
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.appointment.startsAt).toContain('09:00')
    })

    it('should reject rescheduling to occupied slot', async () => {
      // Ocupar el slot de las 09:00
      const other = await registerAndLogin({ email: 'other@test.com', password: 'Pass123!', fullName: 'Otro', phone: '11-3333-4444' })
      await app.inject({
        method: 'POST',
        url: '/api/v1/appointments',
        headers: { authorization: `Bearer ${other.accessToken}` },
        payload: {
          specialistId,
          patientName: 'Otro',
          patientPhone: '11-3333-4444',
          startsAt: '2026-08-24T09:00:00-03:00',
          endsAt: '2026-08-24T09:30:00-03:00',
          specialty: 'ORTODONCIA',
        },
      })

      // Intentar mover la cita original a 09:00
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/appointments/${appointmentId}`,
        headers: { authorization: `Bearer ${patientToken}` },
        payload: {
          startsAt: '2026-08-24T09:00:00-03:00',
          endsAt: '2026-08-24T09:30:00-03:00',
        },
      })
      expect(res.statusCode).toBe(409)
    })
  })

  describe('Audit trail', () => {
    it('should record status changes in audit', async () => {
      const appt = await createAppointment(prisma, { specialistId, patientId, status: AppointmentStatus.PENDIENTE })
      const specLogin = await loginAs(`doc-${specialistId}@example.com`, 'Test1234!')

      await app.inject({
        method: 'PATCH',
        url: `/api/v1/appointments/${appt.id}`,
        headers: { authorization: `Bearer ${specLogin.accessToken}` },
        payload: { status: 'CONFIRMADO' },
      })

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/appointments/${appt.id}/audit`,
        headers: { authorization: `Bearer ${adminToken}` },
      })
      const body = JSON.parse(res.body)
      expect(body.events.length).toBeGreaterThanOrEqual(2)
      const statusChange = body.events.find((e: any) => e.eventType === 'STATUS_CHANGED')
      expect(statusChange).toBeDefined()
      expect(statusChange.oldStatus).toBe('PENDIENTE')
      expect(statusChange.newStatus).toBe('CONFIRMADO')
    })
  })
})