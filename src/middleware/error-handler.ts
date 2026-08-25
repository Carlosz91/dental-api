import { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { RequestValidationError } from '../utils/parse-request.js'

export function errorHandler(err: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  request.log.error({ err }, 'Error occurred')

  // Rate limit errors arrive as 429 (plugin builder or legacy shape)
  if (err.statusCode === 429 || (err as unknown as { code?: number }).code === 429) {
    return reply.code(429).send({ error: 'Demasiadas peticiones, intente más tarde' })
  }

  // Our own validation errors (stable class, immune to zod copy mismatches)
  if (err instanceof RequestValidationError) {
    return reply.code(400).send({
      error: 'Validación fallida',
      details: err.details,
    })
  }

  // Zod validation errors (from fastify-type-provider-zod)
  if (err instanceof ZodError) {
    return reply.code(400).send({
      error: 'Validación fallida',
      details: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
    })
  }

  // Fastify validation errors (when using schema validation)
  if (err.validation) {
    return reply.code(400).send({ error: 'Datos inválidos', details: err.validation })
  }

  // Fastify schema validation error (from ajv)
  if (err.name === 'FastifySchemaValidationError' || err.code === 'FST_ERR_VALIDATION') {
    return reply.code(400).send({ error: 'Validación fallida', details: err.validation || err.message })
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return reply.code(409).send({ error: 'Registro duplicado', field: err.meta?.target })
    }
    if (err.code === 'P2003') {
      return reply.code(400).send({ error: 'Referencia inválida' })
    }
  }

  // Default — SECURITY: never echo internal error messages to clients
  const statusCode = err.statusCode || 500
  if (statusCode >= 500) {
    return reply.code(statusCode).send({ error: 'Error interno del servidor' })
  }
  // 4xx from framework/validation carry safe, user-facing messages
  if (err.validation || err.name === 'FastifySchemaValidationError' || err.code === 'FST_ERR_VALIDATION') {
    return reply.code(statusCode).send({ error: 'Datos inválidos', details: err.validation })
  }
  return reply.code(statusCode).send({ error: 'Solicitud inválida' })
}