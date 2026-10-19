import { describe, it, expect, beforeEach } from 'vitest'
import { app, prisma, loginAs, registerAndLogin } from './setup.js'
import { MONDAY } from './utils/dates.js'
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
          startsAt: `${MONDAY}T08:00:00-03:00`,
          endsAt: `${MONDAY}T08:30:00-03:00`,
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
          startsAt: `${MONDAY}T08:00:00-03:00`,
          endsAt: `${MONDAY}T08:30:00-03:00`,
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
          startsAt: `${MONDAY}T08:00:00-03:00`,
          endsAt: `${MONDAY}T08:30:00-03:00`,
          specialty: 'ORTODONCIA',
        },
      })

      expect(res.statusCode).toBe(409)
    })

    it('should reject bookings in the past, outside availability or on blocked slots', async () => {
      const book = (startsAt: string, endsAt: string) => app.inject({
        method: 'POST',
        url: '/api/v1/appointments',
        headers: { authorization: `Bearer ${patientToken}` },
        payload: { specialistId, patientName: 'Paciente Test', patientPhone: '11-1111-2222', startsAt, endsAt, specialty: 'ORTODONCIA' },
      })
      expect((await book('2020-01-06T09:00:00-03:00', '2020-01-06T09:30:00-03:00')).statusCode).toBe(400)
      expect((await book(`${MONDAY}T20:00:00-03:00`, `${MONDAY}T20:30:00-03:00`)).statusCode).toBe(400)
      await prisma.blockedSlot.create({
        data: { specialistId, startsAt: new Date(`${MONDAY}T10:00:00-03:00`), endsAt: new Date(`${MONDAY}T11:00:00-03:00`), reason: 'Test' },
      })
      expect((await book(`${MONDAY}T10:00:00-03:00`, `${MONDAY}T10:30:00-03:00`)).statusCode).toBe(409)
    })

    it('should not modify existing users nor leak patient data to anonymous bookers', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/appointments',
        payload: {
          specialistId,
          patientName: 'Atacante',
          patientPhone: '11-1111-2222', // belongs to the registered patient
          patientEmail: 'attacker@evil.com',
          startsAt: `${MONDAY}T08:00:00-03:00`,
          endsAt: `${MONDAY}T08:30:00-03:00`,
          specialty: 'ORTODONCIA',
        },
      })
      expect(res.statusCode).toBe(201)
      const { appointment } = JSON.parse(res.body)
      expect(Object.keys(appointment).sort()).toEqual(['endsAt', 'id', 'startsAt', 'status'])
      const user = await prisma.user.findUnique({ where: { id: patientId } })
      expect(user!.email).toBe('patient@test.com')
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
          startsAt: `${MONDAY}T08:00:00-03:00`,
          endsAt: `${MONDAY}T08:30:00-03:00`,
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
        startsAt: new Date(`${MONDAY}T08:00:00-03:00`),
        endsAt: new Date(`${MONDAY}T08:30:00-03:00`),
        status: AppointmentStatus.CONFIRMADO,
      })
      await createAppointment(prisma, {
        specialistId,
        patientId,
        startsAt: new Date(`${MONDAY}T09:00:00-03:00`),
        endsAt: new Date(`${MONDAY}T09:30:00-03:00`),
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

    it('should force a specialist to see only their own agenda', async () => {
      const other = await createTestSpecialist(prisma, { specialty: Specialty.ORTODONCIA })
      await createAppointment(prisma, {
        specialistId: other.id,
        patientId,
        startsAt: new Date(`${MONDAY}T10:00:00-03:00`),
        endsAt: new Date(`${MONDAY}T10:30:00-03:00`),
      })
      const own = await prisma.specialist.findUnique({ where: { id: specialistId }, include: { user: true } })
      const specLogin = await loginAs(own!.user.email, 'Test1234!')
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/appointments?specialistId=${other.id}`,
        headers: { authorization: `Bearer ${specLogin.accessToken}` },
      })
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.appointments).toHaveLength(2)
      expect(body.appointments.every((a: any) => a.specialistId === specialistId)).toBe(true)
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
        startsAt: new Date(`${MONDAY}T08:00:00-03:00`),
        endsAt: new Date(`${MONDAY}T08:30:00-03:00`),
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
      // Get the specialist's user email
      const specialist = await prisma.specialist.findUnique({ where: { id: specialistId }, include: { user: true } })
      const specLogin = await loginAs(specialist!.user.email, 'Test1234!')
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
      // Patients may only cancel
      expect(res.statusCode).toBe(403)

      // Staff hitting an invalid transition gets 400
      const adminRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/appointments/${appointmentId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { status: 'FINALIZADO' },
      })
      expect(adminRes.statusCode).toBe(400)
    })

    it('should forbid patient from confirming own appointment', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/appointments/${appointmentId}`,
        headers: { authorization: `Bearer ${patientToken}` },
        payload: { status: 'CONFIRMADO' },
      })
      expect(res.statusCode).toBe(403)
    })

    it('should forbid patient from cancelling an appointment that already started', async () => {
      const past = await prisma.appointment.create({
        data: {
          specialistId,
          patientId,
          startsAt: new Date(Date.now() - 2 * 3600_000),
          endsAt: new Date(Date.now() - 3600_000),
          specialty: 'ORTODONCIA',
          source: 'WEB',
          status: 'PENDIENTE',
        },
      })
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/appointments/${past.id}`,
        headers: { authorization: `Bearer ${patientToken}` },
        payload: { status: 'CANCELADO' },
      })
      expect(res.statusCode).toBe(403)
    })

    it('should reject rescheduling a cancelled appointment', async () => {
      await prisma.appointment.update({ where: { id: appointmentId }, data: { status: 'CANCELADO' } })
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/appointments/${appointmentId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { startsAt: `${MONDAY}T09:00:00-03:00`, endsAt: `${MONDAY}T09:30:00-03:00` },
      })
      expect(res.statusCode).toBe(409)
    })

    it('should reject rescheduling outside availability, into the past or onto a blocked slot', async () => {
      const patch = (payload: object) => app.inject({
        method: 'PATCH',
        url: `/api/v1/appointments/${appointmentId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload,
      })
      // 20:00 is outside Monday 08:00-14:00
      expect((await patch({ startsAt: `${MONDAY}T20:00:00-03:00`, endsAt: `${MONDAY}T20:30:00-03:00` })).statusCode).toBe(400)
      // In the past
      expect((await patch({ startsAt: '2020-01-06T09:00:00-03:00', endsAt: '2020-01-06T09:30:00-03:00' })).statusCode).toBe(400)
      // Blocked
      await prisma.blockedSlot.create({
        data: { specialistId, startsAt: new Date(`${MONDAY}T10:00:00-03:00`), endsAt: new Date(`${MONDAY}T11:00:00-03:00`), reason: 'Test' },
      })
      expect((await patch({ startsAt: `${MONDAY}T10:00:00-03:00`, endsAt: `${MONDAY}T10:30:00-03:00` })).statusCode).toBe(409)
    })

    it('should allow rescheduling to free slot', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/appointments/${appointmentId}`,
        headers: { authorization: `Bearer ${patientToken}` },
        payload: {
          startsAt: `${MONDAY}T09:00:00-03:00`,
          endsAt: `${MONDAY}T09:30:00-03:00`,
        },
      })
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      // Check that the time is 09:00 in -03:00 timezone (12:00 UTC)
      expect(body.appointment.startsAt).toContain('12:00:00.000Z')
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
          startsAt: `${MONDAY}T09:00:00-03:00`,
          endsAt: `${MONDAY}T09:30:00-03:00`,
          specialty: 'ORTODONCIA',
        },
      })

      // Intentar mover la cita original a 09:00
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/appointments/${appointmentId}`,
        headers: { authorization: `Bearer ${patientToken}` },
        payload: {
          startsAt: `${MONDAY}T09:00:00-03:00`,
          endsAt: `${MONDAY}T09:30:00-03:00`,
        },
      })
      expect(res.statusCode).toBe(409)
    })
  })

  describe('Audit trail', () => {
    it('should record status changes in audit', async () => {
      const appt = await createAppointment(prisma, { specialistId, patientId, status: AppointmentStatus.PENDIENTE })
      // Get the specialist's user email
      const specialist = await prisma.specialist.findUnique({ where: { id: specialistId }, include: { user: true } })
      const specLogin = await loginAs(specialist!.user.email, 'Test1234!')

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
      expect(body.events.length).toBeGreaterThanOrEqual(1)
      const statusChange = body.events.find((e: any) => e.eventType === 'STATUS_CHANGED')
      expect(statusChange).toBeDefined()
      expect(statusChange.oldStatus).toBe('PENDIENTE')
      expect(statusChange.newStatus).toBe('CONFIRMADO')
    })
  })
})