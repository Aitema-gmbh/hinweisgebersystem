# aitema|Hinweis - HinSchG-konformes Hinweisgebersystem
# Makefile for Development and Deployment

.PHONY: help dev build test lint deploy backup restore migrate clean

COMPOSE_DEV = docker compose -f docker-compose.dev.yml
COMPOSE_PROD = docker compose -f docker-compose.prod.yml
PYTHON = python3
PIP = pip3

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ============================================================
# Development
# ============================================================

dev: ## Start development environment
	$(COMPOSE_DEV) up -d --build
	@echo "aitema|Hinweis Dev running at http://localhost:8080"
	@echo "Frontend at http://localhost:4200"
	@echo "Backend API at http://localhost:8082"

dev-logs: ## Show development logs
	$(COMPOSE_DEV) logs -f

dev-down: ## Stop development environment
	$(COMPOSE_DEV) down

dev-restart: ## Restart development environment
	$(COMPOSE_DEV) restart

# ============================================================
# Build
# ============================================================

build: ## Build production images
	$(COMPOSE_PROD) build --no-cache

build-backend: ## Build backend only
	docker build -t aitema-hinweis-backend:latest -f docker/Dockerfile .

build-frontend: ## Build frontend only
	cd client && npm run build

# ============================================================
# Testing
# ============================================================

test: test-backend test-frontend ## Run all tests

test-backend: ## Run backend tests
	cd backend && $(PYTHON) -m pytest tests/ -v --tb=short

test-hinschg: ## Run HinSchG-specific tests
	cd backend && $(PYTHON) -m pytest tests/handlers/hinschg/ -v --tb=long

test-frontend: ## Run frontend tests
	cd client && npx ng test --watch=false --browsers=ChromeHeadless

test-e2e: ## Run end-to-end tests
	cd client && npx cypress run

test-a11y: ## Run accessibility tests (BITV 2.0 / WCAG 2.1 AA)
	cd client && npx pa11y-ci --config .pa11yci.json

# ============================================================
# Linting & Quality
# ============================================================

lint: lint-backend lint-frontend ## Run all linters

lint-backend: ## Lint Python code
	cd backend && $(PYTHON) -m flake8 globaleaks/ --max-line-length=120
	cd backend && $(PYTHON) -m mypy globaleaks/services/hinschg/ --ignore-missing-imports

lint-frontend: ## Lint TypeScript/Angular
	cd client && npx ng lint

security-scan: ## Run security scan
	docker run --rm -v $(PWD):/app aquasec/trivy:latest fs /app --severity HIGH,CRITICAL
	cd backend && $(PYTHON) -m bandit -r globaleaks/ -ll

# ============================================================
# Deployment
# ============================================================

deploy: build ## Deploy to production
	$(COMPOSE_PROD) up -d
	@echo "aitema|Hinweis Production deployed"

deploy-staging: ## Deploy to staging
	COMPOSE_PROJECT_NAME=aitema-hinweis-staging $(COMPOSE_PROD) up -d

# ============================================================
# Database & Migration
# ============================================================

migrate: ## Run database migrations
	cd backend && $(PYTHON) -c "from globaleaks.db import update_db; update_db()"

migrate-hinschg: ## Create HinSchG tables
	cd backend && $(PYTHON) -c "from globaleaks.models.hinschg import *; from globaleaks.orm import get_engine; Base.metadata.create_all(get_engine())"

seed: ## Seed demo data
	cd backend && $(PYTHON) scripts/seed_demo.py

# ============================================================
# Backup & Restore
# ============================================================

backup: ## Create full backup
	@mkdir -p backups
	@TIMESTAMP=$$(date +%Y%m%d_%H%M%S) && \
	tar -czf backups/aitema-hinweis-$$TIMESTAMP.tar.gz \
		-C /var/globaleaks . && \
	echo "Backup created: backups/aitema-hinweis-$$TIMESTAMP.tar.gz"

restore: ## Restore from backup (BACKUP=path/to/backup.tar.gz)
	@if [ -z "$(BACKUP)" ]; then echo "Usage: make restore BACKUP=path/to/backup.tar.gz"; exit 1; fi
	$(COMPOSE_PROD) down
	tar -xzf $(BACKUP) -C /var/globaleaks
	$(COMPOSE_PROD) up -d
	@echo "Restored from $(BACKUP)"

# ============================================================
# Maintenance
# ============================================================

clean: ## Clean up containers and volumes
	$(COMPOSE_DEV) down -v --remove-orphans
	docker system prune -f

logs: ## Show production logs
	$(COMPOSE_PROD) logs -f --tail=100

status: ## Show service status
	$(COMPOSE_PROD) ps

shell-backend: ## Open shell in backend container
	$(COMPOSE_DEV) exec backend /bin/bash

shell-redis: ## Open Redis CLI
	$(COMPOSE_DEV) exec redis redis-cli

# ============================================================
# HinSchG Compliance Tools
# ============================================================

hinschg-check-fristen: ## Check all open HinSchG deadlines
	cd backend && $(PYTHON) -c "from globaleaks.services.hinschg import check_deadlines; import asyncio; print(asyncio.get_event_loop().run_until_complete(check_deadlines()))"

hinschg-report: ## Generate compliance report for current year
	cd backend && $(PYTHON) scripts/generate_hinschg_report.py

hinschg-cleanup: ## Run data retention cleanup (§11 HinSchG)
	cd backend && $(PYTHON) -c "from globaleaks.services.hinschg import cleanup_expired_cases; import asyncio; print(asyncio.get_event_loop().run_until_complete(cleanup_expired_cases()))"
