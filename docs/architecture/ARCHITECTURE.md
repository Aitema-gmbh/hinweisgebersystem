# aitema|Hinweis – Technische Architektur

## Übersicht

aitema|Hinweis ist eine mehrschichtige Webanwendung nach dem Prinzip der strikten Trennung von Frontend, Backend und Datenbank.

## System-Architektur

```mermaid
graph TB
    subgraph Internet
        B[Browser / Hinweisgeber]
        A[Browser / Administrator]
    end
    
    subgraph Reverse Proxy
        T[Traefik<br/>TLS Termination<br/>Rate Limiting]
    end
    
    subgraph Frontend
        F[Angular 18 SPA<br/>:4200]
    end
    
    subgraph Backend
        API[NestJS API<br/>:3000]
        CRYPTO[Crypto Service<br/>E2E Verschlüsselung]
        AUTH[Auth Service<br/>JWT]
    end
    
    subgraph Datenbank
        PG[(PostgreSQL 15<br/>:5432)]
        REDIS[(Redis Cache<br/>:6379)]
    end
    
    B --> T
    A --> T
    T --> F
    T --> API
    F --> API
    API --> CRYPTO
    API --> AUTH
    API --> PG
    API --> REDIS
```

## Sicherheits-Architektur

```mermaid
sequenceDiagram
    participant HG as Hinweisgeber
    participant FE as Frontend (Angular)
    participant BE as Backend (NestJS)
    participant DB as PostgreSQL
    
    HG->>FE: Meldung ausfüllen
    Note over FE: Lokale Verschlüsselung<br/>im Browser
    FE->>BE: POST /api/reports<br/>(verschlüsselt, kein IP-Log)
    BE->>BE: Receipt-Code generieren<br/>(CSPRNG, 8 Zeichen)
    BE->>DB: Verschlüsselte Meldung speichern<br/>(kein Klartext)
    BE->>FE: Receipt-Code zurückgeben
    FE->>HG: Code anzeigen<br/>+ Speichern empfehlen
    
    Note over BE,DB: Kein IP-Logging<br/>Kein Session-Tracking<br/>DSGVO-konform
```

## Komponenten

### Frontend (Angular 18)
- **Framework**: Angular 18 mit Standalone Components
- **Styling**: Bootstrap 5 + aitema Design System
- **Internationalisierung**: Eigener I18nService (DE/EN)
- **Barrierefreiheit**: WCAG 2.1 AA, BITV 2.0
- **Build**: ng build → statische Dateien → nginx

### Backend (NestJS)
- **Framework**: NestJS mit Express.js
- **API**: RESTful JSON API mit OpenAPI 3.1 Docs
- **Authentifizierung**: JWT + Refresh Token
- **Verschlüsselung**: libsodium / crypto-js
- **Validierung**: class-validator + class-transformer
- **ORM**: Prisma mit PostgreSQL

### Datenbank
- **PostgreSQL 15**: Hauptdatenbank
- **Prisma ORM**: Type-safe Datenbankzugriff
- **Migrations**: Automatisch via Prisma Migrate

## Deployment

```mermaid
graph LR
    GH[GitHub<br/>Aitema-gmbh/hinweisgebersystem]
    GHCR[GitHub Container Registry<br/>ghcr.io/aitema-gmbh]
    SERVER[Hetzner Server<br/>Docker Compose]
    
    GH -->|git push main| GH
    GH -->|GitHub Actions| GHCR
    GHCR -->|Webhook / Manual Pull| SERVER
```

## Technologie-Stack

| Layer | Technologie | Version |
|-------|-------------|---------|
| Frontend | Angular | 18.x |
| Backend | NestJS | 10.x |
| Datenbank | PostgreSQL | 15.x |
| Cache | Redis | 7.x |
| Container | Docker | 24.x |
| Proxy | Traefik | 3.x |
| Sprache | TypeScript | 5.x |
