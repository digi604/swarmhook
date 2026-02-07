import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import agentRoutes from './routes/agents'
import inboxRoutes from './routes/inboxes'
import webhookRoutes from './routes/webhooks'
import eventRoutes from './routes/events'
import { readFileSync } from 'fs'
import { join } from 'path'
import { securityLogger, rateLimit } from './middleware/security'
import { logger as axiomLogger } from './lib/logger'

const app = new Hono()

// Log Axiom status on startup
if (process.env.AXIOM_TOKEN && process.env.AXIOM_DATASET) {
  console.log(`✅ Axiom logging enabled: dataset=${process.env.AXIOM_DATASET}`)
  axiomLogger.info('swarmhook_started', {
    version: '1.0.0',
    dataset: process.env.AXIOM_DATASET
  })
} else {
  console.log('⚠️  Axiom logging disabled (AXIOM_TOKEN or AXIOM_DATASET not set)')
}

// Middleware
app.use('*', logger())
app.use('*', securityLogger) // Security logging
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'X-API-Key'],
}))

// Rate limiting - global
app.use('*', rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  message: 'Too many requests, please slow down'
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
  const accept = c.req.header('accept') || ''

  // Serve HTML for browsers, plain text for API clients
  if (accept.includes('text/html')) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SwarmHook - Webhook Infrastructure for AI Agents</title>
    <style>
        body { font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace; background: #0d1117; color: #c9d1d9; margin: 0; padding: 20px; }
        pre { margin: 0; white-space: pre; line-height: 1.4; }
        a { color: #58a6ff; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .header { color: #58a6ff; font-weight: bold; font-size: 1.1em; margin-bottom: 10px; }
        .tagline { color: #8b949e; font-style: italic; }
    </style>
</head>
<body>
<pre>
<span class="header">
 ________  ___       __   ________  ________  _____ ______   ___  ___  ________  ________  ___  __
|\   ____\|\  \     |\  \|\   __  \|\   __  \|\   _ \  _   \|\  \|\  \|\   __  \|\   __  \|\  \|\  \
\ \  \___|\ \  \    \ \  \ \  \|\  \ \  \|\  \ \  \\\__\ \  \ \  \\\  \ \  \|\  \ \  \|\  \ \  \/  /|_
 \ \_____  \ \  \  __\ \  \ \   __  \ \   _  _\ \  \\|__| \  \ \   __  \ \  \\\  \ \  \\\  \ \   ___  \
  \|____|\  \ \  \|\__\_\  \ \  \ \  \ \  \\  \\ \  \    \ \  \ \  \ \  \ \  \\\  \ \  \\\  \ \  \\ \  \
    ____\_\  \ \____________\ \__\ \__\ \__\\ _\\ \__\    \ \__\ \__\ \__\ \_______\ \_______\ \__\\ \__\
   |\_________\|____________|\|__|\|__|\|__|\|__|\|__|     \|__|\|__|\|__|\|_______|\|_______|\|__| \|__|
   \|_________|
</span>
<span class="tagline">        Zero-cost webhook infrastructure for AI agents</span>

  ╔════════════════════════════════════════════════════════════════╗
  ║     Ephemeral Webhook Inboxes for Autonomous Agents            ║
  ║     No servers. No costs. Just webhooks that work.             ║
  ╚════════════════════════════════════════════════════════════════╝

  💡 WHAT IS SWARMHOOK?
  ────────────────────────
  SwarmHook gives AI agents instant webhook URLs without servers, config, or costs.

  🤖 If you are an AI agent, read the <a href="/skill.md">skill.md</a> file for full documentation!

  Perfect for:
  • Receiving marketplace notifications (SwarmMarket, eBay, etc.)
  • Monitoring payment events (Stripe, PayPal, crypto)
  • Tracking GitHub webhooks, CI/CD pipelines
  • Any async event your agent needs to respond to

  🎯 THE PROBLEM:
  ────────────────
  Your AI agent needs webhooks, but you don't want to:
  ✗ Spin up a server just to receive HTTP POSTs
  ✗ Configure nginx, SSL certs, and DNS
  ✗ Pay $5-20/month for a VPS
  ✗ Deal with ngrok tunnels that expire

  ✓ THE SOLUTION:
  ────────────────
  1. Create an ephemeral inbox (takes 2 seconds)
  2. Get a public webhook URL: https://swarmhook.com/in/inbox_abc123
  3. Register that URL with any service (SwarmMarket, Stripe, GitHub, etc.)
  4. Poll for events or stream them in real-time
  5. Inbox auto-deletes after 24-48 hours

  No servers. No config. Just works.

  💡 HOW IT WORKS:
  ────────────────
  1. You create an ephemeral inbox (24-48hr lifetime)
  2. You get a public webhook URL: https://swarmhook.com/in/inbox_abc123
  3. Register that URL with external services (SwarmMarket, Stripe, etc.)
  4. Poll for events or stream them in real-time
  5. Inbox auto-deletes when expired

  🚀 QUICK START:
  ────────────────
  # 1. Register as an agent
  curl -X POST https://swarmhook.com/api/v1/agents/register \\
    -H "Content-Type: application/json" \\
    -d '{"name": "MyAgent"}'
  # Returns: {"agent_id": "...", "api_key": "swh_..."}

  # 2. Create webhook inbox
  curl -X POST https://swarmhook.com/api/v1/inboxes \\
    -H "X-API-Key: swh_your_key"
  # Returns: {"inbox_id": "inbox_abc123", "webhook_url": "https://swarmhook.com/in/inbox_abc123"}

  # 3. Poll for events
  curl https://swarmhook.com/api/v1/inboxes/inbox_abc123/events \\
    -H "X-API-Key: swh_your_key"

  Done! Now register that webhook_url with any service.

  🔒 SECURITY:
  ────────────────
  ✓ API keys required for agent & inbox management
  ✓ Webhook URLs are unguessable (cryptographic random IDs)
  ✓ Rate limiting on all endpoints
  ✓ Request validation & sanitization
  ✓ No PII stored (just webhook payloads)
  ✓ Auto-expiring inboxes (ephemeral by design)

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

  📖 SKILL FILES (for AI agents):
  ├── <a href="/skill.md">/skill.md</a>        Full documentation & usage guide
  └── <a href="/skill.json">/skill.json</a>      Machine-readable metadata

  🔗 API ENDPOINTS:
  ├── <a href="/health">/health</a>               Health check
  │
  ├── /api/v1/agents        Agent management
  │   ├── POST /register         Register new agent
  │   └── GET  /me               Your profile & stats
  │
  ├── <a href="/api/v1/inboxes">/api/v1/inboxes</a>       Inbox management
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

  📚 DOCUMENTATION:
  ────────────────
  • Quick Start:   <a href="https://github.com/digi604/swarmhook#readme">https://github.com/digi604/swarmhook#readme</a>
  • Security:      <a href="https://github.com/digi604/swarmhook/blob/main/SECURITY.md">https://github.com/digi604/swarmhook/blob/main/SECURITY.md</a>
  • Deploy Guide:  <a href="https://github.com/digi604/swarmhook/blob/main/DEPLOYMENT.md">https://github.com/digi604/swarmhook/blob/main/DEPLOYMENT.md</a>

  Built with ❤️  for the autonomous agent economy
  From the builders of <a href="https://swarmmarket.io">swarmmarket.io</a>

</pre>
</body>
</html>`
    return c.html(html)
  }

  // Plain text version for API clients (curl, etc.)
  const landingPage = `
 ________  ___       __   ________  ________  _____ ______   ___  ___  ________  ________  ___  __
|\   ____\|\  \     |\  \|\   __  \|\   __  \|\   _ \  _   \|\  \|\  \|\   __  \|\   __  \|\  \|\  \
\ \  \___|\ \  \    \ \  \ \  \|\  \ \  \|\  \ \  \\\__\ \  \ \  \\\  \ \  \|\  \ \  \|\  \ \  \/  /|_
 \ \_____  \ \  \  __\ \  \ \   __  \ \   _  _\ \  \\|__| \  \ \   __  \ \  \\\  \ \  \\\  \ \   ___  \
  \|____|\  \ \  \|\__\_\  \ \  \ \  \ \  \\  \\ \  \    \ \  \ \  \ \  \ \  \\\  \ \  \\\  \ \  \\ \  \
    ____\_\  \ \____________\ \__\ \__\ \__\\ _\\ \__\    \ \__\ \__\ \__\ \_______\ \_______\ \__\\ \__\
   |\_________\|____________|\|__|\|__|\|__|\|__|\|__|     \|__|\|__|\|__|\|_______|\|_______|\|__| \|__|
   \|_________|

        Zero-cost webhook infrastructure for AI agents

  ╔════════════════════════════════════════════════════════════════╗
  ║     Ephemeral Webhook Inboxes for Autonomous Agents            ║
  ║     No servers. No costs. Just webhooks that work.             ║
  ╚════════════════════════════════════════════════════════════════╝

  💡 WHAT IS SWARMHOOK?
  ────────────────────────
  SwarmHook gives AI agents instant webhook URLs without servers, config, or costs.

  🤖 If you are an AI agent, read the <a href="/skill.md">skill.md</a> file for full documentation!

  Perfect for:
  • Receiving marketplace notifications (SwarmMarket, eBay, etc.)
  • Monitoring payment events (Stripe, PayPal, crypto)
  • Tracking GitHub webhooks, CI/CD pipelines
  • Any async event your agent needs to respond to

  🎯 THE PROBLEM:
  ────────────────
  Your AI agent needs webhooks, but you don't want to:
  ✗ Spin up a server just to receive HTTP POSTs
  ✗ Configure nginx, SSL certs, and DNS
  ✗ Pay $5-20/month for a VPS
  ✗ Deal with ngrok tunnels that expire

  ✓ THE SOLUTION:
  ────────────────
  1. Create an ephemeral inbox (takes 2 seconds)
  2. Get a public webhook URL: https://swarmhook.com/in/inbox_abc123
  3. Register that URL with any service (SwarmMarket, Stripe, GitHub, etc.)
  4. Poll for events or stream them in real-time
  5. Inbox auto-deletes after 24-48 hours

  No servers. No config. Just works.

  💡 HOW IT WORKS:
  ────────────────
  1. You create an ephemeral inbox (24-48hr lifetime)
  2. You get a public webhook URL: https://swarmhook.com/in/inbox_abc123
  3. Register that URL with external services (SwarmMarket, Stripe, etc.)
  4. Poll for events or stream them in real-time
  5. Inbox auto-deletes when expired

  🚀 QUICK START:
  ────────────────
  # 1. Register as an agent
  curl -X POST https://swarmhook.com/api/v1/agents/register \\
    -H "Content-Type: application/json" \\
    -d '{"name": "MyAgent"}'
  # Returns: {"agent_id": "...", "api_key": "swh_..."}

  # 2. Create webhook inbox
  curl -X POST https://swarmhook.com/api/v1/inboxes \\
    -H "X-API-Key: swh_your_key"
  # Returns: {"inbox_id": "inbox_abc123", "webhook_url": "https://swarmhook.com/in/inbox_abc123"}

  # 3. Poll for events
  curl https://swarmhook.com/api/v1/inboxes/inbox_abc123/events \\
    -H "X-API-Key: swh_your_key"

  Done! Now register that webhook_url with any service.

  🔒 SECURITY:
  ────────────────
  ✓ API keys required for agent & inbox management
  ✓ Webhook URLs are unguessable (cryptographic random IDs)
  ✓ Rate limiting on all endpoints
  ✓ Request validation & sanitization
  ✓ No PII stored (just webhook payloads)
  ✓ Auto-expiring inboxes (ephemeral by design)

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

  📖 SKILL FILES (for AI agents):
  ├── <a href="/skill.md">/skill.md</a>        Full documentation & usage guide
  └── <a href="/skill.json">/skill.json</a>      Machine-readable metadata

  🔗 API ENDPOINTS:
  ├── <a href="/health">/health</a>               Health check
  │
  ├── /api/v1/agents        Agent management
  │   ├── POST /register         Register new agent
  │   └── GET  /me               Your profile & stats
  │
  ├── <a href="/api/v1/inboxes">/api/v1/inboxes</a>       Inbox management
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

  📚 DOCUMENTATION:
  ────────────────
  • Quick Start:   https://github.com/digi604/swarmhook#readme
  • Security:      https://github.com/digi604/swarmhook/blob/main/SECURITY.md
  • Deploy Guide:  https://github.com/digi604/swarmhook/blob/main/DEPLOYMENT.md

  Built with ❤️  for the autonomous agent economy
  From the builders of swarmmarket.io`

  return c.text(landingPage, 200, {
    'Content-Type': 'text/plain; charset=utf-8'
  })
})

// Skill files
app.get('/skill.md', (c) => {
  try {
    const skillMd = readFileSync(join(process.cwd(), 'skill.md'), 'utf-8')
    return c.text(skillMd, 200, {
      'Content-Type': 'text/markdown; charset=utf-8'
    })
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

  return c.json(metadata)
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
