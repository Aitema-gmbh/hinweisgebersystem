# aitema|Hinweis – Deployment-Anleitung

Installationsanleitung fuer IT-Abteilungen und Systemadministratoren.

---

## Inhaltsverzeichnis

1. [Systemanforderungen](#systemanforderungen)
2. [Vorbereitung](#vorbereitung)
3. [Docker Compose Installation](#docker-compose-installation)
4. [Nginx Reverse Proxy & TLS](#nginx-reverse-proxy--tls)
5. [Erste Einrichtung](#erste-einrichtung)
6. [Backup-Strategie](#backup-strategie)
7. [Monitoring](#monitoring)
8. [Updates](#updates)
9. [Fehlerbehebung](#fehlerbehebung)

---

## Systemanforderungen

### Mindestanforderungen (bis 5 Mandanten, < 100 Meldungen/Jahr)

| Komponente | Anforderung |
|-----------|-------------|
| Betriebssystem | Debian 12+, Ubuntu 22.04+, RHEL 9+ |
| CPU | 2 vCPU |
| RAM | 4 GB |
| Speicher | 40 GB SSD (System + Daten) |
| Netzwerk | Statische IP, Port 443 (HTTPS) |
| Software | Docker >= 24.0, Docker Compose >= 2.20 |

### Empfohlene Konfiguration (bis 50 Mandanten, > 100 Meldungen/Jahr)

| Komponente | Anforderung |
|-----------|-------------|
| Betriebssystem | Debian 12 / Ubuntu 24.04 LTS |
| CPU | 4 vCPU |
| RAM | 8 GB |
| Speicher | 100 GB SSD (NVMe empfohlen) |
| Netzwerk | Statische IP, dedizierter FQDN |
| Software | Docker >= 24.0, Docker Compose >= 2.20 |
| Backup-Speicher | 100 GB (separater Storage oder S3-kompatibel) |

### Netzwerk-Anforderungen

- **Eingehend:** Port 443/tcp (HTTPS) muss oeffentlich erreichbar sein
- **Ausgehend:** Port 25/587 (SMTP fuer E-Mail-Benachrichtigungen)
- **Optional:** Port 80/tcp (HTTP -> HTTPS Redirect)
- Firewall: Alle anderen Ports sperren

---

## Vorbereitung

### 1. Server aufsetzen

```bash
# System aktualisieren
apt update && apt upgrade -y

# Notwendige Pakete installieren
apt install -y curl git ufw fail2ban unattended-upgrades

# Firewall konfigurieren
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (Redirect)
ufw allow 443/tcp   # HTTPS
ufw enable
```

### 2. Docker installieren

```bash
# Docker GPG Key und Repository hinzufuegen
curl -fsSL https://get.docker.com | sh

# Docker Compose Plugin verifizieren
docker compose version
# Erwartet: Docker Compose version v2.20+

# Docker ohne root (optional, empfohlen)
usermod -aG docker hinweis-admin
```

### 3. System-Benutzer anlegen

```bash
# Dedizierten Benutzer fuer den Dienst erstellen
useradd -r -m -s /bin/bash hinweis-admin
usermod -aG docker hinweis-admin
```

---

## Docker Compose Installation

### 1. Repository klonen

```bash
# Als hinweis-admin
su - hinweis-admin

# Repository klonen
git clone https://github.com/aitema/aitema-hinweis.git /opt/aitema-hinweis
cd /opt/aitema-hinweis
```

### 2. Konfiguration erstellen

```bash
# .env aus Vorlage erstellen
cp .env.example .env

# .env bearbeiten
nano .env
```

**Wichtige .env Variablen:**

```env
# === Basis ===
AITEMA_DOMAIN=hinweis.ihre-kommune.de
AITEMA_ADMIN_EMAIL=admin@ihre-kommune.de

# === Datenbank ===
POSTGRES_DB=aitema_hinweis
POSTGRES_USER=hinweis
POSTGRES_PASSWORD=<SICHERES_PASSWORT_GENERIEREN>

# === Verschluesselung ===
SECRET_KEY=<ZUFAELLIGER_KEY_64_ZEICHEN>
ENCRYPTION_KEY=<ZUFAELLIGER_KEY_32_ZEICHEN>

# === E-Mail (SMTP) ===
SMTP_HOST=mail.ihre-kommune.de
SMTP_PORT=587
SMTP_USER=hinweis@ihre-kommune.de
SMTP_PASSWORD=<SMTP_PASSWORT>
SMTP_FROM=hinweis@ihre-kommune.de

# === Optional ===
ENABLE_TOR=false
MAX_FILE_SIZE_MB=20
RETENTION_YEARS=3
```

**Sichere Passwoerter generieren:**

```bash
# Fuer POSTGRES_PASSWORD und SECRET_KEY
openssl rand -hex 32

# Fuer ENCRYPTION_KEY
openssl rand -hex 16
```

### 3. Docker Compose starten

```bash
# Container bauen und starten
docker compose up -d

# Status pruefen
docker compose ps

# Logs anzeigen
docker compose logs -f
```

**Erwartete Container:**

| Container | Funktion | Port (intern) |
|-----------|----------|---------------|
| aitema-backend | Django REST API | 8080 |
| aitema-frontend | Angular App (Nginx) | 8443 |
| aitema-db | PostgreSQL Datenbank | 5432 |
| aitema-worker | Hintergrund-Tasks (Fristen, E-Mails) | - |

### 4. Datenbank initialisieren

```bash
# Migrationen ausfuehren
docker compose exec backend python manage.py migrate

# Statische Dateien sammeln
docker compose exec backend python manage.py collectstatic --noinput
```

---

## Nginx Reverse Proxy & TLS

### 1. Nginx installieren

```bash
apt install -y nginx
```

### 2. Let's Encrypt Zertifikat

```bash
# Certbot installieren
apt install -y certbot python3-certbot-nginx

# Zertifikat anfordern
certbot certonly --nginx -d hinweis.ihre-kommune.de

# Auto-Renewal pruefen
certbot renew --dry-run
```

### 3. Nginx-Konfiguration

```nginx
# /etc/nginx/sites-available/aitema-hinweis

# HTTP -> HTTPS Redirect
server {
    listen 80;
    server_name hinweis.ihre-kommune.de;
    return 301 https://$host$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name hinweis.ihre-kommune.de;

    # TLS Konfiguration (BSI-konform)
    ssl_certificate /etc/letsencrypt/live/hinweis.ihre-kommune.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hinweis.ihre-kommune.de/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'" always;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    # Max Upload Size
    client_max_body_size 20M;

    # Frontend (Angular)
    location / {
        proxy_pass http://127.0.0.1:8443;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Statische Dateien
    location /static/ {
        alias /opt/aitema-hinweis/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Uploads blockieren fuer oeffentlichen Zugriff
    location /media/ {
        internal;
    }
}
```

```bash
# Konfiguration aktivieren
ln -s /etc/nginx/sites-available/aitema-hinweis /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

## Erste Einrichtung

### 1. Admin-Account erstellen

```bash
docker compose exec backend python manage.py createsuperuser \
  --username admin \
  --email admin@ihre-kommune.de
```

### 2. Ersten Mandanten (Tenant) anlegen

Melden Sie sich im Admin-Bereich an: `https://hinweis.ihre-kommune.de/admin`

1. **Organisation anlegen:** Name, Adresse, Logo der Kommune
2. **Meldestelle konfigurieren:** Bezeichnung, E-Mail-Adresse, Fristen
3. **Meldekanäle aktivieren:** Online-Formular, Telefon, Post, persoenlich
4. **Kategorien definieren:** Korruption, Betrug, Umwelt, etc. (Vorlagen vorhanden)

### 3. Ombudsperson einrichten

1. **Benutzer anlegen:** E-Mail, Name, Rolle "Ombudsperson"
2. **2FA aktivieren:** TOTP (z.B. mit Google Authenticator)
3. **Benachrichtigungen konfigurieren:** E-Mail bei neuen Meldungen
4. **Vertretungsregelung:** Stellvertretende Ombudsperson benennen

### 4. Meldeformular pruefen

1. Oeffentliches Formular aufrufen: `https://hinweis.ihre-kommune.de`
2. Testmeldung abgeben (anonym)
3. Eingangsbestaetigung pruefen (7-Tage-Frist)
4. Fallnummer und Rueckkanal testen
5. Barrierefreiheit pruefen (Screenreader, Tastatur, Kontrast)

---

## Backup-Strategie

### Taeglich: Datenbank-Backup

```bash
# /opt/aitema-hinweis/scripts/backup.sh

#!/bin/bash
BACKUP_DIR="/opt/backups/aitema-hinweis"
DATE=$(date +%Y-%m-%d_%H%M)
mkdir -p "$BACKUP_DIR"

# PostgreSQL Dump (verschluesselt)
docker compose exec -T aitema-db pg_dump -U hinweis aitema_hinweis \
  | gzip \
  | gpg --symmetric --cipher-algo AES256 --passphrase-file /root/.backup-passphrase \
  > "$BACKUP_DIR/db_$DATE.sql.gz.gpg"

# Uploads sichern
tar czf - /opt/aitema-hinweis/uploads/ \
  | gpg --symmetric --cipher-algo AES256 --passphrase-file /root/.backup-passphrase \
  > "$BACKUP_DIR/uploads_$DATE.tar.gz.gpg"

# Alte Backups loeschen (aelter als 30 Tage)
find "$BACKUP_DIR" -name "*.gpg" -mtime +30 -delete

echo "Backup abgeschlossen: $DATE"
```

### Crontab einrichten

```bash
# Taeglich um 02:00 Uhr
chmod +x /opt/aitema-hinweis/scripts/backup.sh
echo "0 2 * * * /opt/aitema-hinweis/scripts/backup.sh >> /var/log/aitema-backup.log 2>&1" \
  | crontab -
```

### Off-Site Backup (empfohlen)

```bash
# Per rclone auf S3-kompatiblen Storage (z.B. Hetzner Storage Box)
apt install -y rclone
rclone copy "$BACKUP_DIR" remote:aitema-hinweis-backups/ --max-age 7d
```

### Restore testen (regelmaessig!)

```bash
# Backup entschluesseln
gpg --decrypt "$BACKUP_DIR/db_2026-02-19_0200.sql.gz.gpg" | gunzip > /tmp/restore.sql

# In Test-Datenbank wiederherstellen
docker compose exec -T aitema-db psql -U hinweis -d aitema_hinweis_test < /tmp/restore.sql

# Aufräumen
rm /tmp/restore.sql
```

---

## Monitoring

### Health-Check Endpoint

```bash
# Application Health
curl -s https://hinweis.ihre-kommune.de/api/health/

# Erwartete Antwort:
# {"status": "healthy", "database": "ok", "worker": "ok", "version": "1.0.0"}
```

### Docker Container Monitoring

```bash
# Container-Status pruefen
docker compose ps

# Ressourcen-Verbrauch
docker stats --no-stream

# Logs der letzten Stunde
docker compose logs --since 1h
```

### Systemd Service (Auto-Restart)

```ini
# /etc/systemd/system/aitema-hinweis.service

[Unit]
Description=aitema|Hinweis Hinweisgebersystem
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/aitema-hinweis
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
ExecReload=/usr/bin/docker compose restart
TimeoutStartSec=120

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable aitema-hinweis
systemctl start aitema-hinweis
```

### Uptime-Monitoring (empfohlen)

Richten Sie ein externes Monitoring ein (z.B. Uptime Kuma, Healthchecks.io):

- **URL:** `https://hinweis.ihre-kommune.de/api/health/`
- **Intervall:** Alle 5 Minuten
- **Alarmierung:** E-Mail + SMS bei Ausfall
- **Erwarteter Status:** HTTP 200 + `"status": "healthy"`

### Log-Rotation

```bash
# /etc/logrotate.d/aitema-hinweis
/var/log/aitema-*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 640 root root
}
```

---

## Updates

### Routine-Updates (monatlich empfohlen)

```bash
cd /opt/aitema-hinweis

# 1. Backup erstellen (IMMER vor Update!)
./scripts/backup.sh

# 2. Neue Version holen
git fetch origin
git log HEAD..origin/main --oneline  # Aenderungen pruefen

# 3. Update durchfuehren
git pull origin main

# 4. Container neu bauen und starten
docker compose build --pull
docker compose up -d

# 5. Datenbank-Migrationen
docker compose exec backend python manage.py migrate

# 6. Health-Check
curl -s https://hinweis.ihre-kommune.de/api/health/

# 7. Funktionstest (Testmeldung abgeben)
```

### Sicherheits-Updates (sofort)

Bei kritischen Sicherheitsupdates:

```bash
# Schnell-Update
cd /opt/aitema-hinweis
./scripts/backup.sh
git pull origin main
docker compose build --pull
docker compose up -d
docker compose exec backend python manage.py migrate
```

### Rollback bei Problemen

```bash
# Zurueck zur vorherigen Version
git log --oneline -5  # Letzten stabilen Commit finden
git checkout <COMMIT_HASH>
docker compose build
docker compose up -d
docker compose exec backend python manage.py migrate

# Datenbank-Rollback (falls noetig)
# Backup vom gleichen Tag einspielen (siehe Restore)
```

---

## Fehlerbehebung

### Haeufige Probleme

**Container startet nicht:**
```bash
docker compose logs backend  # Fehlermeldungen pruefen
docker compose exec backend python manage.py check  # Django-Check
```

**Datenbank-Verbindung fehlgeschlagen:**
```bash
docker compose exec aitema-db pg_isready -U hinweis
docker compose logs aitema-db
```

**E-Mails werden nicht versendet:**
```bash
docker compose logs aitema-worker
docker compose exec backend python manage.py sendtestemail admin@ihre-kommune.de
```

**502 Bad Gateway (Nginx):**
```bash
docker compose ps  # Sind alle Container running?
nginx -t  # Konfigurationsfehler?
systemctl status nginx
```

**Speicherplatz voll:**
```bash
df -h
docker system prune -a  # Alte Images/Container entfernen (Vorsicht!)
```

### Support

- **Community:** GitHub Issues (github.com/aitema/aitema-hinweis/issues)
- **Managed/Enterprise:** hinweis@aitema.de
- **Notfall (Enterprise):** Telefon-Hotline (siehe Vertrag)

---

*Stand: Februar 2026 | Version 1.0*
*aitema GmbH – Open Source fuer das Gemeinwohl*
