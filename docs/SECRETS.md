# Secrets und Konfiguration – aitema|Hinweis

## Schnellstart

```bash
# Template kopieren und anpassen
cp .env.production.example .env.production
nano .env.production
```

## Sichere Passwörter generieren

```bash
# 32-Byte Hex Secret (für Passwörter, JWT)
openssl rand -hex 32

# 64-Byte Hex Secret (für SECRET_KEY)
openssl rand -hex 64

# 32-Byte Base64 Secret (für ENCRYPTION_MASTER_KEY)
openssl rand -base64 32
```

## Pflichtfelder

| Variable | Beschreibung | Generierung |
|----------|-------------|-------------|
| `POSTGRES_PASSWORD` | Datenbank-Passwort | `openssl rand -hex 32` |
| `REDIS_PASSWORD` | Redis-Passwort | `openssl rand -hex 32` |
| `SECRET_KEY` | Haupt-Session-Secret (min. 64 Zeichen) | `openssl rand -hex 64` |
| `ENCRYPTION_MASTER_KEY` | AES-256-Schlüssel für Hinweisverschlüsselung | `openssl rand -base64 32` |
| `JWT_SECRET_KEY` | JWT-Signierungsschlüssel | `openssl rand -hex 32` |
| `CORS_ORIGINS` | Erlaubte Frontend-URL(s) | z.B. `https://hinweis.example.de` |
| `COMPLIANCE_EMAIL` | E-Mail des Hinweisgeberbeauftragten | Pflicht laut HinSchG |

## HinSchG-Pflichten (§ 17 Hinweisgeberschutzgesetz)

Folgende Fristen sind gesetzlich vorgeschrieben und müssen korrekt konfiguriert sein:

| Variable | Gesetzliche Vorgabe | Standardwert |
|----------|--------------------|----|
| `CONFIRMATION_DEADLINE_DAYS` | Eingangsbestätigung innerhalb 7 Tagen | `7` |
| `FEEDBACK_DEADLINE_MONTHS` | Rückmeldung innerhalb 3 Monaten | `3` |

## GitHub Actions Secrets

Für CI/CD müssen folgende Secrets in GitHub unter
`Settings → Secrets → Actions` hinterlegt werden:

| Secret | Beschreibung |
|--------|-------------|
| `GHCR_TOKEN` | GitHub Container Registry Token (ghcr.io) |
| `DEPLOY_SSH_KEY` | SSH-Private-Key für den Deployment-Server |
| `DEPLOY_HOST` | IP oder Hostname des Deployment-Servers |
| `POSTGRES_PASSWORD_PROD` | Produktions-Datenbank-Passwort |
| `SECRET_KEY_PROD` | Produktions-Session-Secret |
| `ENCRYPTION_MASTER_KEY_PROD` | Produktions-Verschlüsselungsschlüssel |
| `SENTRY_DSN` | Sentry-DSN für Error-Tracking (optional) |

## .gitignore (wichtig\!)

Stelle sicher, dass `.env.production` in `.gitignore` eingetragen ist:

```
.env
.env.*
\!.env*.example
\!.env.prod.example
\!.env.production.example
```

## Sicherheitshinweise

- **Rotation**: Ändere alle Secrets bei Verdacht auf Kompromittierung sofort
- **Backup**: Sichere `.env.production` verschlüsselt außerhalb des Repos
- **Tor**: Der optionale Tor-Hidden-Service erhöht den Schutz für Hinweisgeber erheblich
- **Audit**: Alle Zugriffe auf Hinweise werden geloggt (§ 13 HinSchG)
- Melde Sicherheitslücken gemäß `/SECURITY.md`
