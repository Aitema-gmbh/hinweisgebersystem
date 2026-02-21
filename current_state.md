# Current State: aitema|Hinweis (Hinweisgebersystem)
**Stand:** 2026-02-20
**Status:** Degraded (Backend DB-Health meldet disconnected, Frontend OK)

## Live URLs
- Frontend: https://hinweis.aitema.de
- API Health: https://hinweis.aitema.de/api/v1/health (gibt 503 zurueck)

## Container Status

| Container | Image | Status |
|-----------|-------|--------|
| hinweis-frontend | nginx:alpine | Up (healthy) |
| hinweis-backend | aitema-hinweis-backend:latest | Up |
| hinweis-celery-worker | aitema-hinweis-backend:latest | Up ~1h |
| hinweis-postgres | postgres:16-alpine | Up (healthy) |
| hinweis-redis | redis:7-alpine | Up (healthy) |

## Letzter Deployment
- Datum: 2026-02-20
- Methode: Docker Compose + Traefik
- Images: aitema-hinweis-backend:latest, nginx:alpine
- Stack-Verzeichnis: /opt/aitema/hinweisgebersystem/

## Bekannte Issues

### KRITISCH: database disconnected im Health-Endpoint
- /api/v1/health gibt HTTP 503 zurueck mit Body: database=disconnected, status=degraded
- Ursache: Health-Check-Logik im Backend nutzt unterschiedlichen Connection-Pool
  - asyncpg direkt: Verbindung OK (getestet via docker exec)
  - DATABASE_URL: postgresql+asyncpg://hinweis_user:...@postgres:5432/hinweis_platform
  - Redis: connected (OK)
- Hinweis: Die Datenbank LAEUFT und ist erreichbar - nur der Health-Endpoint meldet falsch
- Fix erforderlich: Health-Check-Logik im Backend ueberpruefen

### Traefik Middleware-Fehler
- Fehler: middleware hinweis-root-redirect@docker does not exist
- Root-Redirect fuer hinweis.aitema.de zeigt auf /api/v1/health (falsch)
- Fix: In redirects.yml anpassen oder Docker-Labels korrigieren

## Naechste Schritte
1. Backend Health-Check-Code reparieren (async DB-Check pruefen)
2. Traefik-Middleware hinweis-root-redirect korrekt definieren
3. Celery-Worker-Monitoring einrichten (keine Healthcheck-Definition vorhanden)
4. Backup-Cronjob fuer PostgreSQL konfigurieren

## Technischer Stack
- Frontend: Angular (nginx:alpine Static Serving)
- Backend: Python + Gunicorn (gthread worker, Port 8080)
- Task Queue: Celery Worker
- Datenbank: PostgreSQL 16 Alpine
- Cache/Queue: Redis 7 Alpine
- Reverse Proxy: Traefik v3.6 + Cloudflare Origin Cert
- TLS: Cloudflare Origin Certificate (gueltig bis 2041)
- Sicherheit: BSI-Grundschutz-Konfiguration (read_only Container, no-new-privileges, scram-sha-256)

## Healthcheck URLs
- https://hinweis.aitema.de/ -> HTTP 200 (Frontend OK)
- https://hinweis.aitema.de/api/v1/health -> HTTP 503 (Backend degraded, DB-Health-Bug)

## HTTP->HTTPS Redirect
- http://hinweis.aitema.de/ -> 301 -> https://hinweis.aitema.de/ (korrekt)
