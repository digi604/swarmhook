import { Hono } from 'hono'
import { InboxService } from '../services/inbox'
import { requireInboxApiKey } from '../middleware/auth'
import { rateLimit } from '../middleware/ratelimit'
import type { PollEventsQuery, EventListResponse } from '../types'

const app = new Hono()

/**
 * Poll for events
 * GET /api/v1/inboxes/:id/events
 */
app.get('/:id/events', requireInboxApiKey, rateLimit, async (c) => {
  const inboxId = c.req.param('id')
  const authInboxId = c.get('inboxId')

  // Verify inbox ID matches authenticated inbox
  if (inboxId !== authInboxId) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  const query = c.req.query() as PollEventsQuery

  const options = {
    unread: query.unread === 'true',
    since: query.since,
    limit: query.limit ? parseInt(query.limit) : 50,
    markRead: query.mark_read === 'true',
  }

  const waitSeconds = query.wait ? Math.min(parseInt(query.wait), 60) : 0

  try {
    // If long polling requested, wait for new events
    if (waitSeconds > 0) {
      const counts = await InboxService.getEventCounts(inboxId)

      // If no unread events, wait for new ones
      if (counts.unread === 0) {
        await InboxService.waitForEvents(inboxId, waitSeconds)
      }
    }

    // Get events
    const events = await InboxService.getEvents(inboxId, options)
    const counts = await InboxService.getEventCounts(inboxId)

    const response: EventListResponse = {
      events,
      unread_count: counts.unread,
      total_count: counts.total,
    }

    return c.json(response)
  } catch (error) {
    console.error('Error polling events:', error)
    return c.json({ error: 'Failed to retrieve events' }, 500)
  }
})

/**
 * Server-Sent Events stream
 * GET /api/v1/inboxes/:id/stream
 */
app.get('/:id/stream', requireInboxApiKey, async (c) => {
  const inboxId = c.req.param('id')
  const authInboxId = c.get('inboxId')

  if (inboxId !== authInboxId) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  // Set up SSE headers
  c.header('Content-Type', 'text/event-stream')
  c.header('Cache-Control', 'no-cache')
  c.header('Connection', 'keep-alive')

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      // Send initial events
      const events = await InboxService.getEvents(inboxId, { limit: 10 })
      for (const event of events) {
        const data = `event: webhook\ndata: ${JSON.stringify(event)}\n\n`
        controller.enqueue(encoder.encode(data))
      }

      // Keep-alive interval
      const keepAlive = setInterval(() => {
        const data = `event: keepalive\ndata: {"timestamp":"${new Date().toISOString()}"}\n\n`
        controller.enqueue(encoder.encode(data))
      }, 30000)

      // Subscribe to new events
      const redis = (await import('../services/redis')).default
      const subscriber = redis.duplicate()
      const channel = `inbox:${inboxId}:events`

      await subscriber.subscribe(channel)

      subscriber.on('message', (ch, message) => {
        if (ch === channel) {
          const data = `event: webhook\ndata: ${message}\n\n`
          controller.enqueue(encoder.encode(data))
        }
      })

      // Cleanup on close
      const cleanup = () => {
        clearInterval(keepAlive)
        subscriber.unsubscribe(channel)
        subscriber.quit()
        controller.close()
      }

      // Handle client disconnect
      c.req.raw.signal.addEventListener('abort', cleanup)

      // Auto-cleanup after 5 minutes
      setTimeout(cleanup, 5 * 60 * 1000)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
})

export default app
