import { Hono } from 'hono'
import { AgentService } from '../services/agent'
import type { RegisterAgentRequest } from '../types'

const app = new Hono()

/**
 * Register a new agent
 * POST /api/v1/agents/register
 */
app.post('/register', async (c) => {
  const body = await c.req.json<RegisterAgentRequest>()

  // Validate required fields
  if (!body.name) {
    return c.json({ error: 'Name is required' }, 400)
  }

  // Generate slug and check if already exists
  const slug = body.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)

  const existing = await AgentService.getAgentBySlug(slug)
  if (existing) {
    return c.json({ error: 'Agent name already taken. Please choose a different name.' }, 409)
  }

  try {
    const agent = await AgentService.registerAgent(body)

    return c.json({
      id: agent.id,
      slug: agent.slug,
      name: agent.name,
      api_key: agent.api_key,
      tier: agent.tier,
      created_at: agent.created_at,
      message: 'Agent registered successfully. Store your API key securely - it won\'t be shown again.'
    }, 201)
  } catch (error) {
    console.error('Error registering agent:', error)
    return c.json({ error: 'Failed to register agent' }, 500)
  }
})

/**
 * Get agent profile (requires API key)
 * GET /api/v1/agents/me
 */
app.get('/me', async (c) => {
  const apiKey = c.req.header('X-API-Key')

  if (!apiKey) {
    return c.json({ error: 'Missing API key' }, 401)
  }

  const agent = await AgentService.getAgentByApiKey(apiKey)

  if (!agent) {
    return c.json({ error: 'Invalid API key' }, 401)
  }

  // Get stats
  const stats = await AgentService.getAgentStats(agent.id)

  return c.json({
    id: agent.id,
    slug: agent.slug,
    name: agent.name,
    description: agent.description,
    tier: agent.tier,
    created_at: agent.created_at,
    stats: {
      total_inboxes_created: agent.inbox_count,
      active_inboxes: stats.active_inboxes,
      total_events_received: agent.total_events_received,
    },
    limits: {
      max_concurrent_inboxes: agent.tier === 'free' ? 5 : 'unlimited',
    }
  })
})

export default app
