import { Hono } from 'hono'
import { InboxService } from '../services/inbox'
import { logSecurity } from '../middleware/security'

const app = new Hono()

// Max payload size: 1MB
const MAX_PAYLOAD_SIZE = 1024 * 1024

/**
 * Receive webhook
 * POST /in/:inbox_id
 */
app.post('/:inbox_id', async (c) => {
  const inboxId = c.req.param('inbox_id')

  // Get source IP
  const sourceIp = c.req.header('cf-connecting-ip') ||
                   c.req.header('x-forwarded-for') ||
                   c.req.header('x-real-ip') ||
                   'unknown'

  // Get all headers
  const headers: Record<string, string> = {}
  c.req.raw.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value
  })

  // Get body (support both JSON and form data)
  let body: any
  const contentType = c.req.header('content-type') || ''

  try {
    if (contentType.includes('application/json')) {
      body = await c.req.json()

      // Validate payload size
      const bodyStr = JSON.stringify(body)
      if (bodyStr.length > MAX_PAYLOAD_SIZE) {
        logSecurity('Oversized webhook payload rejected', {
          inbox_id: inboxId,
          ip: sourceIp,
          size: bodyStr.length
        })
        return c.json({ error: 'Payload too large (max 1MB)' }, 413)
      }
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      body = await c.req.parseBody()
    } else {
      const textBody = await c.req.text()
      if (textBody.length > MAX_PAYLOAD_SIZE) {
        logSecurity('Oversized webhook payload rejected', {
          inbox_id: inboxId,
          ip: sourceIp,
          size: textBody.length
        })
        return c.json({ error: 'Payload too large (max 1MB)' }, 413)
      }
      body = textBody
    }
  } catch (error) {
    logSecurity('Invalid webhook payload', {
      inbox_id: inboxId,
      ip: sourceIp,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return c.json({ error: 'Invalid request body' }, 400)
  }

  // Store the event
  try {
    const event = await InboxService.storeEvent(inboxId, sourceIp, headers, body)

    // Log successful webhook receipt
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      action: 'webhook_received',
      inbox_id: inboxId,
      event_id: event.id,
      ip: sourceIp,
      content_type: contentType
    }))

    return c.json({
      success: true,
      event_id: event.id,
      received_at: event.received_at
    }, 200)
  } catch (error) {
    logSecurity('Error storing webhook event', {
      inbox_id: inboxId,
      ip: sourceIp,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    if (error instanceof Error && error.message.includes('not found')) {
      return c.json({ error: 'Inbox not found or expired' }, 404)
    }

    return c.json({ error: 'Failed to store webhook' }, 500)
  }
})

/**
 * Health check for webhook endpoint
 * GET /in/:inbox_id
 */
app.get('/:inbox_id', async (c) => {
  const inboxId = c.req.param('inbox_id')
  const inbox = await InboxService.getInbox(inboxId)

  if (!inbox) {
    return c.json({ error: 'Inbox not found or expired' }, 404)
  }

  return c.json({
    inbox_id: inboxId,
    status: 'active',
    expires_at: inbox.expires_at
  })
})

export default app
