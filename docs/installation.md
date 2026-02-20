# Installation – aitema|Hinweis

## Voraussetzungen

- Docker ≥ 24.0
- Docker Compose ≥ 2.0
- Mindestens 2 GB RAM
- Mindestens 10 GB Festplattenspeicher
- Eine Domain mit SSL-Zertifikat (für Produktionsbetrieb)

## Schnellstart (ca. 30 Minuten)

### 1. Repository klonen

```bash
git clone https://github.com/Aitema-gmbh/hinweisgebersystem.git
cd hinweisgebersystem
```

### 2. Umgebungsvariablen konfigurieren

```bash
cp .env.example .env
nano .env  # Passwörter und Domain anpassen
```

Mindestens diese Werte müssen gesetzt werden:

| Variable | Beschreibung | Beispiel |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL-Verbindungsstring | `postgresql://user:pass@db:5432/hinweis` |
| `SESSION_SECRET` | Zufälliger Schlüssel (min. 32 Zeichen) | `openssl rand -hex 32` |
| `BASE_URL` | Öffentliche URL der Anwendung | `https://hinweis.gemeinde.de` |
| `SMTP_HOST` | E-Mail-Server für Benachrichtigungen | `mail.gemeinde.de` |
| `SMTP_PORT` | SMTP-Port | `587` |
| `SMTP_USER` | SMTP-Benutzername | `hinweis@gemeinde.de` |
| `SMTP_PASS` | SMTP-Passwort | `sicheres_passwort` |

### 3. Starten

```bash
docker compose up -d
```

### 4. Öffnen

http://localhost:3000

## Produktionsbetrieb

### SSL-Zertifikat mit Let's Encrypt (Nginx)

```nginx
server {
    listen 443 ssl;
    server_name hinweis.ihre-gemeinde.de;

    ssl_certificate /etc/letsencrypt/live/hinweis.ihre-gemeinde.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hinweis.ihre-gemeinde.de/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Zertifikat erstellen:

```bash
certbot --nginx -d hinweis.ihre-gemeinde.de
```

## Datensicherung

Tägliches Backup der Datenbank (Crontab):

```bash
0 2 * * * docker exec hinweis_db pg_dump -U aitema hinweis > /backup/hinweis-$(date +%Y%m%d).sql
```

Backups 30 Tage aufbewahren:

```bash
0 3 * * * find /backup -name "hinweis-*.sql" -mtime +30 -delete
```

## Updates

```bash
git pull
docker compose pull
docker compose up -d
```

## Häufige Probleme

### Datenbank startet nicht

```bash
docker compose logs db
# Speicherplatz prüfen:
df -h
```

### Anwendung nicht erreichbar

```bash
docker compose ps
docker compose logs app
```

### Port bereits belegt

```bash
# Welcher Prozess nutzt Port 3000?
lsof -i :3000
```

## Support

Bei Fragen: [GitHub Issues](https://github.com/Aitema-gmbh/hinweisgebersystem/issues)
oder per E-Mail: kontakt@aitema.de
