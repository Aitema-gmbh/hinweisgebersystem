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



## Kubernetes & Helm Deployment

Fuer Enterprise-Deployments mit Kubernetes steht eine vollstaendige Infrastruktur bereit:

### Schnellstart mit kubectl

```bash
# Namespace anlegen
kubectl apply -f deploy/kubernetes/namespace.yaml

# Secrets erstellen (Beispiel-Datei anpassen!)
# cp deploy/kubernetes/secret.yaml.example deploy/kubernetes/secret.yaml
# vim deploy/kubernetes/secret.yaml  # Werte anpassen
kubectl create secret generic hinweis-secrets \\
  --namespace=aitema-hinweis \\
  --from-literal=postgres-db=hinweis_db \\
  --from-literal=postgres-user=hinweis_user \\
  --from-literal=postgres-password=$(openssl rand -hex 32) \\
  --from-literal=database-url="postgresql://hinweis_user:PASS@postgres:5432/hinweis_db" \\
  --from-literal=jwt-secret=$(openssl rand -hex 32) \\
  --from-literal=encryption-key=$(openssl rand -hex 16)

# Alle Manifeste anwenden
kubectl apply -f deploy/kubernetes/
```

### Schnellstart mit Helm

```bash
# Helm-Chart installieren
helm install aitema-hinweis ./deploy/helm \\
  --namespace aitema-hinweis \\
  --create-namespace \\
  --set ingress.host=hinweis.ihre-kommune.de \\
  --set existingSecret=hinweis-secrets

# Mit eigener values-Datei (empfohlen fuer Produktion)
cp deploy/helm/values.yaml my-values.yaml
helm install aitema-hinweis ./deploy/helm \\
  --namespace aitema-hinweis \\
  --create-namespace \\
  -f my-values.yaml
```

### Verzeichnisstruktur

```
deploy/
├── kubernetes/          # Raw Kubernetes Manifeste
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secret.yaml.example
│   ├── postgres/        # Datenbank-Deployment
│   ├── backend/         # API-Server
│   ├── frontend/        # Web-Oberflaeche
│   └── ingress.yaml     # HTTPS-Routing mit cert-manager
└── helm/                # Helm Chart fuer Enterprise
    ├── Chart.yaml
    ├── values.yaml      # Konfiguration anpassen!
    └── templates/
```

Vollstaendige Dokumentation: [docs/kubernetes.md](docs/kubernetes.md)

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
