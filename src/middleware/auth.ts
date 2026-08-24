import { FastifyRequest, FastifyReply } from 'fastify'
import { PrismaClient, UserRole } from '@prisma/client'

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  specialistId?: string
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
    request.user = request.user as AuthUser
  } catch {
    reply.code(401).send({ error: 'No autorizado' })
  }
}

export function requireRole(...roles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply)
    if (!request.user || !roles.includes(request.user.role)) {
      reply.code(403).send({ error: 'Prohibido', message: 'Rol insuficiente' })
    }
  }
}

export function requireOwnershipOrStaff(getResourceUserId: (request: FastifyRequest) => Promise<string>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply)
    const resourceUserId = await getResourceUserId(request)
    if (request.user!.role !== 'ADMIN' && request.user!.role !== 'STAFF' && request.user!.id !== resourceUserId) {
      reply.code(403).send({ error: 'Prohibido', message: 'No tienes acceso a este recurso' })
    }
  }
}