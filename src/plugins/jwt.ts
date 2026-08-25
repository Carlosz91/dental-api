import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

const jwtPlugin: FastifyPluginAsync = async (fastify) => {
  const accessSecret = process.env.JWT_ACCESS_SECRET
  const refreshSecret = process.env.JWT_REFRESH_SECRET

  // SECURITY: refuse to boot with weak/absent secrets
  if (!accessSecret || !refreshSecret) {
    throw new Error('JWT secrets not configured')
  }
  for (const [name, value] of [['JWT_ACCESS_SECRET', accessSecret], ['JWT_REFRESH_SECRET', refreshSecret]] as const) {
    if (value.length < 32) {
      throw new Error(`${name} must be at least 32 characters`)
    }
  }

  await fastify.register(jwt, {
    secret: accessSecret,
    sign: { expiresIn: process.env.JWT_ACCESS_TTL || '15m' },
    verify: { algorithms: ['HS256'] },
  })

  fastify.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      fastify.log.error({ err }, 'Auth failed')
      reply.code(401).send({ error: 'No autorizado', message: 'Token inválido o expirado' })
    }
  })
}

export default fp(jwtPlugin)