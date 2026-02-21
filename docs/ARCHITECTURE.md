# aitema|Hinweis – Architektur

## System-Übersicht

```
┌──────────────────────────────────────────────────────┐
│                 hinweis.aitema.de                     │
│               Traefik Reverse Proxy                   │
└────────┬──────────────────┬────────────────────────────┘
         │                  │
  ┌──────▼──────┐    ┌──────▼──────┐
  │  Angular 17 │    │    Flask    │
  │  Frontend   │    │   Backend   │
  │  :4200      │    │   :5000     │
  └──────┬──────┘    └──────┬──────┘
         │                  │
  ┌──────▼──────────────────▼──────┐
  │          PostgreSQL 16          │
  │       + Redis (Celery-Broker)  │
  └────────────────────────────────┘
```

## Komponenten

| Komponente | Technologie | Port | Beschreibung |
|------------|------------|------|--------------|
| Frontend | Angular 17 | :4200 | Bürger-App + Staff-Dashboard |
| Backend API | Flask (Python) | :5000 | REST API, Anonymisierung |
| Task Queue | Celery + Redis | :6379 | Fristen, Benachrichtigungen |
| Datenbank | PostgreSQL 16 | :5432 | Fälle, Nachrichten |
| Auth | Keycloak | :8080 | SSO für Staff (4 Rollen) |
| Analytics | Plausible | :8888 | Cookiefrei, DSGVO |

## Datenfluss: Anonyme Meldung

```
Bürger öffnet /melden (kein Login, keine IP-Speicherung)

Schritt 1: Kategorie wählen (Korruption, Betrug, etc.)
Schritt 2: Beschreibung eingeben (Freitext)
Schritt 3: Dateien anhängen (optional)
           └── Celery-Job: EXIF-Strip, Metadaten-Strip
Schritt 4: Zusammenfassung prüfen
Schritt 5: Absenden

POST /api/v1/cases
  ├── Belegnummer generieren (UUID, dem Bürger angezeigt)
  ├── Meldung in PostgreSQL speichern
  ├── Celery: Frist berechnen (7-Tage + 3-Monate)
  └── Celery: Ombudsperson per E-Mail benachrichtigen

→ Bürger erhält Belegnummer (Screenshot/Notieren)
```

## Datenfluss: Statusabfrage (anonym)

```
Bürger öffnet /status
→ Belegnummer eingeben
→ GET /api/v1/cases/status/:token
→ Fallstatus anzeigen: OFFEN | IN_BEARBEITUNG | ABGESCHLOSSEN
→ Nachrichten des Sachbearbeiters lesen
→ Antwort senden (anonym, verschlüsselt)
```

## Verschlüsselung & Anonymität

```
Meldungsinhalte:
  ├── Symmetrisch verschlüsselt (AES-256-GCM)
  ├── Schlüssel: abgeleitet aus Belegnummer (PBKDF2)
  └── Nur Bürger (mit Belegnummer) kann entschlüsseln

Nachrichten-Kanal:
  ├── Ende-zu-Ende zwischen Bürger und Sachbearbeiter
  ├── Backend sieht nur verschlüsselte Blobs
  └── Kein Klartext in Datenbank

IP-Adressen:
  └── Nginx: access_log off für /melden und /status
```

## Metadaten-Strip (Celery Jobs)

```python
# Bilder: Pillow
from PIL import Image
img = Image.open(upload)
img_clean = Image.new(img.mode, img.size)
img_clean.putdata(list(img.getdata()))
img_clean.save(output)  # Kein EXIF

# PDFs: pypdf
from pypdf import PdfReader, PdfWriter
writer = PdfWriter()
for page in PdfReader(upload).pages:
    writer.add_page(page)
writer.add_metadata({})  # Metadaten löschen
```

## Fristenmanagement (HinSchG)

```
Nach Eingang der Meldung:
  ├── +7 Tage:  Eingangsbestätigung an Bürger (Pflicht §17 HinSchG)
  ├── +3 Monate: Abschlussmitteilung (Pflicht §17 HinSchG)
  └── Celery Beat: täglicher Check, Erinnerungen an Sachbearbeiter

Status-Automaten:
  EINGEGANGEN → IN_PRÜFUNG → IN_BEARBEITUNG → ABGESCHLOSSEN
                                            └→ NICHT_ZUSTÄNDIG
```

## Keycloak-Rollen

| Rolle | Berechtigungen |
|-------|---------------|
| Admin | Alle Fälle, Konfiguration, Mandanten |
| Ombudsperson | Alle Fälle lesen + bearbeiten |
| Fallbearbeiter | Zugewiesene Fälle bearbeiten |
| Auditor | Read-only, Reporting |

## Datenbankschema (Kernentitäten)

```
Case (Hinweisgeberfall)
  ├── token: UUID (Belegnummer des Bürgers)
  ├── category: ENUM
  ├── status: EINGEGANGEN | IN_PRÜFUNG | IN_BEARBEITUNG | ABGESCHLOSSEN
  ├── content_encrypted: BYTEA
  ├── deadline_7d: TIMESTAMP
  ├── deadline_3m: TIMESTAMP
  ├── attachments: Attachment[]
  └── messages: Message[]

Message (Anonymer Kommunikationskanal)
  ├── caseId
  ├── sender: BUERGER | SACHBEARBEITER
  ├── content_encrypted: BYTEA
  └── createdAt: TIMESTAMP

Attachment (Dateianlage)
  ├── caseId
  ├── filename_original (gestripped)
  ├── mimetype
  └── storage_path (lokal, kein Cloud)
```

## Deployment (Hetzner)

```
/opt/aitema/hinweisgebersystem/
├── docker-compose.yml
├── docker-compose.prod.yml
├── docker-compose.traefik.yml
├── nginx/
│   └── nginx.conf          # access_log off für Bürger-Routes
└── .env.production
```

## Sicherheit

- **HTTPS**: Traefik + Let's Encrypt
- **Keine IP-Logs**: Nginx-Konfiguration für /melden, /status
- **CSP-Header**: Strict Content Security Policy
- **File Upload**: Max 10 MB, Whitelist: PDF, JPG, PNG, DOCX
- **Rate Limiting**: Flask-Limiter (10 Meldungen/Stunde pro IP)
- **Audit Log**: Alle Staff-Aktionen protokolliert (Wer hat was wann gesehen)
