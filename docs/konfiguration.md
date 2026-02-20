# Konfiguration – aitema|Hinweis

Alle Konfigurationsoptionen werden über Umgebungsvariablen in der Datei `.env` gesetzt.
Die Vorlage befindet sich in `.env.example` im Wurzelverzeichnis des Projekts.

## Pflichtfelder

| Variable | Beschreibung |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL-Verbindungsstring |
| `SESSION_SECRET` | Zufälliger kryptografischer Schlüssel (min. 32 Zeichen) |
| `BASE_URL` | Öffentliche URL der Anwendung |

Schlüssel generieren:

```bash
openssl rand -hex 32
```

## E-Mail-Benachrichtigungen

Damit Hinweisgeber und Beauftragte E-Mail-Benachrichtigungen erhalten, müssen folgende
Variablen gesetzt sein:

```env
SMTP_HOST=mail.ihre-gemeinde.de
SMTP_PORT=587
SMTP_USER=hinweis@ihre-gemeinde.de
SMTP_PASS=sicheres_passwort
SMTP_FROM=hinweis@ihre-gemeinde.de
```

Ohne SMTP-Konfiguration läuft das System, jedoch ohne E-Mail-Benachrichtigungen.

## Datenschutz & DSGVO

```env
# IP-Adressen nicht protokollieren (empfohlen für maximale Anonymität)
DISABLE_IP_LOGGING=true

# Abgeschlossene Fälle automatisch nach 90 Tagen löschen
AUTO_DELETE_CLOSED_CASES_DAYS=90
```

## Sicherheitseinstellungen

```env
# Maximale Dateigröße für Anhänge
MAX_UPLOAD_SIZE_MB=10

# Sitzungs-Timeout in Minuten (Standard: 60)
SESSION_TIMEOUT_MINUTES=60
```

## Weitere Informationen

Siehe auch:
- [Installation](installation.md)
- [FAQ](faq.md)
- [Architektur](ARCHITECTURE.md)
