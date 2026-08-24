import { describe, it, expect, beforeEach } from 'vitest'
import { app, prisma, registerAndLogin, loginAs } from './setup.js'
import { createTestSpecialist, createAvailabilityRule, createTestUser } from './utils/factories.js'
import { Specialty, UserRole, AppointmentStatus } from '@prisma/client'

describe('Integration - Full Booking Flow', () => {
  let specialistId: string
  let patientToken: string
  let adminToken: string

  beforeEach(async () => {
    // Setup: especialista con agenda Lunes y Miércoles
    const spec = await createTestSpecialist(prisma, { specialty: Specialty.CIRUGIA })
    specialistId = spec.id
    await createAvailabilityRule(prisma, specialistId, { weekday: 1, startTime: '08:00', endTime: '12:00' }) // Lunes
    await createAvailabilityRule(prisma, specialistId, { weekday: 3, startTime: '14:00', endTime: '18:00' }) // Miércoles

    // Paciente
    const patient = await registerAndLogin({ email: 'flow@test.com', password: 'Pass123!', fullName: 'Flujo Paciente', phone: '11-5555-6666' })
    patientToken = patient.accessToken

    // Admin
    const admin = await createTestUser(prisma, { email: 'admin@flow.com', role: UserRole.ADMIN })
    const adminLogin = await loginAs('admin@flow.com', 'Test1234!')
    adminToken = adminLogin.accessToken
  })

  it('should complete: book -> confirm -> start -> finish', async () => {
    // 1. Paciente reserva
    const bookRes = await app.inject({
      method: 'POST',
      url: '/api/v1/appointments',
      headers: { authorization: `Bearer ${patientToken}` },
      payload: {
        specialistId,
        patientName: 'Flujo Paciente',
        patientPhone: '11-5555-6666',
        startsAt: '2026-08-24T08:00:00-03:00', // Lunes
        endsAt: '2026-08-24T09:00:00-03:00',   // Cirugía 60 min
        specialty: 'CIRUGIA',
      },
    })
    expect(bookRes.statusCode).toBe(201)
    const appointmentId = JSON.parse(bookRes.body).appointment.id

    // 2. Admin/Staff confirma
    const confirmRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/appointments/${appointmentId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: 'CONFIRMADO' },
    })
    expect(confirmRes.statusCode).toBe(200)
    expect(JSON.parse(confirmRes.body).appointment.status).toBe('CONFIRMADO')

    // 3. Especialista marca "En curso"
    const specLogin = await loginAs(`doc-${specialistId}@example.com`, 'Test1234!')
    const startRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/appointments/${appointmentId}`,
      headers: { authorization: `Bearer ${specLogin.accessToken}` },
      payload: { status: 'EN_CURSO' },
    })
    expect(startRes.statusCode).toBe(200)
    expect(JSON.parse(startRes.body).appointment.status).toBe('EN_CURSO')

    // 4. Especialista finaliza
    const finishRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/appointments/${appointmentId}`,
      headers: { authorization: `Bearer ${specLogin.accessToken}` },
      payload: { status: 'FINALIZADO', notes: 'Extracción molar 37 completada' },
    })
    expect(finishRes.statusCode).toBe(200)
    const final = JSON.parse(finishRes.body).appointment
    expect(final.status).toBe('FINALIZADO')
    expect(final.notes).toContain('Extracción')

    // 5. Verificar auditoría completa
    const auditRes = await app.inject({
      method: 'GET',
      url: `/api/v1/appointments/${appointmentId}/audit`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    const events = JSON.parse(auditRes.body).events
    const types = events.map((e: any) => e.eventType)
    expect(types).toContain('CREATED')
    expect(types).toContain('STATUS_CHANGED')
    expect(events.filter((e: any) => e.eventType === 'STATUS_CHANGED')).toHaveLength(3)
  })

  it('should handle cancellation flow with audit', async () => {
    const bookRes = await app.inject({
      method: 'POST',
      url: '/api/v1/appointments',
      headers: { authorization: `Bearer ${patientToken}` },
      payload: {
        specialistId,
        patientName: 'Flujo Paciente',
        patientPhone: '11-5555-6666',
        startsAt: '2026-08-24T08:00:00-03:00',
        endsAt: '2026-08-24T09:00:00-03:00',
        specialty: 'CIRUGIA',
      },
    })
    const appointmentId = JSON.parse(bookRes.body).appointment.id

    // Paciente cancela
    const cancelRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/appointments/${appointmentId}`,
      headers: { authorization: `Bearer ${patientToken}` },
      payload: { status: 'CANCELADO', cancellationReason: 'Me enfermé' },
    })
    expect(cancelRes.statusCode).toBe(200)

    // Verificar auditoría
    const auditRes = await app.inject({
      method: 'GET',
      url: `/api/v1/appointments/${appointmentId}/audit`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    const events = JSON.parse(auditRes.body).events
    const cancelEvent = events.find((e: any) => e.eventType === 'STATUS_CHANGED' && e.newStatus === 'CANCELADO')
    expect(cancelEvent).toBeDefined()
    expect(cancelEvent.payload.reason).toBe('Me enfermé')

    // El slot debe volver a estar disponible
    const slotsRes = await app.inject({
      method: 'GET',
      url: `/api/v1/availability/${specialistId}/slots?date=2026-08-24`,
    })
    const slots = JSON.parse(slotsRes.body).slots
    const targetSlot = slots.find((s: any) => s.startsAt.includes('08:00'))
    expect(targetSlot.available).toBe(true)
  })
})