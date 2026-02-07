export interface Agent {
  id: string
  slug: string
  name: string
  api_key: string
  created_at: string
  inbox_count: number
  total_events_received: number
  tier: 'free' | 'premium'
  is_active: boolean
  description?: string
}

export interface RegisterAgentRequest {
  name: string
  description?: string
}

export interface Inbox {
  id: string
  agent_id: string
  webhook_url: string
  polling_url: string
  api_key: string
  created_at: string
  expires_at: string
  ttl_hours: number
  metadata?: Record<string, any>
}

export interface WebhookEvent {
  id: string
  inbox_id: string
  received_at: string
  source_ip: string
  headers: Record<string, string>
  body: any
  read: boolean
}

export interface EventListResponse {
  events: WebhookEvent[]
  unread_count: number
  total_count: number
}

export interface CreateInboxRequest {
  ttl_hours?: number
  metadata?: Record<string, any>
}

export interface PollEventsQuery {
  unread?: string
  since?: string
  limit?: string
  mark_read?: string
  wait?: string
}
