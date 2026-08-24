import { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'

export function errorHandler(err: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  request.log.error({ err }, 'Error occurred')

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

  // Default
  const statusCode = err.statusCode || 500
  return reply.code(statusCode).send({
    error: statusCode === 500 ? 'Error interno del servidor' : err.message,
  })
}