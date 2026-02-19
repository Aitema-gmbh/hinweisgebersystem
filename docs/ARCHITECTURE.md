# aitema|Hinweis - Architektur

## Systemueberblick

```
                    +------------------+
                    |   Tor Hidden     |
                    |   Service (opt.) |
                    +--------+---------+
                             |
   Melder/Browser -----> +---+---+
                          | Nginx | (TLS, Rate Limiting, Security Headers)
                          +---+---+
                              |
                    +---------+---------+
                    |                   |
              +-----+------+    +------+------+
              |  Frontend  |    |   Backend   |
              |  Angular   |    | Flask/Twisted|
              |  17+ SPA   |    | REST-API    |
              +------------+    +------+------+
                                       |
                          +------------+------------+
                          |            |            |
                   +------+----+ +----+-----+ +----+-----+
                   | PostgreSQL| |   Redis  | |  Celery  |
                   | 16 (MT)  | | 7 (Cache)| | (Worker) |
                   +-----------+ +----------+ +----------+
```

## Schichten-Architektur

### 1. Praesentationsschicht (Frontend)
- **Angular 17+** Standalone Components
- **Angular Material** UI-Bibliothek
- **WCAG 2.1 AA** Barrierefreiheit
- Lazy Loading via Route-Level Code Splitting
- Client-seitige Verschluesselung (Web Crypto API)

### 2. API-Schicht (Backend)
- **Flask** REST-API mit Blueprints
- **JWT** Token-basierte Authentifizierung
- **Rate Limiting** via Flask-Limiter + Redis
- **CORS** konfigurierbar pro Tenant
- API-Versionierung (/api/v1/)

### 3. Geschaeftslogik (Services)
- **HinSchG Compliance**: Fristenberechnung, Pflichtpruefungen
- **Encryption**: AES-256-GCM, HKDF Key Derivation
- **Notification**: E-Mail, Portal-Nachrichten
- **Audit**: Revisionssicherer Trail
- **Tenant Manager**: Multi-Tenant-Isolation

### 4. Datenschicht (Models)
- **SQLAlchemy ORM** mit Mapped Column Pattern
- **Alembic** fuer Migrationen
- **Multi-Tenant**: Row-Level, Schema, DB-per-Tenant

## Multi-Tenant-Architektur

```
Modus: Row-Level (Standard)
  +-----------------------------+
  | hinweis_platform (DB)       |
  | +-------------------------+ |
  | | tenants                 | |
  | | users (tenant_id FK)    | |
  | | hinweise (tenant_id FK) | |
  | | cases (tenant_id FK)    | |
  | +-------------------------+ |
  +-----------------------------+

Modus: DB-per-Tenant
  +------------------+  +------------------+
  | hinweis_platform |  | hinweis_tenant_X |
  | (Master-DB)      |  | (Tenant-DB)      |
  | tenants-Tabelle  |  | users, hinweise  |
  +------------------+  +------------------+
```

## Sicherheitsarchitektur

### Verschluesselung
- **At Rest**: AES-256-GCM fuer sensible Felder
- **In Transit**: TLS 1.2/1.3 (BSI TR-02102-2)
- **Key Management**: Master Key -> HKDF -> Per-Record Keys
- **Passwoerter**: Argon2id Hashing

### Authentifizierung
- JWT Access/Refresh Token
- MFA via TOTP (RFC 6238)
- Brute-Force-Schutz
- Session-Management via Redis

### BSI-Grundschutz
- Security Headers (CSP, HSTS, X-Frame-Options)
- Rate Limiting
- Audit-Trail (nicht loeschbar)
- Eingabevalidierung
- SQL-Injection-Schutz (SQLAlchemy ORM)

## Datenfluss: Meldung einreichen

```
1. Melder oeffnet /melden (kein Login noetig)
2. Formular ausfuellen (mehrstufig)
3. POST /api/v1/submissions/
   -> Pflichtfelder validieren
   -> Sensible Daten mit AES-256-GCM verschluesseln
   -> IP-Adresse hashen (SHA-256)
   -> Fristen berechnen (7 Tage / 3 Monate)
   -> Referenz-Code + Zugangscode generieren
   -> In DB speichern
   -> Audit-Log schreiben
4. Response: {reference_code, access_code}
5. Celery-Task: Eingangsbestaetigung senden
6. Celery-Beat: Stuendliche Fristenueberwachung
```
