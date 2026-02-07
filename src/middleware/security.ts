import { Context, Next } from 'hono'
import { createMiddleware } from 'hono/factory'
import { logger } from '../lib/logger'

// Rate limiting store (in-memory, per-IP)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Security logging
export function logSecurity(message: string, data?: any) {
  logger.security(message, data)
}

// Request logging with security context
export const securityLogger = createMiddleware(async (c: Context, next: Next) => {
  const start = Date.now()
  const ip = c.req.header('x-real-ip') || c.req.header('x-forwarded-for') || 'unknown'
  const userAgent = c.req.header('user-agent') || 'unknown'
  const method = c.req.method
  const path = c.req.path

  await next()

  const duration = Date.now() - start
  const status = c.res.status

  // Log suspicious activity
  if (status === 401 || status === 403) {
    logSecurity('Unauthorized access attempt', {
      ip,
      method,
      path,
      status,
      userAgent
    })
  }

  // Log all requests in structured format
  logger.info('http_request', {
    ip,
    method,
    path,
    status,
    duration,
    userAgent: userAgent.substring(0, 100) // Truncate long user agents
  })
})

// Rate limiting middleware
export const rateLimit = (options: {
  windowMs: number
  max: number
  message?: string
}) => {
  return createMiddleware(async (c: Context, next: Next) => {
    const ip = c.req.header('x-real-ip') || c.req.header('x-forwarded-for') || 'unknown'
    const now = Date.now()

    // Get or create rate limit entry
    let entry = rateLimitStore.get(ip)

    if (!entry || now > entry.resetTime) {
      // Reset window
      entry = {
        count: 1,
        resetTime: now + options.windowMs
      }
      rateLimitStore.set(ip, entry)
    } else {
      entry.count++

      if (entry.count > options.max) {
        logSecurity('Rate limit exceeded', {
          ip,
          path: c.req.path,
          count: entry.count,
          max: options.max
        })

        return c.json({
          error: options.message || 'Too many requests, please try again later'
        }, 429)
      }
    }

    // Cleanup old entries periodically (every 1000 requests)
    if (Math.random() < 0.001) {
      for (const [key, val] of rateLimitStore.entries()) {
        if (now > val.resetTime) {
          rateLimitStore.delete(key)
        }
      }
    }

    await next()
  })
}

// Validate webhook payloads
export const validateWebhookPayload = createMiddleware(async (c: Context, next: Next) => {
  const contentType = c.req.header('content-type') || ''

  // Only validate JSON payloads
  if (contentType.includes('application/json')) {
    try {
      const body = await c.req.json()

      // Check payload size (max 1MB)
      const bodyStr = JSON.stringify(body)
      if (bodyStr.length > 1024 * 1024) {
        logSecurity('Oversized webhook payload rejected', {
          ip: c.req.header('x-real-ip'),
          size: bodyStr.length,
          path: c.req.path
        })
        return c.json({ error: 'Payload too large (max 1MB)' }, 413)
      }

      // Store parsed body for route handler
      c.set('webhookBody', body)
    } catch (e) {
      logSecurity('Invalid JSON in webhook payload', {
        ip: c.req.header('x-real-ip'),
        error: e instanceof Error ? e.message : 'Unknown error'
      })
      return c.json({ error: 'Invalid JSON payload' }, 400)
    }
  }

  await next()
})

// Sanitize output to prevent XSS
export function sanitizeOutput(data: any): any {
  if (typeof data === 'string') {
    // Basic XSS prevention - escape HTML
    return data
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeOutput)
  }

  if (data && typeof data === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeOutput(value)
    }
    return sanitized
  }

  return data
}
