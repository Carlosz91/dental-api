import { FastifyInstance } from 'fastify'
import { calculateAvailableSlots } from '../../utils/slots.js'
import { createAvailabilitySchema, updateAvailabilitySchema, blockedSlotSchema } from './schemas.js'
import { z } from 'zod'

export async function availabilityRoutes(fastify: FastifyInstance) {
  // GET slots disponibles para una fecha
  fastify.get('/:specialistId/slots', async (request, reply) => {
    const { specialistId } = request.params as { specialistId: string }
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
      schema: createAvailabilitySchema,
    }, async (request, reply) => {
      // Manual validation to ensure refine works
      const validationResult = createAvailabilitySchema.safeParse({ params: request.params, body: request.body })
      if (!validationResult.success) {
        return reply.code(400).send({
          error: 'Validación fallida',
          details: validationResult.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
        })
      }
      const rule = await fastify.prisma.availabilityRule.create({
        data: { specialistId: request.params.specialistId, ...request.body },
      })
      return reply.code(201).send({ rule })
    })

    // Actualizar regla
    fastify.patch('/:specialistId/rules/:id', {
      preHandler: [fastify.requireRole('ADMIN', 'STAFF')],
      schema: updateAvailabilitySchema,
    }, async (request, reply) => {
      const validationResult = updateAvailabilitySchema.safeParse({ params: request.params, body: request.body })
      if (!validationResult.success) {
        return reply.code(400).send({
          error: 'Validación fallida',
          details: validationResult.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
        })
      }
      const rule = await fastify.prisma.availabilityRule.update({
        where: { id: request.params.id },
        data: request.body,
      })
      return { rule }
    })

    // Eliminar regla
    fastify.delete('/:specialistId/rules/:id', {
      preHandler: [fastify.requireRole('ADMIN')],
      schema: z.object({ params: z.object({ specialistId: z.string().uuid(), id: z.string().uuid() }) }),
    }, async (request, reply) => {
      await fastify.prisma.availabilityRule.delete({ where: { id: request.params.id } })
      return { message: 'Regla eliminada' }
    })

    // Bloquear horario
    fastify.post('/:specialistId/blocks', {
      preHandler: [fastify.requireRole('ADMIN', 'STAFF', 'SPECIALIST')],
      schema: blockedSlotSchema,
    }, async (request, reply) => {
      const validationResult = blockedSlotSchema.safeParse({ params: request.params, body: request.body })
      if (!validationResult.success) {
        return reply.code(400).send({
          error: 'Validación fallida',
          details: validationResult.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
        })
      }

      // SPECIALIST solo puede bloquear su propia agenda
      if (request.user!.role === 'SPECIALIST') {
        const specialist = await fastify.prisma.specialist.findUnique({
          where: { userId: request.user!.id },
        })
        if (!specialist || specialist.id !== request.params.specialistId) {
          return reply.code(403).send({ error: 'Prohibido', message: 'Solo puedes bloquear tu propia agenda' })
        }
      }

      const block = await fastify.prisma.blockedSlot.create({
        data: { specialistId: request.params.specialistId, ...request.body },
      })
      return reply.code(201).send({ block })
    })

    // Eliminar bloqueo
    fastify.delete('/:specialistId/blocks/:id', {
      preHandler: [fastify.requireRole('ADMIN', 'STAFF', 'SPECIALIST')],
      schema: z.object({ params: z.object({ specialistId: z.string().uuid(), id: z.string().uuid() }) }),
    }, async (request, reply) => {
      await fastify.prisma.blockedSlot.delete({ where: { id: request.params.id } })
      return { message: 'Bloqueo eliminado' }
    })
  })
}