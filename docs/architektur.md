# aitema|Hinweis – Architektur-Übersicht

## System-Übersicht

```
┌─────────────────────────────────────────────────────────┐
│                    aitema|Hinweis                        │
│                                                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   Angular   │───▶│  Spring Boot│───▶│ PostgreSQL  │  │
│  │  Frontend   │    │   Backend   │    │  Datenbank  │  │
│  │  (Port 4200)│    │  (Port 8080)│    │  (Port 5432)│  │
│  └─────────────┘    └─────────────┘    └─────────────┘  │
│         │                  │                             │
│         └──────────────────┘                             │
│                Traefik / Nginx                           │
│              (HTTPS Reverse Proxy)                       │
└─────────────────────────────────────────────────────────┘
```

## Komponenten

### Frontend (Angular 17+)
- **Framework:** Angular 17 mit TypeScript
- **UI-Library:** Bootstrap 5 + aitema Design-System
- **Besonderheiten:** Anonyme Übermittlung ohne Cookies/Sessions

### Backend (Java / Spring Boot)
- **Framework:** Spring Boot 3.x
- **API:** REST (JSON)
- **Sicherheit:** Spring Security, JWT
- **Anonymisierung:** Keine IP-Speicherung, sichere Zufallscodes

### Datenbank (PostgreSQL)
- **Version:** PostgreSQL 14+
- **Verschlüsselung:** Sensitive Felder AES-256 verschlüsselt
- **Backup:** Täglich automatisch

## Deployment

```bash
# Minimale Docker-Compose-Konfiguration
version: '3.8'
services:
  frontend:
    image: aitema/hinweisgebersystem-frontend:latest
    ports: ["4200:80"]
  backend:
    image: aitema/hinweisgebersystem-backend:latest
    ports: ["8080:8080"]
    environment:
      - DB_URL=jdbc:postgresql://db:5432/hinweis
  db:
    image: postgres:14
    environment:
      - POSTGRES_DB=hinweis
      - POSTGRES_USER=hinweis
      - POSTGRES_PASSWORD=${DB_PASSWORD}
```

## Datenschutz-Architektur

1. **Keine Klarnamen:** Hinweisgeber erhalten anonymen Zugangscode
2. **Kein IP-Logging:** Anfragen werden ohne IP-Adresse verarbeitet
3. **Verschlüsselte Kommunikation:** TLS 1.3, sichere Nachrichten
4. **Audit-Trail:** Alle Aktionen werden protokolliert (ohne Personenbezug)
5. **Self-hosted:** Keine Datenübertragung an Dritte

## Rechtliche Grundlagen

- **HinSchG** (Hinweisgeberschutzgesetz) – vollständig konform
- **DSGVO** Art. 25 – Privacy by Design
- **BSI Grundschutz** – empfohlene Sicherheitsmaßnahmen umgesetzt

## Lizenz

AGPL-3.0-or-later – Open Source, selbst hostbar
