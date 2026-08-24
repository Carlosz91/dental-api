import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { buildApp } from '../src/app.js'
import { FastifyInstance } from 'fastify'
import { execSync } from 'node:child_process'

// Test database URL (puerto 5433 para no chocar con dev)
const TEST_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/dental_test?schema=public'

export let app: FastifyInstance
export let prisma: PrismaClient

let isSetupDone = false

beforeAll(async () => {
  // Set env ANTES de cualquier cosa
  process.env.DATABASE_URL = TEST_DATABASE_URL
  process.env.NODE_ENV = 'test'
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-min-32-chars-long'
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-min-32-chars-long'
  process.env.JWT_ACCESS_TTL = '15m'
  process.env.JWT_REFRESH_TTL = '7d'
  process.env.BCRYPT_ROUNDS = '4'
  process.env.RATE_LIMIT_MAX = '1000'
  process.env.FRONTEND_URL = 'http://localhost:5173'

  // Crear cliente Prisma para tests (solo la primera vez)
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: { db: { url: TEST_DATABASE_URL } },
    })
  }

  // Setup de BD solo una vez
  if (!isSetupDone) {
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS public CASCADE`)
    await prisma.$executeRawUnsafe(`CREATE SCHEMA public`)
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`)

    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
      stdio: 'inherit',
    })

    isSetupDone = true
  }

  // Build app
  app = await buildApp()
  await app.ready()
})

afterAll(async () => {
  await app.close()
  await prisma.$disconnect()
})

beforeEach(async () => {
  // Limpiar tablas en orden de dependencias
  await prisma.auditEvent.deleteMany()
  await prisma.appointment.deleteMany()
  await prisma.blockedSlot.deleteMany()
  await prisma.availabilityRule.deleteMany()
  await prisma.specialist.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.user.deleteMany()
})

// Helper global para requests autenticados
export async function authRequest(
  method: 'get' | 'post' | 'patch' | 'delete',
  url: string,
  token: string,
  body?: any
) {
  const req = app.inject({
    method: method.toUpperCase(),
    url,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  return req
}

// Helper para login y obtener tokens
export async function loginAs(email: string, password: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email, password },
  })
  const data = JSON.parse(res.body)
  return { accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user }
}

export async function registerAndLogin(data: { email: string; password: string; fullName: string; phone?: string }) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: data,
  })
  const body = JSON.parse(res.body)
  return { accessToken: body.accessToken, refreshToken: body.refreshToken, user: body.user }
}