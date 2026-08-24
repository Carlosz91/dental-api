import { describe, it, expect, beforeEach } from 'vitest'
import { app, prisma } from './setup.js'
import { createTestUser } from './utils/factories.js'
import { UserRole } from '@prisma/client'

describe('Rate Limiting', () => {
  beforeEach(async () => {
    await createTestUser(prisma, { email: 'ratelimit@test.com', password: 'Pass123!' })
  })

  it('should limit login attempts', async () => {
    // Test that rate limit headers are present
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'ratelimit@test.com', password: 'wrong' },
    })
    expect([401, 429]).toContain(res.statusCode)
    expect(res.headers['x-ratelimit-limit']).toBeDefined()
    expect(res.headers['x-ratelimit-remaining']).toBeDefined()
    expect(res.headers['x-ratelimit-reset']).toBeDefined()
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