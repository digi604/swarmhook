.PHONY: help install backend redis dev test clean

help: ## Show this help message
	@echo "SwarmHook - Development Commands"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	bun install

redis: ## Start Redis in Docker
	@echo "Starting Redis..."
	@docker ps -q -f name=swarmhook-redis > /dev/null 2>&1 && echo "Redis already running" || \
	docker run -d --name swarmhook-redis -p 6379:6379 redis:alpine
	@echo "Redis running on localhost:6379"

backend: redis ## Start backend server
	@echo "Starting SwarmHook backend..."
	@export REDIS_URL=redis://localhost:6379 && \
	export PORT=3000 && \
	export BASE_URL=http://localhost:3000 && \
	export NODE_ENV=development && \
	bun run dev

dev: backend ## Alias for backend

test: ## Run tests
	bun test

clean: ## Stop and remove Redis container
	@echo "Stopping Redis..."
	@docker stop swarmhook-redis > /dev/null 2>&1 || true
	@docker rm swarmhook-redis > /dev/null 2>&1 || true
	@echo "Cleaned up"

logs: ## Show Redis logs
	docker logs -f swarmhook-redis

check: ## Health check
	@curl -s http://localhost:3000/health | jq . || echo "Server not running"
