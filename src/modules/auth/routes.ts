import { FastifyInstance, FastifyRequest } from 'fastify'
import { AuthService } from './service.js'
import { registerSchema, loginSchema, refreshSchema } from './schemas.js'
import { z } from 'zod'

type RegisterBody = z.infer<typeof registerSchema>['body']
type LoginBody = z.infer<typeof loginSchema>['body']
type RefreshBody = z.infer<typeof refreshSchema>['body']

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export async function authRoutes(fastify: FastifyInstance) {
  const authService = new AuthService(fastify.prisma, fastify)
  const isProd = process.env.NODE_ENV === 'production'
  const loginRateLimit = Number(process.env.LOGIN_RATE_LIMIT_MAX) || 10

  fastify.post('/register', {
    schema: registerSchema,
    config: { rateLimit: { max: Number(process.env.REGISTER_RATE_LIMIT_MAX) || 5, timeWindow: 60000 } },
  }, async (request: FastifyRequest<{ Body: RegisterBody }>, reply) => {
    // Manual validation to ensure schema works
    const validationResult = registerSchema.safeParse({ body: request.body })
    if (!validationResult.success) {
      return reply.code(400).send({
        error: 'Validación fallida',
        details: validationResult.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      })
    }
    try {
      const result = await authService.register(request.body)
      reply.setCookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      })
      return reply.code(201).send({ accessToken: result.accessToken, user: result.user })
    } catch (err) {
      if (errMessage(err) === 'EMAIL_EXISTS') {
        return reply.code(409).send({ error: 'Email ya registrado' })
      }
      throw err
    }
  })

  fastify.post('/login', {
    schema: loginSchema,
    config: { rateLimit: { max: loginRateLimit, timeWindow: 60000 } },
  }, async (request: FastifyRequest<{ Body: LoginBody }>, reply) => {
    try {
      const result = await authService.login(request.body.email, request.body.password)
      reply.setCookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      })
      return { accessToken: result.accessToken, user: result.user }
    } catch (err) {
      if (errMessage(err) === 'INVALID_CREDENTIALS') {
        return reply.code(401).send({ error: 'Credenciales inválidas' })
      }
      throw err
    }
  })

  fastify.post('/refresh', {
    schema: refreshSchema,
  }, async (request: FastifyRequest<{ Body: RefreshBody }>, reply) => {
    const refreshToken = request.body.refreshToken || request.cookies.refreshToken
    if (!refreshToken) return reply.code(401).send({ error: 'Refresh token requerido' })

    try {
      const result = await authService.refresh(refreshToken)
      reply.setCookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      })
      return { accessToken: result.accessToken, refreshToken: result.refreshToken, user: result.user }
    } catch (err) {
      reply.clearCookie('refreshToken', { path: '/' })
      return reply.code(401).send({ error: 'Sesión expirada, inicie sesión nuevamente' })
    }
  })

  fastify.post('/logout', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const refreshToken = request.cookies.refreshToken
    if (refreshToken) await authService.logout(refreshToken)
    reply.clearCookie('refreshToken', { path: '/' })
    return { message: 'Sesión cerrada' }
  })

  fastify.get('/me', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.user!.id },
      select: { id: true, email: true, fullName: true, role: true, specialist: { select: { id: true } }, createdAt: true },
    })
    return { user: { ...user, specialistId: user?.specialist?.id ?? null } }
  })
}