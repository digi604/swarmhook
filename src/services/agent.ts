import { nanoid } from 'nanoid'
import redis from './redis'
import type { Agent, RegisterAgentRequest } from '../types'

export class AgentService {
  /**
   * Register a new agent
   */
  static async registerAgent(req: RegisterAgentRequest): Promise<Agent> {
    const agentId = `agent_${nanoid(16)}`
    const apiKey = `swh_${nanoid(32)}`

    // Generate slug from name
    const slug = req.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50)

    const agent: Agent = {
      id: agentId,
      slug: slug,
      name: req.name,
      api_key: apiKey,
      created_at: new Date().toISOString(),
      inbox_count: 0,
      total_events_received: 0,
      tier: 'free',
      is_active: true,
      description: req.description,
    }

    // Store agent data (no expiration for agent accounts)
    await redis.set(`agent:${agentId}`, JSON.stringify(agent))

    // Store API key mapping
    await redis.set(`agent_apikey:${apiKey}`, agentId)

    // Store slug mapping (for checking duplicates and lookups)
    await redis.set(`agent_slug:${slug}`, agentId)

    return agent
  }

  /**
   * Get agent by ID
   */
  static async getAgent(agentId: string): Promise<Agent | null> {
    const data = await redis.get(`agent:${agentId}`)
    if (!data) return null
    return JSON.parse(data)
  }

  /**
   * Get agent by API key
   */
  static async getAgentByApiKey(apiKey: string): Promise<Agent | null> {
    const agentId = await redis.get(`agent_apikey:${apiKey}`)
    if (!agentId) return null
    return this.getAgent(agentId)
  }

  /**
   * Get agent by slug
   */
  static async getAgentBySlug(slug: string): Promise<Agent | null> {
    const agentId = await redis.get(`agent_slug:${slug}`)
    if (!agentId) return null
    return this.getAgent(agentId)
  }

  /**
   * Verify agent API key
   */
  static async verifyApiKey(apiKey: string): Promise<string | null> {
    return await redis.get(`agent_apikey:${apiKey}`)
  }

  /**
   * Increment inbox count
   */
  static async incrementInboxCount(agentId: string): Promise<void> {
    const agent = await this.getAgent(agentId)
    if (!agent) return

    agent.inbox_count++
    await redis.set(`agent:${agentId}`, JSON.stringify(agent))
  }

  /**
   * Increment event count
   */
  static async incrementEventCount(agentId: string): Promise<void> {
    const agent = await this.getAgent(agentId)
    if (!agent) return

    agent.total_events_received++
    await redis.set(`agent:${agentId}`, JSON.stringify(agent))
  }

  /**
   * Get agent stats
   */
  static async getAgentStats(agentId: string): Promise<{
    inbox_count: number
    total_events_received: number
    active_inboxes: number
  }> {
    const agent = await this.getAgent(agentId)
    if (!agent) {
      return { inbox_count: 0, total_events_received: 0, active_inboxes: 0 }
    }

    // Count active inboxes (non-expired)
    const inboxKeys = await redis.keys(`inbox:*`)
    let activeInboxes = 0

    for (const key of inboxKeys) {
      const data = await redis.get(key)
      if (data) {
        const inbox = JSON.parse(data)
        if (inbox.agent_id === agentId) {
          activeInboxes++
        }
      }
    }

    return {
      inbox_count: agent.inbox_count,
      total_events_received: agent.total_events_received,
      active_inboxes: activeInboxes,
    }
  }

  /**
   * Check if agent has reached free tier limits
   */
  static async checkLimits(agentId: string): Promise<{
    canCreateInbox: boolean
    reason?: string
  }> {
    const agent = await this.getAgent(agentId)
    if (!agent) {
      return { canCreateInbox: false, reason: 'Agent not found' }
    }

    if (!agent.is_active) {
      return { canCreateInbox: false, reason: 'Agent is inactive' }
    }

    // Free tier limits
    if (agent.tier === 'free') {
      const stats = await this.getAgentStats(agentId)

      // Max 5 concurrent inboxes for free tier
      if (stats.active_inboxes >= 5) {
        return {
          canCreateInbox: false,
          reason: 'Free tier limit: Maximum 5 concurrent inboxes. Upgrade to premium for unlimited.'
        }
      }
    }

    return { canCreateInbox: true }
  }
}
