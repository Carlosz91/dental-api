import { z } from 'zod'

/**
 * Carries parsed field issues with a stable HTTP status.
 * Decoupled from `instanceof ZodError` so duplicate zod copies can't break mapping.
 */
export class RequestValidationError extends Error {
  readonly statusCode = 400
  readonly details: Array<{ field: string; message: string }>

  constructor(error: z.ZodError) {
    super('Datos inválidos')
    this.name = 'RequestValidationError'
    this.details = error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }))
  }
}

/**
 * Explicit request validation against a WRAPPED zod schema ({ body, params }).
 *
 * Throws the raw ZodError on failure — the global error handler maps
 * ZodError -> HTTP 400 with field details.
 *
 * Returns the PARSED (and unknown-keys-stripped) data, which callers MUST use
 * instead of request.body/request.params — this kills mass assignment.
 */
export function parseRequest<S extends z.ZodTypeAny>(
  schema: S,
  request: { body?: unknown; params?: unknown; query?: unknown }
): z.infer<S> {
  const result = schema.safeParse({
    ...(request.params !== undefined ? { params: request.params } : {}),
    ...(request.query !== undefined ? { query: request.query } : {}),
    ...(request.body !== undefined ? { body: request.body } : {}),
  })
  if (!result.success) {
    throw new RequestValidationError(result.error)
  }
  return result.data
}
