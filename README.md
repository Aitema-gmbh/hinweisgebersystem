# aitema|Hinweis 🔒

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![GitHub Stars](https://img.shields.io/github/stars/Aitema-gmbh/hinweisgebersystem?style=social)](https://github.com/Aitema-gmbh/hinweisgebersystem/stargazers)
[![GitHub Issues](https://img.shields.io/github/issues/Aitema-gmbh/hinweisgebersystem)](https://github.com/Aitema-gmbh/hinweisgebersystem/issues)
[![GitHub Last Commit](https://img.shields.io/github/last-commit/Aitema-gmbh/hinweisgebersystem)](https://github.com/Aitema-gmbh/hinweisgebersystem/commits/main)
[![Docker Image](https://img.shields.io/badge/docker-ghcr.io-blue?logo=docker&logoColor=white)](https://ghcr.io/aitema-gmbh/hinweisgebersystem)
[![HinSchG konform](https://img.shields.io/badge/HinSchG-konform-green)](https://aitema.de/loesungen/hinweisgebersystem)
[![WCAG 2.1 AA](https://img.shields.io/badge/WCAG%202.1-AA-brightgreen)](https://aitema.de/barrierefreiheit/)
[![opencode.de](https://img.shields.io/badge/opencode.de-Kompatibel-0069B4)](https://opencode.de)

> **Open-Source Hinweisgebersystem** für Kommunen und Behörden — vollständig HinSchG-konform, DSGVO-sicher, selbst gehostet.

**[🌐 Website](https://aitema.de/loesungen/hinweisgebersystem) · [📖 Dokumentation](docs/installation.md) · [🐛 Issues](https://github.com/Aitema-gmbh/hinweisgebersystem/issues) · [💬 Diskussionen](https://github.com/Aitema-gmbh/hinweisgebersystem/discussions)**

---

## Was ist aitema|Hinweis?

aitema|Hinweis ist ein **kostenloses, Open-Source Hinweisgebersystem** (Whistleblower-System), das die Anforderungen des deutschen [Hinweisgeberschutzgesetzes (HinSchG)](https://www.gesetze-im-internet.de/hinschg/) und der EU-Richtlinie 2019/1937 vollständig erfüllt.

Das HinSchG verpflichtet Organisationen ab 50 Beschäftigten zur Einrichtung interner Meldestellen. Proprietäre Lösungen kosten ab 100 €/Monat — aitema|Hinweis ist kostenlos, transparent und selbst-hostbar.

### ✨ Features

| Feature | aitema\|Hinweis | Proprietäre Alternativen |
|---------|----------------|--------------------------|
| Preis | **Kostenlos** | 100–500 €/Monat |
| Selbst-hostbar | ✅ | ❌ |
| Quellcode-Audit | ✅ Jederzeit möglich | ❌ |
| DSGVO nachweisbar | ✅ Quellcode prüfbar | ⚠️ Nur vertraglich |
| Kein Vendor Lock-in | ✅ | ❌ |

- 🔒 **Vollständige Anonymität** — Tor-kompatibel, keine IP-Speicherung
- 📋 **HinSchG-konform** — Alle gesetzlichen Anforderungen erfüllt (EU 2019/1937)
- 🏛️ **DSGVO-sicher** — Kein Cloud-Anbieter, eigene Infrastruktur
- 🌐 **Mehrsprachig** — Deutsch und Englisch (i18n-ready)
- ♿ **Barrierefrei** — WCAG 2.1 AA / BITV 2.0 konform
- 🐳 **Docker-ready** — In 5 Minuten deployed
- 📊 **Dashboard** — Bearbeiter-Oberfläche mit Status-Tracking und Fristen
- ☕ **Quittungscode** — Hinweisgeber können Fallstatus anonym verfolgen

## 🚀 Quick Start



Öffne **http://localhost:4200** (Frontend) · **http://localhost:3000** (API)

Vollständige Installationsanleitung: [→ docs/installation.md](docs/installation.md)

## 📋 Anforderungen

- Docker ≥ 24.0 und Docker Compose v2
- 512 MB RAM (Minimum), 1 GB (empfohlen)
- PostgreSQL 15+ (via Docker oder extern)
- Optional: Kubernetes / Helm für Enterprise-Deployments

## 🏗️ Technologie

| Schicht | Technologie |
|---------|-------------|
| Frontend | Angular 17 |
| Backend | Node.js |
| Datenbank | PostgreSQL 15 |
| Deployment | Docker Compose / Helm |
| Lizenz | AGPL-3.0 |

## ⚙️ Kubernetes & Helm Deployment

Für Enterprise-Deployments steht eine vollständige Kubernetes-Infrastruktur bereit:



Vollständige Kubernetes-Dokumentation: [→ docs/kubernetes.md](docs/kubernetes.md)

## 📞 Support & Mitmachen

- **Bug melden:** [GitHub Issues](https://github.com/Aitema-gmbh/hinweisgebersystem/issues/new?template=bug-report.yml)
- **Feature anfragen:** [Feature-Request](https://github.com/Aitema-gmbh/hinweisgebersystem/issues/new?template=kommune-feature-request.yml)
- **Förderprojekt:** [Förderanfrage](https://github.com/Aitema-gmbh/hinweisgebersystem/issues/new?template=foerderprojekt.yml)
- **E-Mail:** kontakt@aitema.de
- **Website:** [aitema.de](https://aitema.de)

Aus einer Behörde? Wir freuen uns besonders über Feedback aus der Praxis!

## 📄 Lizenz

[GNU AGPLv3](LICENSE) — Open Source, Änderungen müssen veröffentlicht werden.

---

<p align="center">
  Made with ❤️ by <a href="https://aitema.de">aitema GmbH</a> &middot;
  <a href="https://github.com/Aitema-gmbh/hinweisgebersystem/stargazers">⭐ Star uns auf GitHub</a>
</p>
