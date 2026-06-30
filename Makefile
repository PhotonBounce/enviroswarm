# ENViroSwarm Makefile
# One-command shortcuts for development and deployment

.PHONY: help setup dev backend web android data clean deploy test lint

help: ## Show all available commands
	@echo "ENViroSwarm Automation Commands"
	@echo "================================"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

setup: ## One-command setup: install all dependencies
	@echo "🚀 Setting up ENViroSwarm..."
	@echo "Installing Python dependencies..."
	cd backend && pip install -r requirements.txt
	@echo "Installing web dashboard dependencies..."
	cd web-dashboard && npm install
	@echo "Installing Android app dependencies..."
	cd android-app && npm install
	@echo "Installing data pipeline dependencies..."
	cd data-pipeline && pip install -r requirements.txt
	@echo "✅ Setup complete!"

dev: ## Start full development stack (docker-compose up)
	@echo "🐳 Starting development stack..."
	cd backend && docker-compose up -d

stop: ## Stop all development containers
	@echo "🛑 Stopping development stack..."
	cd backend && docker-compose down

backend: ## Start backend only (uvicorn)
	@echo "🐍 Starting backend..."
	cd backend && uvicorn app.main:app --reload --port 8000

web: ## Start web dashboard only (vite dev)
	@echo "⚛️  Starting web dashboard..."
	cd web-dashboard && npm run dev

android: ## Start Android app (Expo)
	@echo "📱 Starting Android app..."
	cd android-app && npx expo start

data: ## Seed demo data
	@echo "🌱 Seeding demo data..."
	cd data-pipeline && python seed_demo.py

test: ## Run all tests (backend + web typecheck + data syntax)
	@echo "🧪 Running tests..."
	cd backend && pytest tests/ -v
	cd web-dashboard && npx tsc --noEmit
	cd android-app && npx tsc --noEmit
	@echo "✅ All tests passed!"

lint: ## Lint all code
	@echo "🔍 Linting backend..."
	cd backend && flake8 app/ --max-line-length=120 || true
	@echo "🔍 Linting web..."
	cd web-dashboard && npm run lint || true

clean: ## Clean build artifacts and cache
	@echo "🧹 Cleaning up..."
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "node_modules" -prune -o -type d -name ".expo" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	rm -rf web-dashboard/dist android-app/android android-app/ios

build: ## Build production assets
	@echo "🏗️  Building production assets..."
	cd web-dashboard && npm run build

deploy: ## Deploy to production (requires server setup)
	@echo "🚀 Deploying to production..."
	ssh $(DEPLOY_USER)@$(DEPLOY_HOST) "cd /opt/enviroswarm && ./scripts/deploy.sh all"

backup: ## Run database backup
	@echo "💾 Running backup..."
	./scripts/backup.sh

health: ## Run health check
	@echo "❤️  Running health check..."
	./scripts/health-check.sh

monitor: ## Start monitoring (health check every 60 seconds)
	@echo "👀 Starting monitoring loop..."
	@while true; do \
		./scripts/health-check.sh || true; \
		sleep 60; \
	done

status: ## Show project status
	@echo "📊 ENViroSwarm Status"
	@echo "======================"
	@echo "Git branch: $$(git branch --show-current)"
	@echo "Last commit: $$(git log -1 --format='%h %s')"
	@echo "Total lines: $$(find . -name '*.py' -o -name '*.ts' -o -name '*.tsx' ! -path '*/node_modules/*' ! -path '*/.venv/*' | xargs wc -l 2>/dev/null | tail -1)"
	@echo "Docker containers: $$(docker ps --format '{{.Names}}' 2>/dev/null || echo 'Docker not running')"