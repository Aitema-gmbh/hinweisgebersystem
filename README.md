# aitema|Hinweis – Open-Source-Hinweisgeberschutzsystem

![GitHub License](https://img.shields.io/github/license/Aitema-gmbh/hinweisgebersystem?style=flat-square&color=blue)
![GitHub Stars](https://img.shields.io/github/stars/Aitema-gmbh/hinweisgebersystem?style=flat-square)
![GitHub Issues](https://img.shields.io/github/issues/Aitema-gmbh/hinweisgebersystem?style=flat-square)
![publiccode.yml](https://img.shields.io/badge/publiccode-0.4-brightgreen?style=flat-square)
![HinSchG konform](https://img.shields.io/badge/HinSchG-konform-blue?style=flat-square)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker&logoColor=white)


[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![GitHub Stars](https://img.shields.io/github/stars/Aitema-gmbh/hinweisgebersystem)](https://github.com/Aitema-gmbh/hinweisgebersystem/stargazers)
[![Made in Germany](https://img.shields.io/badge/Made_in-Germany-black)](https://aitema.de)

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
