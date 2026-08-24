import { describe, it, expect, beforeEach } from 'vitest'
import { app, prisma } from './setup.js'
import { createTestSpecialist, createAvailabilityRule, createTestUser } from './utils/factories.js'
import { Specialty, UserRole } from '@prisma/client'

describe('Concurrency - Double Booking Prevention', () => {
  let specialistId: string
  let patientTokens: string[] = []

  beforeEach(async () => {
    const spec = await createTestSpecialist(prisma, { specialty: Specialty.ORTODONCIA })
    specialistId = spec.id
    await createAvailabilityRule(prisma, specialistId, { weekday: 1, startTime: '08:00', endTime: '08:30' })

    // Crear 20 pacientes
    for (let i = 0; i < 20; i++) {
      const patient = await createTestUser(prisma, { email: `patient${i}@test.com`, phone: `11-1111-${String(i).padStart(4, '0')}` })
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

    // Deshabilitar rate limit para este test
    const originalRateLimit = process.env.RATE_LIMIT_MAX
    process.env.RATE_LIMIT_MAX = '10000'

    try {
      // Disparar 20 requests simultáneos usando Promise.all con microtasks
      const promises = patientTokens.map((token, index) => {
        if (!token) return Promise.resolve({ statusCode: 500 })
        // Usar setImmediate para asegurar que se ejecuten en el mismo tick
        return new Promise(resolve => {
          setImmediate(() => {
            resolve(app.inject({
              method: 'POST',
              url: '/api/v1/appointments',
              headers: { authorization: `Bearer ${token}` },
              payload: {
                specialistId,
                patientName: `Paciente ${index}`,
                patientPhone: `11-1111-${String(index).padStart(4, '0')}`,
                startsAt: slot.startsAt,
                endsAt: slot.endsAt,
                specialty: 'ORTODONCIA',
              },
            }))
          })
        })
      })

      const results = await Promise.all(promises)

      // Contar éxitos (201) vs conflictos (409)
      const success = results.filter((r) => r.statusCode === 201).length
      const conflicts = results.filter((r) => r.statusCode === 409).length
      const rateLimited = results.filter((r) => r.statusCode === 429).length
      const errors = results.filter((r) => r.statusCode === 500).length

      console.log(`Success: ${success}, Conflicts: ${conflicts}, RateLimited: ${rateLimited}, Errors: ${errors}`)

      expect(success).toBe(1) // Solo uno debe ganar
      expect(conflicts).toBe(19) // El resto rechazado
    } finally {
      process.env.RATE_LIMIT_MAX = '1000'
    }

    // Verificar en DB
    const appointments = await prisma.appointment.findMany({
      where: { specialistId, startsAt: new Date('2026-08-24T08:00:00-03:00') },
    })
    expect(appointments).toHaveLength(1)
  })
})