# aitema|Hinweis - Makefile
# HinSchG-konformes Hinweisgebersystem

.PHONY: help dev build test lint deploy backup restore migrate clean logs shell

COMPOSE_DEV = docker compose -f docker-compose.yml
COMPOSE_PROD = docker compose -f docker-compose.yml -f docker-compose.prod.yml

# Farben fuer Terminal-Ausgabe
GREEN  := \033[0;32m
YELLOW := \033[0;33m
RED    := \033[0;31m
NC     := \033[0m

help: ## Zeigt diese Hilfe an
	@echo "$(GREEN)aitema|Hinweis - Build Targets$(NC)"
	@echo "=============================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'

# === Entwicklung ===

dev: ## Startet die Entwicklungsumgebung
	@echo "$(GREEN)Starte Entwicklungsumgebung...$(NC)"
	$(COMPOSE_DEV) up --build -d
	@echo "$(GREEN)Backend:  http://localhost:8080$(NC)"
	@echo "$(GREEN)Frontend: http://localhost:4200$(NC)"
	@echo "$(GREEN)Proxy:    http://localhost:80$(NC)"

dev-tor: ## Startet Dev-Environment mit Tor Hidden Service
	$(COMPOSE_DEV) --profile tor up --build -d

dev-down: ## Stoppt die Entwicklungsumgebung
	$(COMPOSE_DEV) down

dev-restart: ## Startet die Entwicklungsumgebung neu
	$(COMPOSE_DEV) restart

# === Build ===

build: ## Baut alle Docker-Images (Production)
	@echo "$(GREEN)Baue Production-Images...$(NC)"
	$(COMPOSE_PROD) build --no-cache

build-backend: ## Baut nur das Backend-Image
	$(COMPOSE_PROD) build --no-cache backend

build-frontend: ## Baut nur das Frontend-Image
	$(COMPOSE_PROD) build --no-cache frontend

# === Tests ===

test: ## Fuehrt alle Tests aus
	@echo "$(GREEN)Fuehre Tests aus...$(NC)"
	$(COMPOSE_DEV) exec backend pytest tests/ -v --tb=short --cov=app --cov-report=term-missing

test-unit: ## Fuehrt Unit-Tests aus
	$(COMPOSE_DEV) exec backend pytest tests/ -v -m "not integration" --tb=short

test-integration: ## Fuehrt Integrationstests aus
	$(COMPOSE_DEV) exec backend pytest tests/ -v -m integration --tb=short

test-hinschg: ## Fuehrt HinSchG-Compliance-Tests aus
	$(COMPOSE_DEV) exec backend pytest tests/test_hinschg_compliance.py -v --tb=long

test-security: ## Fuehrt Security-Tests aus
	$(COMPOSE_DEV) exec backend bandit -r app/ -f json -o /tmp/bandit-report.json || true
	$(COMPOSE_DEV) exec backend safety check --json || true

# === Code-Qualitaet ===

lint: ## Prueft Code-Qualitaet
	@echo "$(GREEN)Pruefe Code-Qualitaet...$(NC)"
	$(COMPOSE_DEV) exec backend ruff check app/ tests/
	$(COMPOSE_DEV) exec backend mypy app/ --ignore-missing-imports
	$(COMPOSE_DEV) exec frontend npx ng lint

lint-fix: ## Behebt Lint-Fehler automatisch
	$(COMPOSE_DEV) exec backend ruff check app/ tests/ --fix
	$(COMPOSE_DEV) exec frontend npx ng lint --fix

format: ## Formatiert den Code
	$(COMPOSE_DEV) exec backend ruff format app/ tests/
	$(COMPOSE_DEV) exec frontend npx prettier --write "src/**/*.{ts,html,scss}"

# === Deployment ===

deploy: ## Deployt in Production
	@echo "$(YELLOW)Deploying to Production...$(NC)"
	@test -f .env || (echo "$(RED)FEHLER: .env Datei fehlt\! Kopiere .env.example nach .env$(NC)" && exit 1)
	$(COMPOSE_PROD) pull
	$(COMPOSE_PROD) up -d --build --remove-orphans
	$(COMPOSE_PROD) exec backend alembic upgrade head
	@echo "$(GREEN)Deployment abgeschlossen\!$(NC)"

deploy-migrate: ## Fuehrt nur Migrationen in Production aus
	$(COMPOSE_PROD) exec backend alembic upgrade head

# === Datenbank ===

migrate: ## Erstellt eine neue Migration
	@read -p "Migration-Nachricht: " msg; \
	$(COMPOSE_DEV) exec backend alembic revision --autogenerate -m "$$msg"

migrate-up: ## Fuehrt ausstehende Migrationen aus
	$(COMPOSE_DEV) exec backend alembic upgrade head

migrate-down: ## Macht letzte Migration rueckgaengig
	$(COMPOSE_DEV) exec backend alembic downgrade -1

migrate-history: ## Zeigt Migrations-Historie
	$(COMPOSE_DEV) exec backend alembic history --verbose

# === Backup & Restore ===

backup: ## Erstellt ein Backup aller Datenbanken
	@echo "$(GREEN)Erstelle Backup...$(NC)"
	@mkdir -p backups
	$(COMPOSE_DEV) exec postgres pg_dumpall -U $${POSTGRES_USER:-hinweis} | \
		gzip > backups/hinweis_$$(date +%Y%m%d_%H%M%S).sql.gz
	@echo "$(GREEN)Backup erstellt: backups/hinweis_$$(date +%Y%m%d_%H%M%S).sql.gz$(NC)"

backup-prod: ## Erstellt ein Production-Backup
	@echo "$(GREEN)Erstelle Production-Backup...$(NC)"
	$(COMPOSE_PROD) --profile backup run --rm backup

restore: ## Stellt ein Backup wieder her (BACKUP=dateiname.sql.gz)
	@test -n "$(BACKUP)" || (echo "$(RED)FEHLER: BACKUP Variable nicht gesetzt. Nutzung: make restore BACKUP=dateiname.sql.gz$(NC)" && exit 1)
	@echo "$(YELLOW)Stelle Backup wieder her: $(BACKUP)$(NC)"
	@echo "$(RED)ACHTUNG: Dies ueberschreibt die aktuelle Datenbank\!$(NC)"
	@read -p "Fortfahren? (ja/nein): " confirm; \
	[ "$$confirm" = "ja" ] || exit 1
	gunzip -c $(BACKUP) | $(COMPOSE_DEV) exec -T postgres psql -U $${POSTGRES_USER:-hinweis}
	@echo "$(GREEN)Backup wiederhergestellt\!$(NC)"

# === Utilities ===

logs: ## Zeigt Logs aller Services
	$(COMPOSE_DEV) logs -f --tail=100

logs-backend: ## Zeigt Backend-Logs
	$(COMPOSE_DEV) logs -f --tail=100 backend

logs-celery: ## Zeigt Celery-Worker-Logs
	$(COMPOSE_DEV) logs -f --tail=100 celery-worker

shell: ## Oeffnet eine Shell im Backend-Container
	$(COMPOSE_DEV) exec backend bash

shell-db: ## Oeffnet eine PostgreSQL-Shell
	$(COMPOSE_DEV) exec postgres psql -U $${POSTGRES_USER:-hinweis} -d $${POSTGRES_DB:-hinweis_platform}

shell-redis: ## Oeffnet eine Redis-Shell
	$(COMPOSE_DEV) exec redis redis-cli -a $${REDIS_PASSWORD:-changeme_dev_redis}

clean: ## Entfernt alle Container, Volumes und Build-Cache
	@echo "$(RED)ACHTUNG: Alle Daten werden geloescht\!$(NC)"
	@read -p "Fortfahren? (ja/nein): " confirm; \
	[ "$$confirm" = "ja" ] || exit 1
	$(COMPOSE_DEV) down -v --remove-orphans
	docker system prune -f

status: ## Zeigt Status aller Services
	$(COMPOSE_DEV) ps

health: ## Prueft Health aller Services
	@echo "$(GREEN)Service Health-Check$(NC)"
	@$(COMPOSE_DEV) ps --format "table {{.Name}}\t{{.Status}}"
	@echo ""
	@curl -sf http://localhost:8080/api/v1/health | python3 -m json.tool 2>/dev/null || echo "$(RED)Backend nicht erreichbar$(NC)"
