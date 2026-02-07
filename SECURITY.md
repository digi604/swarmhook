# SwarmHook Security Model

## Authentication Flow

SwarmHook uses a two-tier API key system:

### 1. Agent Registration (One-time)
```bash
POST /api/v1/agents/register
{
  "name": "My AI Agent",
  "email": "agent@example.com"
}

Response:
{
  "id": "agent_abc123",
  "api_key": "swh_xyz789...",  # Store this securely!
  "tier": "free",
  "message": "Agent registered successfully..."
}
```

**Agent API Key (`swh_*`):**
- Used to create inboxes
- Permanent (doesn't expire)
- Tracks usage & enforces limits
- One per agent

### 2. Create Inbox (Per webhook source)
```bash
POST /api/v1/inboxes
X-API-Key: swh_xyz789...  # Your agent API key

{
  "ttl_hours": 24
}

Response:
{
  "id": "inbox_def456",
  "webhook_url": "https://swarmhook.com/in/inbox_def456",
  "polling_url": "https://swarmhook.com/api/v1/inboxes/inbox_def456/events",
  "api_key": "iwh_ghi789...",  # Inbox-specific API key
  "expires_at": "2026-02-08T12:00:00Z"
}
```

**Inbox API Key (`iwh_*`):**
- Used to poll events for specific inbox
- Temporary (expires with inbox)
- Scoped to single inbox
- Many per agent

## Complete Usage Flow

```typescript
// 1. Register agent (once)
const registration = await fetch('https://swarmhook.com/api/v1/agents/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'digi',
    email: 'digi@example.com'
  })
}).then(r => r.json())

const AGENT_API_KEY = registration.api_key // Store securely!

// 2. Create inbox (when needed)
const inbox = await fetch('https://swarmhook.com/api/v1/inboxes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': AGENT_API_KEY  // Use agent key
  },
  body: JSON.stringify({ ttl_hours: 24 })
}).then(r => r.json())

// 3. Register inbox URL with external service
await swarmmarket.registerWebhook({
  url: inbox.webhook_url,  // Public webhook URL
  events: ['transaction.*']
})

// 4. Poll for events
while (true) {
  const { events } = await fetch(
    `${inbox.polling_url}?wait=60&unread=true&mark_read=true`,
    {
      headers: { 'X-API-Key': inbox.api_key }  // Use inbox key
    }
  ).then(r => r.json())

  for (const event of events) {
    handleWebhook(event)
  }
}
```

## Rate Limits & Quotas

### Free Tier
- **Max concurrent inboxes:** 5
- **Inbox TTL:** Up to 48 hours
- **Events per inbox:** 100
- **API rate limit:** 60 requests/minute per inbox

### Premium Tier (Future)
- **Max concurrent inboxes:** Unlimited
- **Inbox TTL:** Up to 7 days
- **Events per inbox:** 10,000
- **API rate limit:** 600 requests/minute

## Security Best Practices

### For Agents

**DO:**
- ✅ Store agent API key securely (environment variables, encrypted storage)
- ✅ Use HTTPS for all API calls
- ✅ Regenerate inbox API keys regularly (create new inbox)
- ✅ Delete inboxes when no longer needed

**DON'T:**
- ❌ Commit API keys to version control
- ❌ Share agent API key between multiple agents
- ❌ Log API keys in plain text
- ❌ Send API keys over unencrypted connections

### For SwarmHook

**Implemented:**
- ✅ TLS/HTTPS only (Railway enforced)
- ✅ API keys use cryptographically secure random generation (nanoid)
- ✅ Rate limiting per agent/inbox
- ✅ Automatic cleanup with TTL
- ✅ No persistent logging of webhook bodies
- ✅ Email validation on registration

**Roadmap:**
- 🔄 Webhook signature verification (HMAC)
- 🔄 IP allow lists
- 🔄 Audit logging
- 🔄 API key rotation
- 🔄 Suspicious activity detection

## API Key Format

**Agent API Key:**
- Prefix: `swh_` (SwarmHook)
- Length: 32 random characters
- Example: `swh_k3jf9d2k1p9s8h4g2m5n7q8w1e3r5t6y`

**Inbox API Key:**
- Prefix: `iwh_` (Inbox WebHook)
- Length: 32 random characters
- Example: `iwh_9h2j4k8l3m6n1p5q7r2s4t8u3v9w1x5`

## Checking Your Account

```bash
# Get your profile & stats
curl -H "X-API-Key: swh_your_key" \
  https://swarmhook.com/api/v1/agents/me

Response:
{
  "id": "agent_abc123",
  "name": "digi",
  "email": "digi@example.com",
  "tier": "free",
  "stats": {
    "total_inboxes_created": 42,
    "active_inboxes": 3,
    "total_events_received": 1337
  },
  "limits": {
    "max_concurrent_inboxes": 5
  }
}
```

## Error Codes

| Code | Error | Meaning |
|------|-------|---------|
| 401 | Missing API key | Include X-API-Key header |
| 401 | Invalid API key | API key not found or expired |
| 403 | Free tier limit | Max concurrent inboxes reached |
| 409 | Email already registered | Use different email |
| 429 | Rate limit exceeded | Slow down requests |

## Abuse Prevention

SwarmHook monitors for:
- Excessive inbox creation
- Abnormal webhook volumes
- Suspicious polling patterns
- API key sharing

Violators may be rate-limited or blocked.

## Data Retention

- **Agent accounts:** Permanent (until deleted)
- **Inboxes:** 24-48 hours (configurable)
- **Events:** Same as inbox TTL
- **Logs:** 7 days (no webhook bodies stored)

## Reporting Security Issues

Email: security@swarmmarket.io

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact

We aim to respond within 24 hours.
