import { Context, Next } from 'hono'
import redis from '../services/redis'

const RATE_LIMIT_PER_MINUTE = parseInt(process.env.RATE_LIMIT_PER_MINUTE || '60')

export async function rateLimit(c: Context, next: Next) {
  const key = c.get('inboxId') || c.req.header('cf-connecting-ip') || 'unknown'
  const rateLimitKey = `ratelimit:${key}:${Math.floor(Date.now() / 60000)}`

  const current = await redis.incr(rateLimitKey)

  if (current === 1) {
    await redis.expire(rateLimitKey, 60)
  }

  if (current > RATE_LIMIT_PER_MINUTE) {
    return c.json(
      {
        error: 'Rate limit exceeded',
        limit: RATE_LIMIT_PER_MINUTE,
        reset_at: new Date(Math.ceil(Date.now() / 60000) * 60000).toISOString()
      },
      429
    )
  }

  c.header('X-RateLimit-Limit', RATE_LIMIT_PER_MINUTE.toString())
  c.header('X-RateLimit-Remaining', (RATE_LIMIT_PER_MINUTE - current).toString())

  await next()
}
