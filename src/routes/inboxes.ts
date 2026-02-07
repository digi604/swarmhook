import { Hono } from 'hono'
import { InboxService } from '../services/inbox'
import { AgentService } from '../services/agent'
import { requireAgentApiKey, requireInboxApiKey } from '../middleware/auth'
import { rateLimit } from '../middleware/ratelimit'
import type { CreateInboxRequest } from '../types'

const app = new Hono()

/**
 * Create a new inbox
 * POST /api/v1/inboxes
 * Requires: Agent API key
 */
app.post('/', requireAgentApiKey, rateLimit, async (c) => {
  const agentId = c.get('agentId')
  const body = await c.req.json<CreateInboxRequest>()

  try {
    // Check agent limits
    const limitCheck = await AgentService.checkLimits(agentId)
    if (!limitCheck.canCreateInbox) {
      return c.json({ error: limitCheck.reason }, 403)
    }

    // Create inbox
    const inbox = await InboxService.createInbox(agentId, body)

    // Increment agent's inbox count
    await AgentService.incrementInboxCount(agentId)

    return c.json(inbox, 201)
  } catch (error) {
    console.error('Error creating inbox:', error)
    return c.json({ error: 'Failed to create inbox' }, 500)
  }
})

/**
 * Get inbox details
 * GET /api/v1/inboxes/:id
 * Requires: Inbox API key
 */
app.get('/:id', requireInboxApiKey, rateLimit, async (c) => {
  const inboxId = c.req.param('id')
  const authInboxId = c.get('inboxId')

  // Verify inbox ID matches authenticated inbox
  if (inboxId !== authInboxId) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  const inbox = await InboxService.getInbox(inboxId)

  if (!inbox) {
    return c.json({ error: 'Inbox not found or expired' }, 404)
  }

  // Don't expose API key in GET response
  const { api_key, ...safeInbox } = inbox
  return c.json(safeInbox)
})

export default app
