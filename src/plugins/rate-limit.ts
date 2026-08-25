import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import rateLimit from '@fastify/rate-limit'

const rateLimitPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(rateLimit, {
    global: true,
    max: Number(process.env.RATE_LIMIT_MAX) || 100,
    timeWindow: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    keyGenerator: (request) => request.ip,
    allowList: ['127.0.0.1', '::1'],
    errorResponseBuilder: () => ({
      code: 429,
      error: 'Too Many Requests',
      message: 'Demasiadas peticiones, intente más tarde',
    }),
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
    skipOnError: false,
  })

  // Rate limit específico para auth (más estricto)
  fastify.register(rateLimit, {
    max: 10,
    timeWindow: 60000,
    keyGenerator: (request) => `auth:${request.ip}`,
    errorResponseBuilder: () => ({
      code: 429,
      error: 'Too Many Requests',
      message: 'Demasiados intentos de autenticación',
    }),
  })
}

export default fp(rateLimitPlugin)