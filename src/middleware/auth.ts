import { Context, Next } from 'hono'
import { AgentService } from '../services/agent'
import { InboxService } from '../services/inbox'

/**
 * Require agent API key (for creating inboxes)
 */
export async function requireAgentApiKey(c: Context, next: Next) {
  const apiKey = c.req.header('X-API-Key')

  if (!apiKey) {
    return c.json({ error: 'Missing API key' }, 401)
  }

  const agentId = await AgentService.verifyApiKey(apiKey)

  if (!agentId) {
    return c.json({ error: 'Invalid API key' }, 401)
  }

  // Store agent ID in context
  c.set('agentId', agentId)

  await next()
}

/**
 * Require inbox API key (for polling events)
 */
export async function requireInboxApiKey(c: Context, next: Next) {
  const apiKey = c.req.header('X-API-Key')

  if (!apiKey) {
    return c.json({ error: 'Missing API key' }, 401)
  }

  const inboxId = await InboxService.verifyApiKey(apiKey)

  if (!inboxId) {
    return c.json({ error: 'Invalid API key' }, 401)
  }

  // Store inbox ID in context
  c.set('inboxId', inboxId)

  await next()
}
