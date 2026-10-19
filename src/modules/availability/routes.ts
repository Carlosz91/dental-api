import { FastifyInstance } from 'fastify'
import { calculateAvailableSlots } from '../../utils/slots.js'
import { createAvailabilitySchema, updateAvailabilitySchema, blockedSlotSchema } from './schemas.js'
import { z } from 'zod'
import { parseRequest } from '../../utils/parse-request.js'

export async function availabilityRoutes(fastify: FastifyInstance) {
  // GET slots disponibles para una fecha
  fastify.get('/:specialistId/slots', async (request, reply) => {
    const { specialistId } = parseRequest(
      z.object({ params: z.object({ specialistId: z.string().uuid() }) }),
      request
    ).params
    const { date } = request.query as { date?: string }

    const targetDate = date ? new Date(date) : new Date()
    if (isNaN(targetDate.getTime())) {
      return reply.code(400).send({ error: 'Fecha inválida' })
    }

    const specialist = await fastify.prisma.specialist.findUnique({
      where: { id: specialistId, isActive: true },
      include: { user: { select: { fullName: true } } },
    })
    if (!specialist) return reply.code(404).send({ error: 'Especialista no encontrado' })

    const slots = await calculateAvailableSlots(fastify.prisma, specialistId, targetDate)

    return {
      date: targetDate.toISOString().split('T')[0],
      specialist: { id: specialist.id, name: specialist.user.fullName, specialty: specialist.specialty },
      slots,
    }
  })

  // Resto: CRUD de reglas y bloqueos (protegidos)
  fastify.register(async function (fastify) {
    fastify.addHook('preHandler', fastify.authenticate)

    // Crear regla
    fastify.post('/:specialistId/rules', {
      preHandler: [fastify.requireRole('ADMIN', 'STAFF')],
    }, async (request, reply) => {
      const input = parseRequest(createAvailabilitySchema, request)
      const rule = await fastify.prisma.availabilityRule.create({
        data: { specialistId: input.params.specialistId, ...input.body },
      })
      return reply.code(201).send({ rule })
    })

    // Actualizar regla
    fastify.patch('/:specialistId/rules/:id', {
      preHandler: [fastify.requireRole('ADMIN', 'STAFF')],
    }, async (request, reply) => {
      const input = parseRequest(updateAvailabilitySchema, request)
      // Scope by specialistId so a rule can only be changed through its own specialist
      const existing = await fastify.prisma.availabilityRule.findFirst({
        where: { id: input.params.id, specialistId: input.params.specialistId },
        select: { id: true },
      })
      if (!existing) return reply.code(404).send({ error: 'Regla no encontrada' })
      const rule = await fastify.prisma.availabilityRule.update({
        where: { id: existing.id },
        data: input.body,
      })
      return { rule }
    })

    // Eliminar regla
    fastify.delete('/:specialistId/rules/:id', {
      preHandler: [fastify.requireRole('ADMIN')],
    }, async (request, reply) => {
      const { params } = parseRequest(
        z.object({ params: z.object({ specialistId: z.string().uuid(), id: z.string().uuid() }) }),
        request
      )
      const { count } = await fastify.prisma.availabilityRule.deleteMany({
        where: { id: params.id, specialistId: params.specialistId },
      })
      if (count === 0) return reply.code(404).send({ error: 'Regla no encontrada' })
      return { message: 'Regla eliminada' }
    })

    // Bloquear horario
    fastify.post('/:specialistId/blocks', {
      preHandler: [fastify.requireRole('ADMIN', 'STAFF', 'SPECIALIST')],
    }, async (request, reply) => {
      const input = parseRequest(blockedSlotSchema, request)

      // SPECIALIST solo puede bloquear su propia agenda
      if (request.user!.role === 'SPECIALIST') {
        const specialist = await fastify.prisma.specialist.findUnique({
          where: { userId: request.user!.id },
        })
        if (!specialist || specialist.id !== input.params.specialistId) {
          return reply.code(403).send({ error: 'Prohibido', message: 'Solo puedes bloquear tu propia agenda' })
        }
      }

      const block = await fastify.prisma.blockedSlot.create({
        data: { specialistId: input.params.specialistId, ...input.body },
      })
      return reply.code(201).send({ block })
    })

    // Eliminar bloqueo
    fastify.delete('/:specialistId/blocks/:id', {
      preHandler: [fastify.requireRole('ADMIN', 'STAFF', 'SPECIALIST')],
    }, async (request, reply) => {
      const { params } = parseRequest(
        z.object({ params: z.object({ specialistId: z.string().uuid(), id: z.string().uuid() }) }),
        request
      )
      // SPECIALIST can only manage their own agenda (same check as POST)
      if (request.user!.role === 'SPECIALIST') {
        const specialist = await fastify.prisma.specialist.findUnique({
          where: { userId: request.user!.id },
        })
        if (!specialist || specialist.id !== params.specialistId) {
          return reply.code(403).send({ error: 'Prohibido', message: 'Solo puedes gestionar tu propia agenda' })
        }
      }
      const { count } = await fastify.prisma.blockedSlot.deleteMany({
        where: { id: params.id, specialistId: params.specialistId },
      })
      if (count === 0) return reply.code(404).send({ error: 'Bloqueo no encontrado' })
      return { message: 'Bloqueo eliminado' }
    })
  })
}