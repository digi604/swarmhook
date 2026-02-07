import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import landingRoutes from './routes/landing'
import agentRoutes from './routes/agents'
import inboxRoutes from './routes/inboxes'
import webhookRoutes from './routes/webhooks'
import eventRoutes from './routes/events'

const app = new Hono()

// Middleware
app.use('*', logger())
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'X-API-Key'],
}))

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

// Mount routes
app.route('/', landingRoutes)  // Landing page, skill.md, skill.json
app.route('/api/v1/agents', agentRoutes)
app.route('/api/v1/inboxes', inboxRoutes)
app.route('/api/v1/inboxes', eventRoutes)
app.route('/in', webhookRoutes)

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err)
  return c.json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  }, 500)
})

const port = parseInt(process.env.PORT || '3000')

console.log(`🚀 SwarmHook starting on port ${port}`)

export default {
  port,
  fetch: app.fetch,
}
