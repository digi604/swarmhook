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
  console.log('GET / handler called')
  try {
    const landingPage = `  ____                           _   _             _
 / ___|_      ____ _ _ __ _ __ | | | | ___   ___ | | __
 \\___ \\ \\ /\\ / / _\` | '__| '_ \\| |_| |/ _ \\ / _ \\| |/ /
  ___) \\ V  V / (_| | |  | | | |  _  | (_) | (_) |   <
 |____/ \\_/\\_/ \\__,_|_|  |_| |_|_| |_|\\___/ \\___/|_|\\_\\

        Zero-cost webhook infrastructure for AI agents

  ╔═══════════════════════════════════════════════════════════════╗
  ║     Ephemeral Webhook Inboxes for Autonomous Agents          ║
  ║     No servers. No costs. Just webhooks that work.           ║
  ╚═══════════════════════════════════════════════════════════════╝

  🚀 GET STARTED:
  ────────────────
  1. Register as an agent:
     POST /api/v1/agents/register
     {"name": "MyAgent"}

  2. Save your API key (swh_...)

  3. Create webhook inbox:
     POST /api/v1/inboxes
     X-API-Key: swh_your_key

  4. Start receiving webhooks!

  📖 SKILL FILES (for AI agents):
  ├── /skill.md        Full documentation & usage guide
  └── /skill.json      Machine-readable metadata

  🔗 API ENDPOINTS:
  ├── /health               Health check
  │
  ├── /api/v1/agents        Agent management
  │   ├── POST /register         Register new agent
  │   └── GET  /me               Your profile & stats
  │
  ├── /api/v1/inboxes       Inbox management
  │   ├── POST /                 Create inbox (requires agent key)
  │   ├── GET  /{id}             Inbox details (requires inbox key)
  │   └── GET  /{id}/events      Poll events (supports long polling)
  │       ?wait=60               Long poll (wait up to 60s)
  │       ?unread=true           Only unread events
  │       ?mark_read=true        Mark as read
  │       ?since=ISO8601         Events since timestamp
  │       ?limit=50              Max events to return
  │
  ├── /api/v1/inboxes       Event streaming
  │   └── GET  /{id}/stream      Server-Sent Events stream
  │
  └── /in/{inbox_id}        Webhook receiver (public)
      ├── POST /                 Receive webhook from any source
      └── GET  /                 Check inbox status

  💡 HOW IT WORKS:
  ────────────────
  1. You create an ephemeral inbox (24-48hr lifetime)
  2. You get a public webhook URL: https://swarmhook.com/in/inbox_abc123
  3. Register that URL with external services (SwarmMarket, Stripe, etc.)
  4. Poll for events or use SSE streaming
  5. Inbox auto-deletes when expired

  🎯 USE CASES:
  ────────────────
  ✓ AI agents receiving marketplace notifications
  ✓ Bots monitoring payment events (Stripe, PayPal)
  ✓ Autonomous systems tracking GitHub webhooks
  ✓ Agents listening to blockchain events
  ✓ Any scenario where you need webhooks without a server

  💰 PRICING:
  ────────────────
  Free Tier:
  • 5 concurrent inboxes
  • 100 events per inbox
  • 48 hour max TTL
  • 60 requests/minute

  Premium (Coming Soon):
  • Unlimited inboxes
  • 10,000 events per inbox
  • 7 day TTL
  • Priority support

  📚 DOCUMENTATION:
  ────────────────
  • Quick Start:   https://github.com/digi604/swarmhook#readme
  • Security:      https://github.com/digi604/swarmhook/blob/main/SECURITY.md
  • Deploy Guide:  https://github.com/digi604/swarmhook/blob/main/DEPLOYMENT.md

  🛠️ TECH STACK:
  ────────────────
  • Runtime: Bun (3x faster than Node.js)
  • Framework: Hono (fastest TS framework)
  • Database: Redis (ephemeral TTL-based storage)
  • Hosting: Railway.app (free tier available)

  Built with ❤️  for the autonomous agent economy`

    console.log('Landing page length:', landingPage.length)
    c.header('Content-Type', 'text/plain; charset=utf-8')
    const response = c.text(landingPage)
    console.log('Response:', response)
    return response
  } catch (error) {
    console.error('Error in GET / handler:', error)
    return c.text('Error loading landing page: ' + error.message, 500)
  }
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
