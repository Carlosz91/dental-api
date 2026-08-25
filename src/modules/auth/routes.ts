import { FastifyInstance, FastifyRequest } from 'fastify'
import { AuthService } from './service.js'
import { registerSchema, loginSchema, refreshSchema } from './schemas.js'
import { parseRequest } from '../../utils/parse-request.js'

export async function authRoutes(fastify: FastifyInstance) {
  const authService = new AuthService(fastify.prisma, fastify)
  const isProd = process.env.NODE_ENV === 'production'
  const loginRateLimit = Number(process.env.LOGIN_RATE_LIMIT_MAX) || 10

  fastify.post('/register', {
    config: { rateLimit: { max: Number(process.env.REGISTER_RATE_LIMIT_MAX) || 5, timeWindow: 60000 } },
  }, async (request, reply) => {
    const input = parseRequest(registerSchema, request)
    try {
      const result = await authService.register(input.body)
      reply.setCookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      })
      return reply.code(201).send({ accessToken: result.accessToken, user: result.user })
    } catch (err) {
      if (err instanceof Error && err.message === 'EMAIL_EXISTS') {
        return reply.code(409).send({ error: 'Email ya registrado' })
      }
      throw err
    }
  })

  fastify.post('/login', {
    config: { rateLimit: { max: loginRateLimit, timeWindow: 60000 } },
  }, async (request, reply) => {
    const input = parseRequest(loginSchema, request)
    try {
      const result = await authService.login(input.body.email, input.body.password)
      reply.setCookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      })
      return { accessToken: result.accessToken, user: result.user }
    } catch (err) {
      if (err instanceof Error && err.message === 'INVALID_CREDENTIALS') {
        return reply.code(401).send({ error: 'Credenciales inválidas' })
      }
      throw err
    }
  })

  fastify.post('/refresh', {}, async (request, reply) => {
    const input = parseRequest(refreshSchema, request)
    const refreshToken = input.body?.refreshToken || request.cookies.refreshToken
    if (!refreshToken) return reply.code(401).send({ error: 'Refresh token requerido' })

    try {
      const result = await authService.refresh(refreshToken)
      reply.setCookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      })
      return { accessToken: result.accessToken, refreshToken: result.refreshToken, user: result.user }
    } catch {
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