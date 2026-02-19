# aitema|Hinweis

**HinSchG-konformes Hinweisgebersystem** - basierend auf einem GlobaLeaks-Fork.

Datenschutzkonformes, sicheres und barrierefreies Meldesystem fuer Organisationen aller Groessen zur Erfuellung der Anforderungen des Hinweisgeberschutzgesetzes (HinSchG).

## Funktionen

- Anonyme und nicht-anonyme Meldungsabgabe
- AES-256-GCM Verschluesselung (Zero-Knowledge-Architektur)
- HinSchG-konforme Fristenverwaltung (7 Tage / 3 Monate)
- Multi-Tenant-Faehigkeit (DB-per-Tenant, Schema, Row-Level)
- Rollenbasierte Zugriffskontrolle (Ombudsperson, Fallbearbeiter, Admin, Melder, Auditor)
- Fall-Workflow mit Status-Management
- Revisionssicherer Audit-Trail
- Barrierefreiheit nach WCAG 2.1 AA / BITV 2.0
- BSI-Grundschutz konforme Sicherheitseinstellungen
- Optionaler Tor Hidden Service
- REST-API mit JWT-Authentifizierung und MFA

## Technologie-Stack

| Komponente | Technologie |
|------------|-------------|
| Backend | Python 3.12, Flask, Twisted (GlobaLeaks-Fork) |
| Frontend | Angular 17+, Angular Material |
| Datenbank | PostgreSQL 16 (Multi-Tenant) |
| Cache | Redis 7 |
| Async Tasks | Celery |
| Proxy | Nginx |
| Container | Docker Compose |

## Schnellstart

```bash
# Repository klonen
git clone https://github.com/aitema/hinweisgebersystem.git
cd hinweisgebersystem

# Konfiguration erstellen
cp .env.example .env
# .env anpassen (Passwoerter setzen\!)

# Entwicklungsumgebung starten
make dev

# Oeffne http://localhost:80
```

## Entwicklung

```bash
make dev          # Entwicklungsumgebung starten
make test         # Alle Tests ausfuehren
make lint         # Code-Qualitaet pruefen
make logs         # Logs anzeigen
make shell        # Shell im Backend-Container
make shell-db     # PostgreSQL-Shell
```

## Production Deployment

```bash
# .env mit sicheren Werten konfigurieren
# TLS-Zertifikate in nginx/ssl/ ablegen
make deploy
```

## HinSchG-Compliance

Das System implementiert die Anforderungen des Hinweisgeberschutzgesetzes:

- **Paragraf 8**: Vertraulichkeit der Identitaet
- **Paragraf 16 Abs. 1**: Anonyme Meldungen moeglich
- **Paragraf 17 Abs. 1**: Eingangsbestaetigung innerhalb von 7 Tagen
- **Paragraf 17 Abs. 2**: Rueckmeldung innerhalb von 3 Monaten
- **Paragraf 11 Abs. 5**: Aufbewahrung 3 Jahre nach Abschluss
- **Paragraf 36**: Repressalienverbot

## Lizenz

AGPLv3 - siehe [LICENSE](LICENSE) Datei.

Kompatibel mit der GlobaLeaks-Lizenz (AGPLv3).

## COSS-Lizenz-Modell

**aitema|Hinweis** nutzt ein Commercial Open Source Software (COSS) Modell:
- **Community Edition**: AGPLv3, voller Funktionsumfang
- **Enterprise Edition**: Zusaetzliche Features (SSO, erweiterte Reports, SLA-Support)

---

Entwickelt von [aitema GmbH](https://aitema.de)
