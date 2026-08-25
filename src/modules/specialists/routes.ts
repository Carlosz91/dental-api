import { FastifyInstance, FastifyRequest } from 'fastify'
import { PrismaClient, UserRole } from '@prisma/client'
import { hashPassword } from '../../utils/password.js'
import { createSpecialistSchema, updateSpecialistSchema, specialistParamsSchema } from './schemas.js'
import { z } from 'zod'

type SpecialistIdParams = z.infer<typeof specialistParamsSchema>['params']
type CreateSpecialistBody = z.infer<typeof createSpecialistSchema>['body']
type UpdateSpecialistParams = z.infer<typeof updateSpecialistSchema>['params']
type UpdateSpecialistBody = z.infer<typeof updateSpecialistSchema>['body']

export async function specialistRoutes(fastify: FastifyInstance) {
  // Listar especialistas activos (público)
  fastify.get('/', async () => {
    const specialists = await fastify.prisma.specialist.findMany({
      where: { isActive: true },
      include: {
        user: { select: { fullName: true, email: true } },
        availabilityRules: { where: { effectiveTo: null }, orderBy: { weekday: 'asc' } },
      },
      orderBy: { specialty: 'asc' },
    })
    return { specialists }
  })

  // Detalle especialista
  fastify.get('/:id', { schema: specialistParamsSchema }, async (request: FastifyRequest<{ Params: SpecialistIdParams }>, reply) => {
    const specialist = await fastify.prisma.specialist.findUnique({
      where: { id: request.params.id },
      include: {
        user: { select: { fullName: true, email: true, phone: true } },
        availabilityRules: { where: { effectiveTo: null }, orderBy: { weekday: 'asc' } },
      },
    })
    if (!specialist) return reply.code(404).send({ error: 'No encontrado' })
    return { specialist }
  })

  // Crear especialista (ADMIN)
  fastify.post('/', {
    preHandler: [fastify.requireRole('ADMIN')],
    schema: createSpecialistSchema,
  }, async (request: FastifyRequest<{ Body: CreateSpecialistBody }>, reply) => {
    const { email, password, fullName, licenseNumber, specialty, phone, bio } = request.body

    const existingUser = await fastify.prisma.user.findUnique({ where: { email } })
    if (existingUser) return reply.code(409).send({ error: 'Email ya existe' })

    const existingLicense = await fastify.prisma.specialist.findUnique({ where: { licenseNumber } })
    if (existingLicense) return reply.code(409).send({ error: 'Número de matrícula ya existe' })

    const passwordHash = await hashPassword(password)

    const user = await fastify.prisma.user.create({
      data: { email, passwordHash, fullName, phone, role: UserRole.SPECIALIST },
    })

    const specialist = await fastify.prisma.specialist.create({
      data: { userId: user.id, licenseNumber, specialty, bio },
      include: { user: { select: { fullName: true, email: true } } },
    })

    return reply.code(201).send({ specialist })
  })

  // Actualizar especialista (ADMIN o el mismo especialista)
  fastify.patch('/:id', {
    preHandler: [fastify.authenticate],
    schema: updateSpecialistSchema,
  }, async (request: FastifyRequest<{ Params: UpdateSpecialistParams; Body: UpdateSpecialistBody }>, reply) => {
    const specialist = await fastify.prisma.specialist.findUnique({
      where: { id: request.params.id },
      include: { user: true },
    })
    if (!specialist) return reply.code(404).send({ error: 'No encontrado' })

    // Solo ADMIN o el propio especialista
    if (request.user!.role !== 'ADMIN' && request.user!.id !== specialist.userId) {
      return reply.code(403).send({ error: 'Prohibido' })
    }

    // Separar campos de User y Specialist
    const { phone, fullName, email, ...specialistData } = request.body

    // Actualizar User si hay campos de usuario
    if (phone !== undefined || fullName !== undefined || email !== undefined) {
      await fastify.prisma.user.update({
        where: { id: specialist.userId },
        data: { phone, fullName, email },
      })
    }

    // Actualizar Specialist con el resto de campos
    const updated = await fastify.prisma.specialist.update({
      where: { id: request.params.id },
      data: specialistData,
      include: { user: { select: { fullName: true, email: true, phone: true } } },
    })

    return { specialist: updated }
  })

  // Eliminar especialista (ADMIN)
  fastify.delete('/:id', {
    preHandler: [fastify.requireRole('ADMIN')],
    schema: specialistParamsSchema,
  }, async (request: FastifyRequest<{ Params: SpecialistIdParams }>, reply) => {
    await fastify.prisma.specialist.delete({ where: { id: request.params.id } })
    return { message: 'Especialista eliminado' }
  })
}