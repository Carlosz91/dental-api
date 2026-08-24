import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    verifyRefresh: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

const jwtPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(jwt, {
    secret: fastify.config.JWT_ACCESS_SECRET,
    sign: { expiresIn: fastify.config.JWT_ACCESS_TTL },
    verify: { algorithms: ['HS256'] },
  })

  fastify.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.code(401).send({ error: 'No autorizado', message: 'Token inválido o expirado' })
    }
  })

  fastify.decorate('verifyRefresh', async (request, reply) => {
    try {
      await request.jwtVerify({ secret: fastify.config.JWT_REFRESH_SECRET })
    } catch (err) {
      reply.code(401).send({ error: 'No autorizado', message: 'Refresh token inválido o expirado' })
    }
  })
}

export default fp(jwtPlugin)