<div align="center">

# aitema|Hinweis

**Anonymes Hinweisgebersystem — HinSchG-konform, Open Source, selbst-gehostet**

[![MIT License](https://img.shields.io/badge/Lizenz-MIT-22c55e?style=flat-square)](LICENSE)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-hinweis.aitema.de-3b82f6?style=flat-square)](https://hinweis.aitema.de)
[![Angular](https://img.shields.io/badge/Angular-18-dd0031?style=flat-square&logo=angular)](https://angular.dev)
[![HinSchG](https://img.shields.io/badge/HinSchG-konform-ef4444?style=flat-square)](https://www.gesetze-im-internet.de/hinschg/)
[![DSGVO](https://img.shields.io/badge/DSGVO-konform-16a34a?style=flat-square)](https://dsgvo-gesetz.de)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ed?style=flat-square&logo=docker)](docker-compose.quickstart.yml)

[**→ Live Demo**](https://hinweis.aitema.de) · [**Dokumentation**](docs/) · [**Bug melden**](https://github.com/Aitema-gmbh/hinweisgebersystem/issues) · [**Feature anfragen**](https://github.com/Aitema-gmbh/hinweisgebersystem/discussions)

</div>

---

## Was ist aitema|Hinweis?

aitema|Hinweis ist ein vollständiges, selbst-gehostetes **Hinweisgeberschutzsystem** nach dem deutschen HinSchG (Hinweisgeberschutzgesetz). Behörden und Unternehmen ab 50 Mitarbeitenden sind seit 2023 gesetzlich verpflichtet, eine sichere interne Meldestelle anzubieten.

Dieses System läuft **komplett auf eurer eigenen Infrastruktur** — keine Cloud, keine SaaS-Abhängigkeit, keine Datenweitergabe an Dritte.

> **Warum Open Source?** Vertrauen entsteht durch Transparenz. Wer Hinweisgebern Anonymität verspricht, muss zeigen, wie das technisch umgesetzt ist — nicht nur versprechen.

---

## Features

### 🏛️ Für Hinweisgebende (Bürger & Beschäftigte)

| Feature | Details |
|---------|---------|
| **Vollständige Anonymität** | Kein Account, keine E-Mail, keine IP-Logs |
| **Belegnummer-System** | Meldung jederzeit anonym nachverfolgen |
| **Anonymer Nachrichtenkanal** | Rückfragen ohne Identitätspreisgabe beantworten |
| **Datei-Upload** | Beweisdokumente anhängen (Metadaten werden automatisch entfernt) |
| **Mehrsprachig** | Deutsch, Englisch, Türkisch, Russisch |

### 👤 Für Ombudspersonen & Sachbearbeiter

| Feature | Details |
|---------|---------|
| **Case-Management** | Vollständige Fallverwaltung (Öffnen → Bearbeiten → Abschließen) |
| **Fristenmanagement** | HinSchG: 7 Tage Eingangsbestätigung, 3 Monate Rückmeldung — automatisch |
| **Keycloak SSO** | Single Sign-On für Staff (4 Rollen: Admin, Ombudsperson, Bearbeiter, Auditor) |
| **Compliance-Dashboard** | Status-Übersicht, Fristkalender, Bearbeitungshistorie |
| **Metadaten-Strip** | Automatische Bereinigung von PDF/Bild-Metadaten bei Upload |

---

## HinSchG-Compliance

| Gesetzliche Anforderung | Status |
|------------------------|--------|
| Interne Meldestelle für Unternehmen ≥ 50 MA | ✅ |
| Anonyme Meldung technisch möglich | ✅ |
| Eingangsbestätigung innerhalb 7 Tagen | ✅ automatisch |
| Abschlussmitteilung binnen 3 Monaten | ✅ Fristkalender |
| Vertraulichkeit der Hinweisgeberidentität | ✅ kryptographisch |
| Dokumentation (keine Repressalien) | ✅ Audit-Trail |

---

## Tech-Stack

```
Frontend:   Angular 18 (Standalone Components)
Backend:    Node.js + Express
Datenbank:  PostgreSQL 16
Auth:       Keycloak OIDC/PKCE (Staff) + anonym (Bürger)
Deploy:     Docker Compose + Traefik + Let's Encrypt
```

---

## Schnellstart (5 Minuten)

```bash
git clone https://github.com/Aitema-gmbh/hinweisgebersystem.git
cd hinweisgebersystem

# Konfiguration
cp .env.example .env
# .env anpassen (Datenbank-Passwort, Domain, etc.)

# Starten
docker compose -f docker-compose.quickstart.yml up -d
```

Die App ist dann unter `http://localhost:3000` erreichbar.

**Für Produktion mit eigenem Domain:**

```bash
# Domain in .env setzen, dann:
docker compose -f docker-compose.traefik.yml up -d
```

→ Vollständige Anleitung: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

---

## Architektur

```
hinweis.aitema.de
├── /              →  Angular App (öffentlich)
├── /melden        →  Anonymes Meldeformular (5 Schritte)
├── /status        →  Fallstatus per Belegnummer prüfen
├── /login         →  Keycloak SSO (nur Staff)
└── /dashboard     →  Case-Management (authentifiziert)
    ├── Posteingang: aktive Fälle
    ├── Fristenkalender
    └── Audit-Log

Backend (Node.js REST API)
├── POST /api/v1/cases          →  Neue Meldung
├── GET  /api/v1/cases/:token   →  Status per Belegnummer
├── POST /api/v1/messages       →  Anonyme Antwort
└── GET  /api/v1/dashboard/*    →  Staff-Endpunkte (Keycloak-geschützt)
```

---

## Deployment (Produktion)

Das System läuft auf einem einzelnen Linux-Server mit Docker.

```bash
# Voraussetzungen: Docker, eigene Domain, A-Record auf Server zeigend

git clone https://github.com/Aitema-gmbh/hinweisgebersystem.git
cd hinweisgebersystem
cp .env.prod.example .env
# .env befüllen (DOMAIN, DB_PASSWORD, KEYCLOAK_SECRET, ...)

docker compose -f docker-compose.traefik.yml up -d
```

Traefik holt automatisch Let's Encrypt Zertifikate. Keine manuelle SSL-Konfiguration nötig.

→ [Detaillierte Server-Anleitung](docs/DEPLOYMENT.md)

---

## Roadmap

- [x] Anonyme Meldung (HinSchG-konform)
- [x] Keycloak SSO für Staff
- [x] Fristenmanagement (7-Tage / 3-Monats-Regel)
- [x] Datei-Upload mit Metadaten-Bereinigung
- [x] Mehrsprachigkeit (DE, EN, TR, RU)
- [ ] E-Mail-Benachrichtigungen für Staff (optional, DSGVO-konform)
- [ ] SAML 2.0 (für Behörden mit eigenem Identity Provider)
- [ ] BSI IT-Grundschutz Dokumentation
- [ ] Barrierefreiheit BITV 2.0 AA (aktuell in Arbeit)

Ideen und Feature-Requests → [GitHub Discussions](https://github.com/Aitema-gmbh/hinweisgebersystem/discussions)

---

## Beitragen

Beiträge sind willkommen — von Bugfixes bis zu neuen Features.

```bash
# 1. Fork + Clone
git clone https://github.com/DEIN-USERNAME/hinweisgebersystem.git

# 2. Feature-Branch
git checkout -b feat/mein-feature

# 3. Entwickeln, testen, committen
git commit -m "feat: kurze Beschreibung"

# 4. Pull Request öffnen
```

→ Vollständige Anleitung: [CONTRIBUTING.md](CONTRIBUTING.md)  
→ Verhaltenskodex: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)  
→ Sicherheitslücken melden: [SECURITY.md](SECURITY.md)

**Gute Einstiegspunkte** für neue Beitragende: Issues mit dem Label [`good first issue`](https://github.com/Aitema-gmbh/hinweisgebersystem/issues?q=label%3A%22good+first+issue%22)

---

## Lizenz

MIT — frei nutzbar, auch für kommerzielle Zwecke und Behörden.

```
Copyright (c) 2025 aitema GmbH
```

Vollständiger Lizenztext: [LICENSE](LICENSE)

---

<div align="center">

Entwickelt von [aitema GmbH](https://aitema.de) · AI Innovation for Public Sector  
[aitema.de](https://aitema.de) · [datenschutz@aitema.de](mailto:datenschutz@aitema.de)

*GovTech aus Deutschland — für Deutschland.*

</div>
