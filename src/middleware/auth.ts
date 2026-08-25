import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { UserRole } from '@prisma/client'
import fp from 'fastify-plugin'

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  specialistId?: string
}

declare module 'fastify' {
  interface FastifyInstance {
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireRole: (...roles: UserRole[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireOwnershipOrStaff: (getResourceUserId: (request: FastifyRequest) => Promise<string>) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

// Official @fastify/jwt augmentation: types both the signed payload and
// `request.user` after jwtVerify(), without clashing with its own declaration.
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: string; email: string; role: UserRole }
    user: AuthUser
  }
}

async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    reply.code(401).send({ error: 'No autorizado' })
  }
}

/** Populates request.user when a valid token is present; never rejects */
export async function optionalAuth(request: FastifyRequest) {
  try {
    await request.jwtVerify()
  } catch {
    // anonymous access — fine for public booking
  }
}

// SECURITY: role comes from the DB, not the JWT — revoked/changed roles apply immediately
async function freshRole(request: FastifyRequest): Promise<{ role: UserRole; isActive: boolean } | null> {
  return request.server.prisma.user.findUnique({
    where: { id: request.user.id },
    select: { role: true, isActive: true },
  })
}

function requireRole(...roles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply)
    if (reply.sent) return

    const dbUser = await freshRole(request)
    if (!dbUser || !dbUser.isActive || !roles.includes(dbUser.role)) {
      reply.code(403).send({ error: 'Prohibido', message: 'Rol insuficiente' })
    }
  }
}

function requireOwnershipOrStaff(getResourceUserId: (request: FastifyRequest) => Promise<string>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply)
    if (reply.sent) return

    const dbUser = await freshRole(request)
    const isStaff = !!dbUser?.isActive && (dbUser.role === 'ADMIN' || dbUser.role === 'STAFF')
    if (!isStaff) {
      const resourceUserId = await getResourceUserId(request)
      if (request.user!.id !== resourceUserId) {
        reply.code(403).send({ error: 'Prohibido', message: 'No tienes acceso a este recurso' })
      }
    }
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('requireAuth', requireAuth)
  fastify.decorate('requireRole', requireRole)
  fastify.decorate('requireOwnershipOrStaff', requireOwnershipOrStaff)
}

export default fp(authPlugin)
export { requireAuth, requireRole, requireOwnershipOrStaff }