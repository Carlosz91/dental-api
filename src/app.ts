import Fastify, { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
config()

import prismaPlugin from './plugins/prisma.js'
import jwtPlugin from './plugins/jwt.js'
import rateLimitPlugin from './plugins/rate-limit.js'
import swaggerPlugin from './plugins/swagger.js'
import authPlugin from './middleware/auth.js'
import { authRoutes } from './modules/auth/routes.js'
import { specialistRoutes } from './modules/specialists/routes.js'
import { availabilityRoutes } from './modules/availability/routes.js'
import { appointmentRoutes } from './modules/appointments/routes.js'
import { errorHandler } from './middleware/error-handler.js'

export async function buildApp(prisma?: PrismaClient): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' },
  }).withTypeProvider<ZodTypeProvider>()

  // If test prisma provided, assign directly BEFORE registering routes
  if (prisma) {
    app.decorate('prisma', prisma)
  } else {
    // Plugins base
    await app.register(prismaPlugin)
  }

  await app.register(jwtPlugin)
  await app.register(rateLimitPlugin)
  await app.register(swaggerPlugin)
  await app.register(authPlugin)

  // Cookie plugin for setCookie/clearCookie
  await app.register(import('@fastify/cookie'), {
    secret: process.env.COOKIE_SECRET || 'test-secret-change-in-production',
    hook: 'onRequest',
  })

  // CORS + Helmet
  await app.register(import('@fastify/cors'), {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
  await app.register(import('@fastify/helmet'), {
    contentSecurityPolicy: false,
  })

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