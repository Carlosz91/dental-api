import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import rateLimit from '@fastify/rate-limit'

const rateLimitPlugin: FastifyPluginAsync = async (fastify) => {
  // Single GLOBAL limiter. Route-specific stricter limits are declared
  // per-route via `config: { rateLimit: { ... } }` (see login/register/create).
  await fastify.register(rateLimit, {
    global: true,
    max: Number(process.env.RATE_LIMIT_MAX) || 300,
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
}

export default fp(rateLimitPlugin)