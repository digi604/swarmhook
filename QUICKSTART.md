# SwarmHook - Quick Start Guide

## Local Development Setup

### Prerequisites
- Bun installed (`curl -fsSL https://bun.sh/install | bash`)
- Redis running locally (system service)
- Make installed

### Start the Backend

```bash
cd /workspace/extra/workspace/swarmhook

# Install dependencies
make install

# Start backend (uses local Redis)
make backend
```

The server will start on `http://localhost:3000`

**Note:** Make sure Redis is running on `localhost:6379`. Check with:
```bash
redis-cli ping
# Should return: PONG
```

### Test It Works

**In another terminal:**

```bash
# Check health
curl http://localhost:3000/health

# View landing page
curl http://localhost:3000/

# Download skill file
curl http://localhost:3000/skill.md

# Register an agent
curl -X POST http://localhost:3000/api/v1/agents/register \
  -H "Content-Type: application/json" \
  -d '{"name":"TestAgent"}'
```

### Full Test Flow

```bash
# 1. Register agent
AGENT=$(curl -s -X POST http://localhost:3000/api/v1/agents/register \
  -H "Content-Type: application/json" \
  -d '{"name":"TestAgent"}')

echo $AGENT | jq .

# Extract API key
AGENT_KEY=$(echo $AGENT | jq -r '.api_key')

# 2. Create inbox
INBOX=$(curl -s -X POST http://localhost:3000/api/v1/inboxes \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $AGENT_KEY" \
  -d '{"ttl_hours":1}')

echo $INBOX | jq .

# Extract inbox details
WEBHOOK_URL=$(echo $INBOX | jq -r '.webhook_url')
INBOX_KEY=$(echo $INBOX | jq -r '.api_key')
INBOX_ID=$(echo $INBOX | jq -r '.id')

# 3. Send a test webhook
curl -X POST $WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{"event":"test","message":"Hello from webhook!"}'

# 4. Poll for events
curl "http://localhost:3000/api/v1/inboxes/$INBOX_ID/events?unread=true" \
  -H "X-API-Key: $INBOX_KEY" | jq .
```

### Available Commands

```bash
make help          # Show all commands
make install       # Install dependencies
make backend       # Start backend server
make dev           # Alias for backend
make test          # Run tests
make clean         # Clean up artifacts
make check         # Health check
make landing       # View landing page
```

## Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add Redis
railway add redis

# Set environment variables
railway variables set BASE_URL=https://swarmhook.com

# Deploy
git add .
git commit -m "Deploy SwarmHook"
git push

# Or use Railway CLI
railway up
```

## Environment Variables

```bash
REDIS_URL=redis://localhost:6379
PORT=3000
BASE_URL=http://localhost:3000
NODE_ENV=development
MAX_EVENTS_PER_INBOX=100
DEFAULT_TTL_HOURS=24
RATE_LIMIT_PER_MINUTE=60
```

## Troubleshooting

**Redis connection error:**
```bash
# Check if Redis is running
redis-cli ping

# Start Redis (macOS with Homebrew)
brew services start redis

# Start Redis (Linux systemd)
sudo systemctl start redis
```

**Port 3000 already in use:**
```bash
# Change port
PORT=3001 make backend
```

**Dependencies not installing:**
```bash
# Update Bun
curl -fsSL https://bun.sh/install | bash
bun upgrade
```

## Next Steps

1. ✅ Server running locally
2. 📖 Read `/skill.md` for complete API documentation
3. 🔧 Test with real webhook providers (Stripe, SwarmMarket)
4. 🚀 Deploy to Railway when ready
5. 🌐 Point swarmhook.com to your Railway app

Enjoy building with SwarmHook! 🪝
