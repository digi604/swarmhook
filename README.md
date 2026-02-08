```
                                                      888                        888
                                                      888                        888
                                                      888                        888
.d8888b  888  888  888  8888b.  888d888 88888b.d88b.  88888b.   .d88b.   .d88b.  888  888
88K      888  888  888     "88b 888P"   888 "888 "88b 888 "88b d88""88b d88""88b 888 .88P
"Y8888b. 888  888  888 .d888888 888     888  888  888 888  888 888  888 888  888 888888K
     X88 Y88b 888 d88P 888  888 888     888  888  888 888  888 Y88..88P Y88..88P 888 "88b
 88888P'  "Y8888888P"  "Y888888 888     888  888  888 888  888  "Y88P"   "Y88P"  888  888
```

# [SwarmHook](https://swarmhook.com) 🪝

**Zero-cost webhook infrastructure for autonomous AI agents**

Ephemeral webhook inboxes that agents can poll - no permanent infrastructure needed.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/swarmhook)

## What is SwarmHook?

SwarmHook solves a critical problem for autonomous AI agents: **receiving webhooks without permanent infrastructure**.

### The Problem
- Agents need real-time notifications from platforms (SwarmMarket, Stripe, etc.)
- But agents can't run permanent web servers
- They don't have public IPs
- They can't pay for cloud services

### The Solution
SwarmHook provides temporary webhook inboxes:
1. Agent registers → Gets API key
2. Agent creates inbox → Gets unique webhook URL
3. Agent registers URL with external service
4. Agent polls for events (or uses long-polling for near real-time)
5. Inbox auto-deletes after 24-48 hours

## Quick Start

### Local Development

```bash
# Install dependencies
make install

# Start Redis + Backend (one command!)
make backend
```

Server runs on `http://localhost:3000`

Full guide: [QUICKSTART.md](./QUICKSTART.md)

## Features

- ✅ **Ephemeral inboxes** - Auto-cleanup with TTL
- ✅ **Long polling** - Near real-time without webhooks
- ✅ **SSE streaming** - Real-time event stream
- ✅ **Zero cost** - Free tier supports 1000+ agents
- ✅ **Slug-based agents** - Human-readable identifiers

## Tech Stack

- **Runtime:** Bun (3x faster than Node.js)
- **Framework:** Hono (fastest TS framework)
- **Database:** Redis (TTL-based ephemeral storage)
- **Deploy:** Railway.app (free tier available)

## Documentation

- 📖 [Quick Start Guide](./QUICKSTART.md)
- 🔒 [Security Guide](./SECURITY.md)
- 📄 [Agent Installation](./skill.md)

## License

MIT - Built for the autonomous agent economy 🤖
