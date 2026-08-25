import Fastify, { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { config } from 'dotenv'
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'
config()

import prismaPlugin from './plugins/prisma.js'
import jwtPlugin from './plugins/jwt.js'
import rateLimitPlugin from './plugins/rate-limit.js'
import authPlugin from './middleware/auth.js'
import { authRoutes } from './modules/auth/routes.js'
import { specialistRoutes } from './modules/specialists/routes.js'
import { availabilityRoutes } from './modules/availability/routes.js'
import { appointmentRoutes } from './modules/appointments/routes.js'
import { errorHandler } from './middleware/error-handler.js'

export async function buildApp(prisma?: PrismaClient): Promise<FastifyInstance> {
  const isProd = process.env.NODE_ENV === 'production'

  const app = Fastify({
    logger: { level: isProd ? 'info' : 'debug' },
    // Only enable behind a real reverse proxy (nginx, etc.) — otherwise clients can spoof IPs
    trustProxy: process.env.TRUST_PROXY === 'true',
  }).withTypeProvider<ZodTypeProvider>()

  // SECURITY: each module registers `zodSchemaHook` inside its own scope
  // (see src/utils/zod-route-schema.ts — onRoute hooks are not inherited).

  // If test prisma provided, assign directly BEFORE registering routes
  if (prisma) {
    app.decorate('prisma', prisma)
  } else {
    await app.register(prismaPlugin)
  }

  await app.register(jwtPlugin)
  await app.register(rateLimitPlugin)
  await app.register(authPlugin)

  // Cookie plugin for setCookie/clearCookie
  // SECURITY: never fall back to a public known secret — random per boot at minimum
  const cookieSecret = process.env.COOKIE_SECRET
  if (!cookieSecret && isProd) {
    throw new Error('COOKIE_SECRET is required in production')
  }
  await app.register(import('@fastify/cookie'), {
    secret: cookieSecret || crypto.randomBytes(32).toString('hex'),
    hook: 'onRequest',
  })

  // CORS + Helmet
  await app.register(import('@fastify/cors'), {
    origin: (origin, cb) => {
      // Allow localhost/LAN origins in development; restrict via FRONTEND_URL in production
      const allowed = !origin || /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(origin)
      cb(null, allowed)
    },
    credentials: true,
  })
  // SECURITY: strict headers ON in production; relaxed in dev so Swagger UI can load CDNs
  await app.register(import('@fastify/helmet'), {
    contentSecurityPolicy: isProd,
  })

  // Interactive docs are a developer tool: never expose them in production
  if (!isProd) {
    await app.register(import('./plugins/swagger.js'))
  }

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  // Rutas API
  await app.register(authRoutes, { prefix: '/api/v1/auth' })
  await app.register(specialistRoutes, { prefix: '/api/v1/specialists' })
  await app.register(availabilityRoutes, { prefix: '/api/v1/availability' })
  await app.register(appointmentRoutes, { prefix: '/api/v1/appointments' })

  // Error handler global
  app.setErrorHandler(errorHandler)

  return app
}