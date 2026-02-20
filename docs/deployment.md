# Deployment-Anleitung: aitema|Hinweis

Vollstaendige Anleitung zur Installation des HinSchG-konformen Hinweisgebersystems fuer Kommunen.

## Systemvoraussetzungen

| Komponente | Mindest | Empfohlen |
|------------|---------|-----------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 2 GB | 4 GB |
| Speicher | 20 GB SSD | 50 GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| Docker | 24.0+ | 26.0+ |
| Docker Compose | 2.20+ | 2.27+ |
| Offene Ports | 80, 443 | 80, 443 |

> **Hinweis fuer Kommunen:** Das System laeuft vollstaendig auf Ihrer eigenen Infrastruktur.
> Keine Daten verlassen Ihren Server. Geeignet fuer DSGVO-konformen Betrieb nach Art. 32 DSGVO.

---

## Schnellinstallation (ca. 30 Minuten)

### Schritt 1: Server vorbereiten

```bash
# System aktualisieren
apt update && apt upgrade -y

# Docker installieren (offizielles Installationsskript)
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER

# Docker Compose Plugin installieren (falls nicht enthalten)
apt install docker-compose-plugin -y

# Grundlegende Hilfswerkzeuge
apt install -y git curl nano ufw dnsutils

# Firewall konfigurieren
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (Weiterleitung zu HTTPS)
ufw allow 443/tcp   # HTTPS
ufw enable

# Docker-Version pruefen
docker --version && docker compose version
```

### Schritt 2: Repository klonen

```bash
# Arbeitsverzeichnis anlegen
mkdir -p /opt/kommunal && cd /opt/kommunal

# Repository klonen
git clone https://github.com/Aitema-gmbh/hinweisgebersystem.git
cd hinweisgebersystem

# Aktuelle Version anzeigen
git log --oneline -5
```

### Schritt 3: Konfiguration anpassen

```bash
# Beispielkonfiguration kopieren
cp .env.example .env

# Konfiguration bearbeiten
nano .env
```

Pflichtfelder in `.env`:

```env
# ================================================================
# PFLICHTFELDER - vor dem Start vollstaendig ausfuellen!
# ================================================================

# Datenbankpasswort (mindestens 20 Zeichen, alphanumerisch)
# Generieren: openssl rand -hex 20
POSTGRES_PASSWORD=HIER_SICHERES_PASSWORT_EINTRAGEN

# JWT-Signierungsschluessel (mindestens 32 Zeichen)
# Generieren: openssl rand -hex 32
JWT_SECRET=HIER_LANGEN_ZUFALLSSTRING_EINTRAGEN

# Ihre Domain (DNS muss bereits auf diesen Server zeigen!)
DOMAIN=hinweis.ihre-kommune.de

# Verschluesselungsschluessel fuer sensible Meldungsdaten (32 Zeichen)
# Generieren: openssl rand -hex 16
ENCRYPTION_KEY=HIER_VERSCHLUESSELUNGSSCHLUESSEL

# ================================================================
# E-MAIL-KONFIGURATION (fuer Benachrichtigungen an Bearbeiter)
# ================================================================

SMTP_HOST=smtp.ihre-kommune.de
SMTP_PORT=587
SMTP_USER=hinweis@ihre-kommune.de
SMTP_PASS=IHR_E-MAIL-PASSWORT
SMTP_TLS=true

FROM_EMAIL=hinweis@ihre-kommune.de
FROM_NAME=Hinweisgebersystem Musterhausen

# ================================================================
# OPTIONALE EINSTELLUNGEN
# ================================================================

# Session-Timeout in Minuten (Standard: 30)
SESSION_TIMEOUT=30

# Max. Dateigroesse fuer Anlagen in MB (Standard: 50)
MAX_FILE_SIZE_MB=50

# Zugelassene Dateitypen fuer Meldungsanlagen
ALLOWED_FILE_TYPES=pdf,docx,xlsx,png,jpg,jpeg,zip

# Erinnerung X Tage vor Fristablauf
DEADLINE_REMINDER_DAYS=5

# E-Mail fuer Compliance-Reports
COMPLIANCE_REPORT_EMAIL=datenschutz@ihre-kommune.de

# ================================================================
# TOR-ANONYMISIERUNG (optional, fuer maximale Anonymitaet)
# Erfordert: TOR-Container aktivieren in docker-compose.prod.yml
# ================================================================
TOR_ENABLED=false
```

**Sichere Passwoerter generieren:**

```bash
# Datenbankpasswort
openssl rand -hex 20

# JWT-Secret
openssl rand -hex 32

# Verschluesselungsschluessel
openssl rand -hex 16
```

### Schritt 4: System starten

```bash
# Produktionsversion starten
docker compose -f docker-compose.prod.yml up -d

# Startvorgang beobachten (ca. 60-90 Sekunden)
docker compose -f docker-compose.prod.yml logs -f --tail=50

# Status aller Container pruefen
docker compose -f docker-compose.prod.yml ps
```

Erwartete Ausgabe nach erfolgreichem Start:

```
NAME                    STATUS          PORTS
hinweis-backend         Up (healthy)
hinweis-frontend        Up (healthy)
hinweis-db              Up (healthy)
hinweis-redis           Up (healthy)
traefik                 Up              0.0.0.0:80->80, 0.0.0.0:443->443
```

### Schritt 5: Domain und SSL konfigurieren

**1. DNS-Eintrag setzen** (bei Ihrem DNS-Anbieter):

```
Typ: A
Name: hinweis
Ziel: 123.45.67.89  (Ihre Server-IP)
TTL: 300
```

**2. DNS-Propagation pruefen:**

```bash
dig hinweis.ihre-kommune.de +short
# Ausgabe muss Ihre Server-IP zeigen
```

**3. SSL-Zertifikat:** Traefik holt das Let's-Encrypt-Zertifikat automatisch
innerhalb von 2-3 Minuten nach DNS-Propagation.

**4. SSL-Verbindung pruefen:**

```bash
curl -I https://hinweis.ihre-kommune.de/api/health
# Erwartete Antwort: HTTP/2 200
```

### Schritt 6: Ersten Administrator-Account anlegen

```bash
# Methode A: Interaktiv per Kommandozeile (empfohlen)
docker compose -f docker-compose.prod.yml exec backend \
  python3 manage.py createsuperuser

# Methode B: Erster Login per Web-Einrichtungsassistent
# URL: https://hinweis.ihre-kommune.de/admin/setup
# (Nur beim allerersten Start verfuegbar - danach deaktiviert)
```

### Schritt 7: Finaler System-Check

```bash
# API Health-Endpoint
curl https://hinweis.ihre-kommune.de/api/health

# Erwartete Antwort:
# {"status":"healthy","database":"connected","storage":"ok","version":"1.x.x"}

# Admin-Panel erreichbar?
curl -I https://hinweis.ihre-kommune.de/admin
# Erwartet: HTTP/2 200 oder 302 (Redirect zu Login)

# SSL-Zertifikat pruefen
echo | openssl s_client -connect hinweis.ihre-kommune.de:443 2>/dev/null \
  | openssl x509 -noout -dates
```

---

## Produktionsbetrieb

### Automatische Backups einrichten

```bash
# Backup-Verzeichnis anlegen
mkdir -p /backup/hinweis

# Backup-Skript erstellen
cat > /usr/local/bin/hinweis-backup.sh << 'BACKUP_SCRIPT'
#!/bin/bash
set -e

BACKUP_DIR=/backup/hinweis
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=90  # 3 Monate (HinSchG-Anforderung beachten!)

echo "[$(date)] Starte Backup..."

# 1. Datenbank-Dump
docker exec hinweis-db pg_dump -U postgres hinweis \
  | gzip > "$BACKUP_DIR/db-$DATE.sql.gz"
echo "[$(date)] Datenbank-Backup: OK"

# 2. Anlagen-Backup (hochgeladene Dokumente)
docker run --rm --volumes-from hinweis-backend \
  -v "$BACKUP_DIR:/backup" alpine \
  tar czf "/backup/uploads-$DATE.tar.gz" /app/media/ 2>/dev/null || true
echo "[$(date)] Anlagen-Backup: OK"

# 3. Konfiguration sichern
cp /opt/kommunal/hinweisgebersystem/.env "$BACKUP_DIR/config-$DATE.env"

# 4. Alte Backups loeschen
find "$BACKUP_DIR" -name "*.gz" -mtime "+$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -name "*.env" -mtime "+$RETENTION_DAYS" -delete

echo "[$(date)] Backup abgeschlossen. Groesse: $(du -sh $BACKUP_DIR | cut -f1)"
BACKUP_SCRIPT
chmod +x /usr/local/bin/hinweis-backup.sh

# Cronjob: Taeglich um 02:00 Uhr
echo "0 2 * * * root /usr/local/bin/hinweis-backup.sh >> /var/log/hinweis-backup.log 2>&1" \
  > /etc/cron.d/hinweis-backup

# Backup-Funktion testen
/usr/local/bin/hinweis-backup.sh
ls -lah /backup/hinweis/
```

### Updates einspielen

```bash
cd /opt/kommunal/hinweisgebersystem

# 1. Backup vor dem Update (empfohlen!)
/usr/local/bin/hinweis-backup.sh

# 2. Neuen Code holen
git pull origin main

# 3. Neue Docker-Images laden
docker compose -f docker-compose.prod.yml pull

# 4. Neu starten (minimale Downtime)
docker compose -f docker-compose.prod.yml up -d --no-deps --build backend frontend

# 5. Datenbankmigrationen ausfuehren
docker compose -f docker-compose.prod.yml exec backend \
  python3 manage.py migrate

# 6. Status pruefen
docker compose -f docker-compose.prod.yml ps
curl https://hinweis.ihre-kommune.de/api/health
```

### Monitoring und Logging

```bash
# Alle Logs in Echtzeit
docker compose -f docker-compose.prod.yml logs -f --tail=200

# Nur Backend-Logs (Meldungsaktivitaet)
docker compose -f docker-compose.prod.yml logs -f backend --tail=100

# Systemressourcen pruefen
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Datenbankgroesse und -inhalt pruefen (ohne sensible Daten)
docker exec hinweis-db psql -U postgres -d hinweis \
  -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables WHERE schemaname='public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

### Regelmaessige Wartung

```bash
# Monatlich: Docker-System bereinigen
docker system prune -f
docker volume prune -f  # ACHTUNG: Nur nach Backup!

# Monatlich: Datenbankoptimierung
docker exec hinweis-db psql -U postgres -d hinweis -c "VACUUM ANALYZE;"

# Vierteljährlich: SSL-Zertifikat pruefen (Ablaufdatum)
echo | openssl s_client -connect hinweis.ihre-kommune.de:443 2>/dev/null \
  | openssl x509 -noout -enddate

# Jaehrlich: Passwort-Rotation (Datenbankpasswort)
NEW_PASS=$(openssl rand -hex 20)
docker exec hinweis-db psql -U postgres -c "ALTER USER postgres PASSWORD '$NEW_PASS';"
# .env aktualisieren und Container neu starten
```

---

## HinSchG-Compliance

Das System erfuellt alle gesetzlichen Anforderungen des Hinweisgeberschutzgesetzes (HinSchG) vom 2. Juli 2023:

| Anforderung | Paragraph | Umsetzung | Status |
|-------------|-----------|-----------|--------|
| Anonyme Meldungseinreichung | § 16 HinSchG | Kein Login erforderlich, Tor-Option | Erfuellt |
| Vertraulichkeit der Identitaet | § 8 HinSchG | IP-Anonymisierung, verschluesselte Speicherung | Erfuellt |
| Rueckmeldefrist 7 Tage | § 17 Abs. 1 HinSchG | Automatische Fristberechnung + Erinnerung | Erfuellt |
| Abschlussmitteilung 3 Monate | § 17 Abs. 2 HinSchG | Eskalation bei Fristablauf | Erfuellt |
| Vollstaendiger Audit-Trail | §§ 11-13 HinSchG | Unveraenderliche Protokollierung aller Aktionen | Erfuellt |
| Loeschkonzept | § 10 HinSchG | Konfigurierbare Loeschfristen nach Abschluss | Erfuellt |
| Repressalienverbot | § 36 HinSchG | Keine Identifizierbarkeit des Hinweisgebers | Erfuellt |
| Hinweisgeberschutzbeauftragter | § 15 HinSchG | Dedizierte Admin-Rolle konfigurierbar | Erfuellt |

### Wichtige Fristen konfigurieren

```env
# In .env:
# Rückmeldefrist nach HinSchG § 17 Abs. 1 (7 Tage, nicht aenderbar!)
RESPONSE_DEADLINE_DAYS=7

# Abschlussmitteilungsfrist nach HinSchG § 17 Abs. 2 (3 Monate)
CLOSURE_DEADLINE_DAYS=90

# Loeschfrist nach Abschluss (3 Jahre empfohlen nach § 10 HinSchG)
RETENTION_AFTER_CLOSURE_DAYS=1095

# Erinnerung X Tage vor Fristablauf
DEADLINE_REMINDER_DAYS=5
```

### Compliance-Bericht generieren

```bash
# Monatlichen Compliance-Bericht exportieren
docker compose -f docker-compose.prod.yml exec backend \
  python3 manage.py export_compliance_report --month=$(date +%Y-%m)
```

---

## Datenschutz (DSGVO)

### Grundprinzipien

- **Datensparsamkeit (Art. 5 DSGVO):** Nur notwendige Daten werden erfasst
- **Zweckbindung (Art. 5 DSGVO):** Daten ausschliesslich fuer Hinweisgebersystem
- **Server-Souveraenitaet:** Alle Daten verbleiben auf Ihrem kommunalen Server
- **Verschluesselung:** TLS 1.3 in Transit, optionale AES-256-Verschluesselung at Rest

### Keine Auftragsverarbeitung notwendig

Da das System vollstaendig selbst gehostet wird, ist kein
Auftragsverarbeitungsvertrag (AVV) mit aitema erforderlich.

### Einzurichtende Dokumente

1. **Verzeichnis der Verarbeitungstaetigkeiten (Art. 30 DSGVO):**
   Template: `docs/dsgvo-vvt.md`

2. **Datenschutz-Folgenabschaetzung (Art. 35 DSGVO):**
   Template: `docs/dsgvo-dpia.md`

3. **Datenschutzerklaerung fuer Hinweisgeber:**
   Wird automatisch unter `/datenschutz` angezeigt (anpassen in Admin)

### IP-Anonymisierung

```env
# In .env (Standard: aktiviert)
IP_ANONYMIZATION=true
IP_ANONYMIZATION_MODE=full  # "full" = nur Hash gespeichert, "partial" = letzte 3 Oktette entfernt
```

---

## Troubleshooting

### Container startet nicht

```bash
# Detaillierte Fehlerausgabe anzeigen
docker compose -f docker-compose.prod.yml logs hinweis-backend --tail=100

# Haeufige Ursachen und Loesungen:
#
# 1. Datenbankverbindungsfehler
#    Fehler: "could not connect to server: Connection refused"
#    Loesung: POSTGRES_PASSWORD in .env pruefen, DB-Container laufen lassen
docker compose -f docker-compose.prod.yml logs hinweis-db --tail=30

# 2. Port 80/443 bereits belegt
#    Fehler: "bind: address already in use"
#    Loesung: Anderen Dienst beenden
lsof -i :80
lsof -i :443

# 3. Fehlendes .env oder falsche Variablen
docker compose -f docker-compose.prod.yml config  # Konfiguration validieren
```

### Datenbank-Migrationsfehler

```bash
# Migrationsstatus anzeigen
docker compose -f docker-compose.prod.yml exec backend \
  python3 manage.py showmigrations

# Migrationen neu ausfuehren
docker compose -f docker-compose.prod.yml exec backend \
  python3 manage.py migrate

# Bei "already exists" Fehler:
docker compose -f docker-compose.prod.yml exec backend \
  python3 manage.py migrate --fake-initial

# Datenbankverbindung direkt testen
docker exec hinweis-db psql -U postgres -d hinweis -c "\dt"
```

### SSL-Zertifikat fehlt oder abgelaufen

```bash
# DNS-Aufloesung pruefen (Voraussetzung fuer Let's Encrypt!)
dig hinweis.ihre-kommune.de +short  # Muss Server-IP zeigen
nslookup hinweis.ihre-kommune.de

# Traefik ACME-Logs pruefen
docker logs traefik 2>&1 | grep -i "acme\|certificate\|error" | tail -30

# Let's-Encrypt Rate-Limit pruefen (5 Zertifikate/Woche pro Domain)
# Bei Rate-Limit: 7 Tage warten oder Staging-URL nutzen

# Zertifikat-Cache loeschen und neu anfordern
docker exec traefik rm -f /letsencrypt/acme.json
docker restart traefik
sleep 60 && curl -I https://hinweis.ihre-kommune.de
```

### E-Mail-Benachrichtigungen funktionieren nicht

```bash
# SMTP-Verbindung testen
docker compose -f docker-compose.prod.yml exec backend \
  python3 -c "
import smtplib
s = smtplib.SMTP('$SMTP_HOST', $SMTP_PORT)
s.starttls()
s.login('$SMTP_USER', '$SMTP_PASS')
print('SMTP-Verbindung: OK')
s.quit()
"

# Test-E-Mail senden
docker compose -f docker-compose.prod.yml exec backend \
  python3 manage.py sendtestemail admin@ihre-kommune.de
```

### Hohe Speichernutzung

```bash
# Speicherbelegung anzeigen
df -h && docker system df

# Docker bereinigen (nur ungenutzte Ressourcen)
docker system prune -f

# Datenbankgroesse optimieren
docker exec hinweis-db psql -U postgres -d hinweis -c "VACUUM FULL ANALYZE;"

# Alte Log-Dateien loeschen
journalctl --vacuum-time=30d
```

### Passwort vergessen / Admin-Account gesperrt

```bash
# Passwort per CLI zuruecksetzen
docker compose -f docker-compose.prod.yml exec backend \
  python3 manage.py changepassword BENUTZERNAME

# Neuen Superuser anlegen (wenn kein Admin mehr vorhanden)
docker compose -f docker-compose.prod.yml exec backend \
  python3 manage.py createsuperuser

# Account entsperren (nach zu vielen Fehlversuchen)
docker compose -f docker-compose.prod.yml exec backend \
  python3 manage.py shell -c "
from django.contrib.auth.models import User
u = User.objects.get(username='BENUTZERNAME')
u.is_active = True
u.save()
"
```

---

## Sicherheitshaertung (empfohlen nach Installation)

```bash
# 1. Fail2Ban installieren (Schutz vor Brute-Force-Angriffen)
apt install fail2ban -y
systemctl enable --now fail2ban

# 2. Automatische Sicherheitsupdates aktivieren
apt install unattended-upgrades -y
dpkg-reconfigure --priority=low unattended-upgrades

# 3. SSH nur mit Schluessel (kein Passwort-Login)
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd

# 4. Logwatch fuer taegliche Sicherheitsberichte
apt install logwatch -y
logwatch --output mail --mailto admin@ihre-kommune.de --detail high

# 5. Regelmaeßige Sicherheits-Scans
apt install lynis -y
lynis audit system  # Sicherheitsaudit durchfuehren
```

---

## Kubernetes-Deployment (optional)

Fuer groessere Kommunen oder Rechenzentren steht ein Helm Chart bereit:

```bash
# Helm Chart installieren
helm repo add aitema https://charts.aitema.de
helm install hinweis aitema/aitema-hinweis \
  --namespace hinweisgebersystem --create-namespace \
  --set ingress.hosts[0].host=hinweis.ihre-kommune.de \
  --set postgresql.auth.password=SICHERES_PASSWORT

# Alternativ: Lokales Helm Chart aus diesem Repository
helm install hinweis ./helm/ \
  --values helm/values.yaml \
  --set env.DOMAIN=hinweis.ihre-kommune.de
```

Siehe `helm/` Verzeichnis fuer vollstaendige Helm-Konfiguration.

---

## Support und Ressourcen

| Kanal | Kontakt |
|-------|---------|
| E-Mail (allgemein) | support@aitema.de |
| E-Mail (Datenschutz) | datenschutz@aitema.de |
| GitHub Issues | https://github.com/Aitema-gmbh/hinweisgebersystem/issues |
| API-Dokumentation | https://aitema.de/api-docs/hinweisgebersystem |
| Changelog | CHANGELOG.md im Repository |
| Community | https://community.aitema.de |

---

*Letzte Aktualisierung: Februar 2026 | aitema GmbH*
*Lizenz: European Union Public License (EUPL) 1.2*
