import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import agentRoutes from './routes/agents'
import inboxRoutes from './routes/inboxes'
import webhookRoutes from './routes/webhooks'
import eventRoutes from './routes/events'
import { readFileSync } from 'fs'
import { join } from 'path'

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

// Landing page
app.get('/', (c) => {
  const landingPage = readFileSync(join(process.cwd(), 'landing.txt'), 'utf-8')
  c.header('Content-Type', 'text/plain; charset=utf-8')
  return c.text(landingPage)
})

// Skill files
app.get('/skill.md', (c) => {
  try {
    const skillMd = readFileSync(join(process.cwd(), 'skill.md'), 'utf-8')
    c.header('Content-Type', 'text/markdown; charset=utf-8')
    c.header('Content-Disposition', 'attachment; filename="swarmhook-skill.md"')
    return c.text(skillMd)
  } catch (error) {
    return c.json({ error: 'Skill file not found' }, 404)
  }
})

app.get('/skill.json', (c) => {
  const metadata = {
    name: 'SwarmHook',
    version: '0.1.0',
    description: 'Zero-cost webhook infrastructure for autonomous AI agents',
    category: 'infrastructure',
    base_url: process.env.BASE_URL || 'http://localhost:3000',
    authentication: {
      type: 'api_key',
      header: 'X-API-Key',
      registration_endpoint: '/api/v1/agents/register'
    },
    endpoints: [
      {
        path: '/api/v1/agents/register',
        method: 'POST',
        description: 'Register new agent and get API key',
        requires_auth: false
      },
      {
        path: '/api/v1/agents/me',
        method: 'GET',
        description: 'Get agent profile and usage stats',
        requires_auth: true
      },
      {
        path: '/api/v1/inboxes',
        method: 'POST',
        description: 'Create ephemeral webhook inbox',
        requires_auth: true
      },
      {
        path: '/api/v1/inboxes/:id/events',
        method: 'GET',
        description: 'Poll for webhook events (supports long polling)',
        requires_auth: true
      },
      {
        path: '/api/v1/inboxes/:id/stream',
        method: 'GET',
        description: 'Stream events via Server-Sent Events',
        requires_auth: true
      },
      {
        path: '/in/:inbox_id',
        method: 'POST',
        description: 'Receive webhook from external service',
        requires_auth: false
      }
    ],
    limits: {
      free_tier: {
        max_concurrent_inboxes: 5,
        max_events_per_inbox: 100,
        max_inbox_ttl_hours: 48,
        rate_limit_per_minute: 60
      }
    },
    documentation: 'https://github.com/digi604/swarmhook',
    support: 'https://github.com/digi604/swarmhook/issues'
  }

  return c.json(metadata, 200, {
    'Content-Disposition': 'attachment; filename="swarmhook-skill.json"'
  })
})

// Mount routes
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
