import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { buildApp } from '../src/app.js'
import { FastifyInstance } from 'fastify'

// Test database URL (usa la misma que docker-compose)
const TEST_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/dental_test?schema=public'

export let app: FastifyInstance
export let prisma: PrismaClient

beforeAll(async () => {
  // Crear cliente Prisma para tests
  prisma = new PrismaClient({
    datasources: { db: { url: TEST_DATABASE_URL } },
  })

  // Limpiar y migrar test DB
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;`)
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`)

  // Set env para la app
  process.env.DATABASE_URL = TEST_DATABASE_URL
  process.env.NODE_ENV = 'test'
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-min-32-chars-long'
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-min-32-chars-long'
  process.env.JWT_ACCESS_TTL = '15m'
  process.env.JWT_REFRESH_TTL = '7d'
  process.env.BCRYPT_ROUNDS = '4' // rápido para tests
  process.env.RATE_LIMIT_MAX = '1000'
  process.env.FRONTEND_URL = 'http://localhost:5173'

  // Build app
  app = await buildApp()
  await app.ready()

  // Ejecutar migraciones programáticamente
  const { execSync } = await import('node:child_process')
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  })
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