# aitema|Hinweis

**HinSchG-konformes Hinweisgebersystem fuer deutsche Kommunen**

Open-Source-Loesung basierend auf GlobaLeaks, erweitert um die Anforderungen des deutschen Hinweisgeberschutzgesetzes (HinSchG).

## Features

### HinSchG-Compliance
- **Fristenmanagement**: Automatische 7-Tage-Eingangsbestaetigung und 3-Monate-Rueckmeldung (§8 HinSchG)
- **Fallbearbeitung**: Vollstaendiger Workflow von Eingang bis Archivierung (§17)
- **Ombudsperson-Verwaltung**: Interne und externe Meldestellen (§15)
- **Compliance-Reporting**: Automatische Jahresberichte (§27)
- **Datenloeschung**: Automatische Aufbewahrungsfristenueberwachung (§11)
- **Mehrkanal-Meldesystem**: Online, telefonisch, persoenlich, Post (§16)

### Technisch
- **Multi-Tenant**: Mandantenfaehig fuer IT-Zweckverbaende
- **Zero-Knowledge-Verschluesselung**: Basierend auf GlobaLeaks-Kryptografie
- **Barrierefreiheit**: BITV 2.0 / WCAG 2.1 AA konform
- **BSI-konform**: IT-Grundschutz kompatible Sicherheitskonfiguration
- **Tor-Support**: Anonyme Meldungen ueber Tor Hidden Service

### COSS-Modell
- **Community Edition**: Kostenlos, Self-Hosted, AGPLv3
- **Managed Hosting**: BSI-konform auf deutschen Servern
- **Enterprise**: SLA, Support, Schulungen, Integration

## Schnellstart

```bash
# Repository klonen
git clone https://github.com/aitema/hinweis.git
cd hinweis

# Umgebungsvariablen konfigurieren
cp .env.example .env

# Entwicklungsumgebung starten
make dev

# Tests ausfuehren
make test-hinschg
```

## API-Endpoints

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET | /api/hinschg/dashboard | Dashboard-Daten |
| GET | /api/hinschg/cases | Faelle auflisten |
| POST | /api/hinschg/cases | Neuen Fall anlegen |
| GET | /api/hinschg/cases/:id | Fall-Details |
| PUT | /api/hinschg/cases/:id | Fall aktualisieren |
| POST | /api/hinschg/cases/:id/status | Status aendern |
| GET | /api/hinschg/fristen | Fristenuebersicht |
| GET | /api/hinschg/reports | Compliance-Berichte |
| POST | /api/hinschg/reports | Bericht generieren |
| GET | /api/hinschg/ombudspersonen | Ombudspersonen |
| POST | /api/hinschg/ombudspersonen | Ombudsperson anlegen |

## Architektur

```
┌─────────────────────────────────────────────┐
│                  Nginx                       │
│            (Reverse Proxy, TLS)              │
├─────────────────┬───────────────────────────┤
│   Angular 17+   │    GlobaLeaks Backend     │
│   (Frontend)    │    (Python/Twisted)       │
│                 ├───────────────────────────┤
│   - Dashboard   │  HinSchG Extensions:      │
│   - Fallmgmt    │  - Models (Case, Frist)   │
│   - Fristen     │  - Services (Compliance)  │
│   - Reports     │  - Handlers (REST API)    │
│   - Admin       │  - Jobs (Deadline Check)  │
├─────────────────┴───────────────────────────┤
│              SQLite (per Tenant)             │
│              Redis (Cache/Session)           │
└─────────────────────────────────────────────┘
```

## Lizenz

AGPLv3 - Kompatibel mit GlobaLeaks upstream.

## Kontakt

**aitema GmbH**
- Web: https://aitema.de
- E-Mail: hinweis@aitema.de
