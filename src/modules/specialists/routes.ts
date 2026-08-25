import { FastifyInstance } from 'fastify'
import { UserRole } from '@prisma/client'
import { hashPassword } from '../../utils/password.js'
import { createSpecialistSchema, updateSpecialistSchema, specialistParamsSchema } from './schemas.js'
import { parseRequest } from '../../utils/parse-request.js'

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
  fastify.get('/:id', async (request, reply) => {
    const { id } = parseRequest(specialistParamsSchema, request).params
    const specialist = await fastify.prisma.specialist.findUnique({
      where: { id },
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
  }, async (request, reply) => {
    const { body } = parseRequest(createSpecialistSchema, request)

    const existingUser = await fastify.prisma.user.findUnique({ where: { email: body.email } })
    if (existingUser) return reply.code(409).send({ error: 'Email ya existe' })

    const existingLicense = await fastify.prisma.specialist.findUnique({ where: { licenseNumber: body.licenseNumber } })
    if (existingLicense) return reply.code(409).send({ error: 'Número de matrícula ya existe' })

    const passwordHash = await hashPassword(body.password)

    const user = await fastify.prisma.user.create({
      data: { email: body.email, passwordHash, fullName: body.fullName, phone: body.phone, role: UserRole.SPECIALIST },
    })

    const specialist = await fastify.prisma.specialist.create({
      data: { userId: user.id, licenseNumber: body.licenseNumber, specialty: body.specialty, bio: body.bio },
      include: { user: { select: { fullName: true, email: true } } },
    })

    return reply.code(201).send({ specialist })
  })

  // Actualizar especialista (ADMIN o el mismo especialista)
  fastify.patch('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { params, body } = parseRequest(updateSpecialistSchema, request)

    const specialist = await fastify.prisma.specialist.findUnique({
      where: { id: params.id },
      include: { user: true },
    })
    if (!specialist) return reply.code(404).send({ error: 'No encontrado' })

    // Solo ADMIN o el propio especialista
    if (request.user!.role !== 'ADMIN' && request.user!.id !== specialist.userId) {
      return reply.code(403).send({ error: 'Prohibido' })
    }

    // Separar campos de User y Specialist
    const { phone, fullName, email, ...specialistData } = body

    // Actualizar User si hay campos de usuario
    if (phone !== undefined || fullName !== undefined || email !== undefined) {
      await fastify.prisma.user.update({
        where: { id: specialist.userId },
        data: { phone, fullName, email },
      })
    }

    // Actualizar Specialist con el resto de campos
    const updated = await fastify.prisma.specialist.update({
      where: { id: params.id },
      data: specialistData,
      include: { user: { select: { fullName: true, email: true, phone: true } } },
    })

    return { specialist: updated }
  })

  // Eliminar especialista (ADMIN)
  fastify.delete('/:id', {
    preHandler: [fastify.requireRole('ADMIN')],
  }, async (request, reply) => {
    const { id } = parseRequest(specialistParamsSchema, request).params
    await fastify.prisma.specialist.delete({ where: { id } })
    return { message: 'Especialista eliminado' }
  })
}