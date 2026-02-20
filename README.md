# aitema|Hinweis – Open-Source-Hinweisgeberschutzsystem

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![GitHub Stars](https://img.shields.io/github/stars/Aitema-gmbh/hinweisgebersystem?style=social)](https://github.com/Aitema-gmbh/hinweisgebersystem/stargazers)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://github.com/Aitema-gmbh/hinweisgebersystem/pkgs/container/hinweisgebersystem)
[![opencode.de](https://img.shields.io/badge/opencode.de-Kompatibel-0069B4)](https://opencode.de)
[![HinSchG](https://img.shields.io/badge/HinSchG-konform-green)](https://aitema.de/loesungen/hinweisgebersystem)
[![API Docs](https://img.shields.io/badge/API-Dokumentation-orange)](https://aitema.de/api-docs/hinweisgebersystem)

Das einzige vollständig quelloffene Hinweisgeberschutzsystem für deutsche Kommunen und Behörden – DSGVO-konform, selbst-hostbar, kostenlos.

## 🏛️ Warum aitema|Hinweis?

Das [Hinweisgeberschutzgesetz (HinSchG)](https://www.gesetze-im-internet.de/hinschg/) verpflichtet Organisationen ab 50 Beschäftigten zur Einrichtung interner Meldestellen. Proprietäre Lösungen kosten ab 100 €/Monat – aitema|Hinweis ist kostenlos, transparent und selbst-hostbar.

| Feature | aitema\|Hinweis | Proprietäre Alternativen |
|---------|---------------|-------------------------|
| Preis | **Kostenlos** | 100–500 €/Monat |
| Selbst-hostbar | ✅ | ❌ |
| Quellcode-Audit | ✅ Jederzeit möglich | ❌ |
| DSGVO nachweisbar | ✅ Quellcode prüfbar | ⚠️ Nur vertraglich |
| Kein Vendor Lock-in | ✅ | ❌ |

## 🚀 Schnellstart (Docker)

```bash
git clone https://github.com/Aitema-gmbh/hinweisgebersystem.git
cd hinweisgebersystem
cp .env.example .env  # Konfiguration anpassen
docker compose up -d
```

Öffne http://localhost:3000 – fertig!

**Vollständige Installationsanleitung:** → [docs/installation.md](docs/installation.md)

## ✨ Funktionen

- **Anonyme Hinweisgabe** – Keine Registrierung, keine IP-Protokollierung
- **Verschlüsselte Kommunikation** – Ende-zu-Ende zwischen Hinweisgeber und Meldestelle
- **Case-Management-Dashboard** – Vollständige Fallbearbeitung für interne Meldestellen
- **Quittungscode-System** – Hinweisgeber können Fallstatus anonym verfolgen
- **Mehrsprachig** – Deutsch, weitere Sprachen konfigurierbar
- **Kategorisierung** – Korruption, Datenschutz, Arbeitssicherheit, und mehr
- **Fristen-Tracking** – Automatische Erinnerungen für gesetzliche Bearbeitungsfristen

## 🏗️ Technologie

| Schicht | Technologie |
|---------|-------------|
| Frontend | Angular 17 |
| Backend | Node.js |
| Datenbank | PostgreSQL 15 |
| Deployment | Docker Compose |
| Lizenz | AGPL-3.0 |

## 📋 Anforderungen

- Docker ≥ 24.0
- Docker Compose ≥ 2.0
- PostgreSQL 15 (oder als Docker-Container)
- Mindestens 2 GB RAM, 10 GB Speicher

## 📞 Support & Mitmachen

- **Bug melden:** [GitHub Issues](https://github.com/Aitema-gmbh/hinweisgebersystem/issues/new?template=bug-report.yml)
- **Feature anfragen:** [Feature-Request](https://github.com/Aitema-gmbh/hinweisgebersystem/issues/new?template=kommune-feature-request.yml)
- **Förderprojekt:** [Förderanfrage](https://github.com/Aitema-gmbh/hinweisgebersystem/issues/new?template=foerderprojekt.yml)
- **Kontakt:** kontakt@aitema.de

Aus einer Behörde? Wir freuen uns besonders über Feedback aus der Praxis!

## 📄 Lizenz

AGPL-3.0 © aitema GmbH

---

*Entwickelt mit ❤️ in Deutschland | [aitema.de](https://aitema.de)*
