import { describe, it, expect, beforeEach } from 'vitest'
import { app, prisma } from './setup.js'
import { createTestSpecialist, createAvailabilityRule, createTestUser } from './utils/factories.js'
import { Specialty, UserRole } from '@prisma/client'

describe('Concurrency - Double Booking Prevention', () => {
  let specialistId: string
  let patientTokens: string[] = []

  beforeEach(async () => {
    const spec = await createTestSpecialist(prisma, app, { specialty: Specialty.ORTODONCIA })
    specialistId = spec.id
    await createAvailabilityRule(prisma, specialistId, { weekday: 1, startTime: '08:00', endTime: '08:30' })

    // Crear 20 pacientes
    for (let i = 0; i < 20; i++) {
      const patient = await createTestUser(prisma, app, { email: `patient${i}@test.com`, phone: `11-1111-${String(i).padStart(4, '0')}` })
      const login = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: `patient${i}@test.com`, password: 'Test1234!' },
      })
      const body = JSON.parse(login.body)
      patientTokens.push(body.accessToken)
    }
  })

  it('should allow only ONE appointment for the same slot under concurrent load', async () => {
    const slot = { startsAt: '2026-08-24T08:00:00-03:00', endsAt: '2026-08-24T08:30:00-03:00' }

    // Disparar 20 requests simultáneos
    const promises = patientTokens.map((token) =>
      app.inject({
        method: 'POST',
        url: '/api/v1/appointments',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          specialistId,
          patientName: `Paciente ${token.slice(0, 4)}`,
          patientPhone: `11-1111-${token.slice(0, 4)}`,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          specialty: 'ORTODONCIA',
        },
      })
    )

    const results = await Promise.all(promises)

    // Contar éxitos (201) vs conflictos (409)
    const success = results.filter((r) => r.statusCode === 201).length
    const conflicts = results.filter((r) => r.statusCode === 409).length

    expect(success).toBe(1) // Solo uno debe ganar
    expect(conflicts).toBe(19) // El resto rechazado

    // Verificar en DB
    const appointments = await prisma.appointment.findMany({
      where: { specialistId, startsAt: new Date(slot.startsAt) },
    })
    expect(appointments).toHaveLength(1)
  })
})