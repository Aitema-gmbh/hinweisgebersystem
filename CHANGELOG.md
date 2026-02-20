# Changelog

Alle wesentlichen Änderungen an aitema|Hinweis werden in dieser Datei dokumentiert.
Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.1.0/).
Versionierung nach [Semantic Versioning](https://semver.org/).

## [Unveröffentlicht]

## [1.0.0] – 2025-01-01

### Hinzugefügt
- Anonyme Meldungseinreichung gemäß HinSchG (Hinweisgeberschutzgesetz)
- Verschlüsselte Zwei-Wege-Kommunikation zwischen Hinweisgebern und Bearbeitern
- Vollständiger Audit-Trail für alle Vorgänge (Dokumentationspflicht §§ 11–13 HinSchG)
- Rollenbasierte Zugriffsverwaltung (Bearbeiter, Administrator)
- Animierter Step-Indicator für den Einreichungsprozess
- Hero-Banner mit Gradient-Hintergrund und Glassmorphism-Karten
- Status-Timeline mit animierten Knotenpunkten
- Nachrichtenansicht im Chat-Stil (anonym / Sachbearbeiter)
- Dark-Mode-Unterstützung via 
- Dashboard mit Statistiken und Fristüberwachung
- Mehrsprachige Oberfläche (Deutsch und Englisch)
- Modernes UI mit aitema Design-System (Inter-Font, Navy/Blue/Accent-Palette)
- Docker-Compose-Deployment (Installation in unter 30 Minuten)
- publiccode.yml für opencode.de-Kompatibilität
- OpenAPI 3.1 Spezifikation
- System-Architektur-Dokumentation
- Vollständige Installationsanleitung, FAQ und Umgebungsvariablen-Referenz
- Sicherheitsrichtlinie (SECURITY.md) und Förderinformationen
- Issue-Templates für Kommunen, Fehlerberichte und Förderanfragen
- Renovate-Bot für automatische Dependency-Updates
- CONTRIBUTING.md mit Entwickler-Richtlinien
- Conventional Commits + Semantic Release Konfiguration
- GitHub Actions CI/CD-Pipeline

### Technischer Stack
- **Frontend:** Angular 17, Bootstrap 5, TypeScript
- **Backend:** Java / Spring Boot 3.x (via GlobaLeaks)
- **Datenbank:** PostgreSQL 14+
- **Deployment:** Docker Compose
- **Lizenz:** AGPL-3.0

[Unveröffentlicht]: https://github.com/Aitema-gmbh/hinweisgebersystem/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Aitema-gmbh/hinweisgebersystem/releases/tag/v1.0.0
