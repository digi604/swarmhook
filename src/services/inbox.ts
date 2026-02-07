import { nanoid } from 'nanoid'
import redis from './redis'
import type { Inbox, WebhookEvent, CreateInboxRequest } from '../types'

const DEFAULT_TTL_HOURS = parseInt(process.env.DEFAULT_TTL_HOURS || '24')
const MAX_EVENTS_PER_INBOX = parseInt(process.env.MAX_EVENTS_PER_INBOX || '100')

export class InboxService {
  /**
   * Create a new ephemeral inbox
   */
  static async createInbox(agentId: string, req: CreateInboxRequest): Promise<Inbox> {
    const inboxId = `inbox_${nanoid(16)}`
    const apiKey = `iwh_${nanoid(32)}`
    const ttlHours = req.ttl_hours || DEFAULT_TTL_HOURS
    const ttlSeconds = ttlHours * 3600

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000'

    const inbox: Inbox = {
      id: inboxId,
      agent_id: agentId,
      webhook_url: `${baseUrl}/in/${inboxId}`,
      polling_url: `${baseUrl}/api/v1/inboxes/${inboxId}/events`,
      api_key: apiKey,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
      ttl_hours: ttlHours,
      metadata: req.metadata,
    }

    // Store inbox data with TTL
    await redis.setex(
      `inbox:${inboxId}`,
      ttlSeconds,
      JSON.stringify(inbox)
    )

    // Store API key mapping
    await redis.setex(
      `apikey:${apiKey}`,
      ttlSeconds,
      inboxId
    )

    return inbox
  }

  /**
   * Get inbox by ID
   */
  static async getInbox(inboxId: string): Promise<Inbox | null> {
    const data = await redis.get(`inbox:${inboxId}`)
    if (!data) return null
    return JSON.parse(data)
  }

  /**
   * Verify API key and return inbox ID
   */
  static async verifyApiKey(apiKey: string): Promise<string | null> {
    return await redis.get(`apikey:${apiKey}`)
  }

  /**
   * Store webhook event
   */
  static async storeEvent(
    inboxId: string,
    sourceIp: string,
    headers: Record<string, string>,
    body: any
  ): Promise<WebhookEvent> {
    const inbox = await this.getInbox(inboxId)
    if (!inbox) {
      throw new Error('Inbox not found or expired')
    }

    const eventId = `evt_${nanoid(12)}`
    const event: WebhookEvent = {
      id: eventId,
      inbox_id: inboxId,
      received_at: new Date().toISOString(),
      source_ip: sourceIp,
      headers,
      body,
      read: false,
    }

    // Add event to sorted set (sorted by timestamp)
    const score = Date.now()
    await redis.zadd(
      `events:${inboxId}`,
      score,
      JSON.stringify(event)
    )

    // Set TTL on events set to match inbox TTL
    const ttl = await redis.ttl(`inbox:${inboxId}`)
    if (ttl > 0) {
      await redis.expire(`events:${inboxId}`, ttl)
    }

    // Trim to max events per inbox (keep most recent)
    await redis.zremrangebyrank(
      `events:${inboxId}`,
      0,
      -(MAX_EVENTS_PER_INBOX + 1)
    )

    // Increment unread counter
    await redis.incr(`unread:${inboxId}`)
    if (ttl > 0) {
      await redis.expire(`unread:${inboxId}`, ttl)
    }

    // Publish to pub/sub for long polling
    await redis.publish(`inbox:${inboxId}:events`, JSON.stringify(event))

    return event
  }

  /**
   * Get events for an inbox
   */
  static async getEvents(
    inboxId: string,
    options: {
      unread?: boolean
      since?: string
      limit?: number
      markRead?: boolean
    } = {}
  ): Promise<WebhookEvent[]> {
    const limit = options.limit || 50
    const min = options.since ? new Date(options.since).getTime() : '-inf'
    const max = '+inf'

    // Get events from sorted set
    const eventStrings = await redis.zrangebyscore(
      `events:${inboxId}`,
      min,
      max,
      'LIMIT', 0, limit
    )

    const events: WebhookEvent[] = eventStrings.map(str => JSON.parse(str))

    // Filter unread if requested
    let filteredEvents = events
    if (options.unread) {
      filteredEvents = events.filter(e => !e.read)
    }

    // Mark as read if requested
    if (options.markRead && filteredEvents.length > 0) {
      // Update events in sorted set
      const pipeline = redis.pipeline()
      for (const event of filteredEvents) {
        event.read = true
        const score = new Date(event.received_at).getTime()
        pipeline.zadd(`events:${inboxId}`, score, JSON.stringify(event))
      }
      await pipeline.exec()

      // Reset unread counter
      await redis.set(`unread:${inboxId}`, 0)
    }

    return filteredEvents
  }

  /**
   * Get event counts
   */
  static async getEventCounts(inboxId: string): Promise<{
    total: number
    unread: number
  }> {
    const total = await redis.zcard(`events:${inboxId}`)
    const unreadStr = await redis.get(`unread:${inboxId}`)
    const unread = unreadStr ? parseInt(unreadStr) : 0

    return { total, unread }
  }

  /**
   * Wait for new events (long polling)
   */
  static async waitForEvents(
    inboxId: string,
    timeoutSeconds: number
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const subscriber = redis.duplicate()
      const channel = `inbox:${inboxId}:events`
      let timeout: Timer

      subscriber.subscribe(channel, (err) => {
        if (err) {
          resolve(false)
          return
        }

        // Set timeout
        timeout = setTimeout(() => {
          subscriber.unsubscribe(channel)
          subscriber.quit()
          resolve(false)
        }, timeoutSeconds * 1000)
      })

      subscriber.on('message', (ch, message) => {
        if (ch === channel) {
          clearTimeout(timeout)
          subscriber.unsubscribe(channel)
          subscriber.quit()
          resolve(true)
        }
      })
    })
  }
}
