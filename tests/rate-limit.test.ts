import { describe, it, expect, beforeEach } from 'vitest'
import { app, prisma } from './setup.js'
import { createTestUser } from './utils/factories.js'
import { UserRole } from '@prisma/client'

describe('Rate Limiting', () => {
  beforeEach(async () => {
    await createTestUser(prisma, app, { email: 'ratelimit@test.com', password: 'Pass123!' })
  })

  it('should limit login attempts', async () => {
    // 10 intentos permitidos (config en rate-limit.ts para auth)
    for (let i = 0; i < 10; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'ratelimit@test.com', password: 'wrong' },
      })
      expect([401, 429]).toContain(res.statusCode)
    }

    // El 11avo debe ser 429
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'ratelimit@test.com', password: 'wrong' },
    })
    expect(res.statusCode).toBe(429)
  })

  it('should have rate limit headers', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'ratelimit@test.com', password: 'wrong' },
    })
    expect(res.headers['x-ratelimit-limit']).toBeDefined()
    expect(res.headers['x-ratelimit-remaining']).toBeDefined()
    expect(res.headers['x-ratelimit-reset']).toBeDefined()
  })
})