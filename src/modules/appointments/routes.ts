import { FastifyInstance } from 'fastify'
import { AppointmentService } from './service.js'
import { createAppointmentSchema, updateAppointmentSchema, listAppointmentsSchema, idParamsSchema } from './schemas.js'
import { requireOwnershipOrStaff, optionalAuth } from '../../middleware/auth.js'
import { parseRequest } from '../../utils/parse-request.js'

export async function appointmentRoutes(fastify: FastifyInstance) {
  const service = new AppointmentService(fastify.prisma, fastify)

  // Crear cita (paciente logueado -> queda a su nombre; anónimo -> por teléfono)
  fastify.post('/', {
    preHandler: [optionalAuth],
    config: { rateLimit: { max: 20, timeWindow: 60000 } },
  }, async (request, reply) => {
    const input = parseRequest(createAppointmentSchema, request)
    try {
      const appointment = await service.create({
        ...input.body,
        startsAt: new Date(input.body.startsAt),
        endsAt: new Date(input.body.endsAt),
        createdById: request.user?.id,
        // Paciente autenticado -> la cita pertenece a SU cuenta
        authUserId: request.user?.role === 'PATIENT' ? request.user.id : undefined,
      })
      return reply.code(201).send({ appointment })
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'SPECIALIST_NOT_FOUND') return reply.code(404).send({ error: 'Especialista no encontrado' })
        if (err.message === 'SLOT_CONFLICT') return reply.code(409).send({ error: 'El horario ya no está disponible' })
        if (err.message === 'SPECIALTY_MISMATCH') return reply.code(400).send({ error: 'La especialidad no coincide con la del especialista' })
      }
      throw err
    }
  })

  // Listar citas (con filtros)
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    const filters = parseRequest(listAppointmentsSchema, request)

    // Pacientes solo ven sus citas
    const effectivePatientId = request.user!.role === 'PATIENT' ? request.user!.id : filters.query.patientId

    return service.list({
      specialistId: filters.query.specialistId,
      patientId: effectivePatientId,
      status: filters.query.status,
      specialty: filters.query.specialty,
      from: filters.query.from ? new Date(filters.query.from) : undefined,
      to: filters.query.to ? new Date(filters.query.to) : undefined,
      page: filters.query.page,
      limit: filters.query.limit,
    })
  })

  // Detalle de cita
  fastify.get('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { params } = parseRequest(idParamsSchema, request)
    const appointment = await service.findById(params.id)
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

  // Actualizar cita (solo dueño, especialista propio o staff)
  fastify.patch('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const input = parseRequest(updateAppointmentSchema, request)

    // Ownership check — prevents IDOR (patients editing other people's appointments)
    const existing = await service.findById(input.params.id)
    if (!existing) return reply.code(404).send({ error: 'No encontrada' })

    if (request.user!.role === 'PATIENT' && existing.patientId !== request.user!.id) {
      return reply.code(403).send({ error: 'Prohibido' })
    }
    if (request.user!.role === 'SPECIALIST') {
      const spec = await fastify.prisma.specialist.findUnique({ where: { userId: request.user!.id } })
      if (!spec || existing.specialistId !== spec.id) {
        return reply.code(403).send({ error: 'Prohibido' })
      }
    }

    try {
      const appointment = await service.update(
        input.params.id,
        {
          ...input.body,
          startsAt: input.body.startsAt ? new Date(input.body.startsAt) : undefined,
          endsAt: input.body.endsAt ? new Date(input.body.endsAt) : undefined,
        },
        request.user!.id
      )
      return { appointment }
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'NOT_FOUND') return reply.code(404).send({ error: 'No encontrada' })
        if (err.message === 'INVALID_STATUS_TRANSITION') return reply.code(400).send({ error: 'Transición de estado inválida' })
        if (err.message === 'SLOT_CONFLICT') return reply.code(409).send({ error: 'El nuevo horario ya no está disponible' })
      }
      throw err
    }
  })

  // Historial de auditoría
  fastify.get('/:id/audit', {
    preHandler: [fastify.requireRole('ADMIN', 'STAFF')],
  }, async (request, reply) => {
    const { params } = parseRequest(idParamsSchema, request)
    const appointment = await service.findById(params.id)
    if (!appointment) return reply.code(404).send({ error: 'No encontrada' })
    const events = await service.getAuditEvents(params.id)
    return { events }
  })
}