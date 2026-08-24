import { FastifyInstance } from 'fastify'
import { AppointmentService } from './service.js'
import { createAppointmentSchema, updateAppointmentSchema, listAppointmentsSchema } from './schemas.js'
import { requireOwnershipOrStaff } from '../../middleware/auth.js'
import { z } from 'zod'

export async function appointmentRoutes(fastify: FastifyInstance) {
  const service = new AppointmentService(fastify.prisma, fastify)

  // Crear cita (paciente o admin)
  fastify.post('/', {
    schema: createAppointmentSchema,
    config: { rateLimit: { max: 20, timeWindow: 60000 } },
  }, async (request, reply) => {
    try {
      const appointment = await service.create({
        ...request.body,
        startsAt: new Date(request.body.startsAt),
        endsAt: new Date(request.body.endsAt),
        createdById: request.user?.id,
      })
      return reply.code(201).send({ appointment })
    } catch (err) {
      if (err.message === 'SPECIALIST_NOT_FOUND') return reply.code(404).send({ error: 'Especialista no encontrado' })
      if (err.message === 'SLOT_CONFLICT') return reply.code(409).send({ error: 'El horario ya no está disponible' })
      throw err
    }
  })

  // Listar citas (con filtros)
  fastify.get('/', {
    preHandler: [fastify.authenticate],
    schema: listAppointmentsSchema,
  }, async (request) => {
    const { specialistId, patientId, status, specialty, from, to, page, limit } = request.query as any

    // Pacientes solo ven sus citas
    const effectivePatientId = request.user!.role === 'PATIENT' ? request.user!.id : patientId

    return service.list({
      specialistId,
      patientId: effectivePatientId,
      status,
      specialty,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      page,
      limit,
    })
  })

  // Detalle de cita
  fastify.get('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const appointment = await service.findById(request.params.id)
    if (!appointment) return reply.code(404).send({ error: 'No encontrada' })

    // Ownership check
    if (request.user!.role === 'PATIENT' && appointment.patientId !== request.user!.id) {
      return reply.code(403).send({ error: 'Prohibido' })
    }
    if (request.user!.role === 'SPECIALIST') {
      const spec = await fastify.prisma.specialist.findUnique({ where: { userId: request.user!.id } })
      if (!spec || appointment.specialistId !== spec.id) {
        return reply.code(403).send({ error: 'Prohibido' })
      }
    }

    return { appointment }
  })

  // Actualizar cita
  fastify.patch('/:id', {
    preHandler: [fastify.authenticate],
    schema: updateAppointmentSchema,
  }, async (request, reply) => {
    try {
      const appointment = await service.update(
        request.params.id,
        {
          ...request.body,
          startsAt: request.body.startsAt ? new Date(request.body.startsAt) : undefined,
          endsAt: request.body.endsAt ? new Date(request.body.endsAt) : undefined,
        },
        request.user!.id
      )
      return { appointment }
    } catch (err) {
      if (err.message === 'NOT_FOUND') return reply.code(404).send({ error: 'No encontrada' })
      if (err.message === 'INVALID_STATUS_TRANSITION') return reply.code(400).send({ error: 'Transición de estado inválida' })
      if (err.message === 'SLOT_CONFLICT') return reply.code(409).send({ error: 'El nuevo horario ya no está disponible' })
      throw err
    }
  })

  // Historial de auditoría
  fastify.get('/:id/audit', {
    preHandler: [fastify.requireRole('ADMIN', 'STAFF')],
  }, async (request, reply) => {
    const appointment = await service.findById(request.params.id)
    if (!appointment) return reply.code(404).send({ error: 'No encontrada' })
    const events = await service.getAuditEvents(request.params.id)
    return { events }
  })
}