import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { UserRole } from '@prisma/client'
import { AppointmentService } from './service.js'
import { createAppointmentSchema, updateAppointmentSchema, listAppointmentsSchema, idParamsSchema } from './schemas.js'
import { requireOwnershipOrStaff, optionalAuth } from '../../middleware/auth.js'
import { parseRequest } from '../../utils/parse-request.js'

interface Actor {
  id: string
  role: UserRole
}

const STAFF_ROLES: UserRole[] = ['SPECIALIST', 'STAFF', 'ADMIN']

/** Booking/reschedule validation and conflict errors -> HTTP responses. Returns true when handled. */
function replyBookingError(err: unknown, reply: FastifyReply, conflictMessage: string): boolean {
  if (!(err instanceof Error)) return false
  switch (err.message) {
    case 'SPECIALIST_NOT_FOUND': reply.code(404).send({ error: 'Especialista no encontrado' }); return true
    case 'SLOT_CONFLICT': reply.code(409).send({ error: conflictMessage }); return true
    case 'SPECIALTY_MISMATCH': reply.code(400).send({ error: 'La especialidad no coincide con la del especialista' }); return true
    case 'INVALID_TIME_RANGE': reply.code(400).send({ error: 'La hora de fin debe ser posterior a la de inicio' }); return true
    case 'SLOT_IN_PAST': reply.code(400).send({ error: 'El horario debe ser futuro' }); return true
    case 'OUTSIDE_AVAILABILITY': reply.code(400).send({ error: 'El horario está fuera de la disponibilidad del especialista' }); return true
    case 'SLOT_BLOCKED': reply.code(409).send({ error: 'El horario está bloqueado por el especialista' }); return true
    case 'APPOINTMENT_NOT_RESCHEDULABLE': reply.code(409).send({ error: 'La cita ya está cerrada y no puede reprogramarse' }); return true
    default: return false
  }
}

export async function appointmentRoutes(fastify: FastifyInstance) {
  const service = new AppointmentService(fastify.prisma, fastify)

  // SECURITY: role/active flag come from the DB, never from the JWT alone
  async function resolveActor(request: FastifyRequest, reply: FastifyReply): Promise<Actor | null> {
    const dbUser = await fastify.prisma.user.findUnique({
      where: { id: request.user!.id },
      select: { id: true, role: true, isActive: true },
    })
    if (!dbUser || !dbUser.isActive) {
      reply.code(401).send({ error: 'No autorizado' })
      return null
    }
    return { id: dbUser.id, role: dbUser.role }
  }

  // Crear cita (paciente logueado -> queda a su nombre; anónimo -> por teléfono)
  fastify.post('/', {
    preHandler: [optionalAuth],
    config: { rateLimit: { max: 20, timeWindow: 60000 } },
  }, async (request, reply) => {
    const input = parseRequest(createAppointmentSchema, request)
    let actor: Actor | null = null
    if (request.user) {
      actor = await resolveActor(request, reply)
      if (!actor) return reply
    }
    try {
      const appointment = await service.create({
        ...input.body,
        startsAt: new Date(input.body.startsAt),
        endsAt: new Date(input.body.endsAt),
        createdById: actor?.id,
        // Paciente autenticado -> la cita pertenece a SU cuenta
        authUserId: actor?.role === 'PATIENT' ? actor.id : undefined,
      })
      // SECURITY: anonymous callers get no patient data back, only the booking essentials
      if (!actor) {
        return reply.code(201).send({
          appointment: {
            id: appointment.id,
            startsAt: appointment.startsAt,
            endsAt: appointment.endsAt,
            status: appointment.status,
          },
        })
      }
      return reply.code(201).send({ appointment })
    } catch (err) {
      if (replyBookingError(err, reply, 'El horario ya no está disponible')) return reply
      throw err
    }
  })

  // Listar citas (con filtros)
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const filters = parseRequest(listAppointmentsSchema, request)
    const actor = await resolveActor(request, reply)
    if (!actor) return reply

    // Pacientes solo ven sus citas
    const effectivePatientId = actor.role === 'PATIENT' ? actor.id : filters.query.patientId

    // Especialistas solo ven SU agenda (ignora el filtro specialistId del cliente)
    let effectiveSpecialistId = filters.query.specialistId
    if (actor.role === 'SPECIALIST') {
      const spec = await fastify.prisma.specialist.findUnique({ where: { userId: actor.id } })
      if (!spec) return reply.code(403).send({ error: 'Prohibido' })
      effectiveSpecialistId = spec.id
    }

    return service.list({
      specialistId: effectiveSpecialistId,
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
    const actor = await resolveActor(request, reply)
    if (!actor) return reply
    const appointment = await service.findById(params.id)
    if (!appointment) return reply.code(404).send({ error: 'No encontrada' })

    // Ownership check
    if (actor.role === 'PATIENT' && appointment.patientId !== actor.id) {
      return reply.code(403).send({ error: 'Prohibido' })
    }
    if (actor.role === 'SPECIALIST') {
      const spec = await fastify.prisma.specialist.findUnique({ where: { userId: actor.id } })
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

    const actor = await resolveActor(request, reply)
    if (!actor) return reply

    // Ownership check, prevents IDOR (patients editing other people's appointments)
    const existing = await service.findById(input.params.id)
    if (!existing) return reply.code(404).send({ error: 'No encontrada' })

    if (actor.role === 'PATIENT') {
      if (existing.patientId !== actor.id) return reply.code(403).send({ error: 'Prohibido' })
      // Patients may only cancel (never set any other status), and only before the start
      if (input.body.status && input.body.status !== 'CANCELADO') {
        return reply.code(403).send({ error: 'Prohibido', message: 'Los pacientes solo pueden cancelar su cita' })
      }
      if (existing.startsAt.getTime() <= Date.now()) {
        return reply.code(403).send({ error: 'Prohibido', message: 'La cita ya comenzó y no puede modificarse' })
      }
    } else if (!STAFF_ROLES.includes(actor.role)) {
      return reply.code(403).send({ error: 'Prohibido' })
    }
    if (actor.role === 'SPECIALIST') {
      const spec = await fastify.prisma.specialist.findUnique({ where: { userId: actor.id } })
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
        actor.id
      )
      return { appointment }
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'NOT_FOUND') return reply.code(404).send({ error: 'No encontrada' })
        if (err.message === 'INVALID_STATUS_TRANSITION') return reply.code(400).send({ error: 'Transición de estado inválida' })
      }
      if (replyBookingError(err, reply, 'El nuevo horario ya no está disponible')) return reply
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