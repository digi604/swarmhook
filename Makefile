.PHONY: help install backend dev test clean check

help: ## Show this help message
	@echo "SwarmHook - Development Commands"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	bun install

backend: ## Start backend server (uses local Redis)
	@echo "Starting SwarmHook backend..."
	@echo "Using local Redis on localhost:6379"
	@export REDIS_URL=redis://localhost:6379 && \
	export PORT=3000 && \
	export BASE_URL=http://localhost:3000 && \
	export NODE_ENV=development && \
	bun run dev

dev: backend ## Alias for backend

test: ## Run tests
	bun test

clean: ## Clean up build artifacts
	@echo "Cleaning up..."
	@rm -rf dist/ node_modules/.cache
	@echo "Cleaned up"

check: ## Health check
	@curl -s http://localhost:3000/health | jq . || echo "Server not running"

landing: ## Open landing page in browser
	@curl http://localhost:3000/ || echo "Server not running"
