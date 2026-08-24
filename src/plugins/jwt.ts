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
  const accessSecret = process.env.JWT_ACCESS_SECRET
  const refreshSecret = process.env.JWT_REFRESH_SECRET
  
  if (!accessSecret || !refreshSecret) {
    throw new Error('JWT secrets not configured')
  }

  await fastify.register(jwt, {
    secret: accessSecret,
    sign: { expiresIn: process.env.JWT_ACCESS_TTL || '15m' },
    verify: { algorithms: ['HS256'] },
  })

  fastify.decorate('authenticate', async (request, reply) => {
    try {
      // Debug: log the authorization header
      fastify.log.info({ authHeader: request.headers.authorization }, 'Auth header')
      await request.jwtVerify()
      fastify.log.info({ user: request.user }, 'User authenticated')
    } catch (err) {
      fastify.log.error({ err }, 'Auth failed')
      reply.code(401).send({ error: 'No autorizado', message: 'Token inválido o expirado' })
    }
  })

  fastify.decorate('verifyRefresh', async (request, reply) => {
    try {
      await request.jwtVerify({ secret: process.env.JWT_REFRESH_SECRET! })
    } catch (err) {
      reply.code(401).send({ error: 'No autorizado', message: 'Refresh token inválido o expirado' })
    }
  })
}

export default fp(jwtPlugin)