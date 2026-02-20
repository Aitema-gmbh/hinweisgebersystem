# Beitragen zu aitema|Hinweisgebersystem

Herzlich willkommen! Wir freuen uns über jeden Beitrag zu diesem Open-Source-Projekt. Dieser Leitfaden erklärt, wie du dich beteiligen kannst.

## Inhaltsverzeichnis

- [Verhaltenskodex](#verhaltenskodex)
- [Erste Schritte](#erste-schritte)
- [Entwicklungsumgebung einrichten](#entwicklungsumgebung-einrichten)
- [Wie kann ich beitragen?](#wie-kann-ich-beitragen)
- [Pull Request Prozess](#pull-request-prozess)
- [Commit-Konventionen](#commit-konventionen)
- [Code-Stil](#code-stil)
- [Testen](#testen)

## Verhaltenskodex

Dieses Projekt folgt unserem [Verhaltenskodex](CODE_OF_CONDUCT.md). Durch deine Teilnahme verpflichtest du dich, diesen einzuhalten.

## Erste Schritte

1. **Fork** dieses Repository auf GitHub
2. **Clone** dein Fork: `git clone https://github.com/DEIN-USERNAME/hinweisgebersystem.git`
3. **Branch** erstellen: `git checkout -b feature/mein-feature`
4. Änderungen vornehmen und **testen**
5. **Commit** mit konventionellem Format: `git commit -m "feat: meine neue Funktion"`
6. **Push**: `git push origin feature/mein-feature`
7. **Pull Request** auf GitHub öffnen

## Entwicklungsumgebung einrichten

### Voraussetzungen
- Node.js 20+
- Docker und Docker Compose
- Git

### Installation

```bash
# Abhängigkeiten installieren
cd frontend && npm install

# Entwicklungsserver starten
npm run dev
```

Detaillierte Anleitung: [docs/deployment.md](docs/deployment.md)

## Wie kann ich beitragen?

### Bugs melden

Nutze das [Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.yml) auf GitHub.

**Bitte prüfe vorher**, ob das Issue bereits gemeldet wurde.

### Features vorschlagen

Nutze das [Feature Request Template](.github/ISSUE_TEMPLATE/feature_request.yml).

Beschreibe:
- Das Problem, das gelöst werden soll
- Deine vorgeschlagene Lösung
- Mögliche Alternativen

### Dokumentation verbessern

Verbesserungen der Dokumentation sind immer willkommen! Erstelle einfach einen PR.

### Sicherheitslücken

**Wichtig**: Sicherheitslücken bitte NICHT öffentlich auf GitHub melden!

Schicke eine E-Mail an: **security@aitema.de**

Weitere Informationen: [SECURITY.md](SECURITY.md)

## Pull Request Prozess

1. Aktualisiere die `CHANGELOG.md` mit einer Beschreibung deiner Änderungen
2. Stelle sicher, dass alle Tests erfolgreich sind: `npm test`
3. Stelle sicher, dass der Code lint-frei ist: `npm run lint`
4. Wähle das korrekte PR-Template aus
5. Warte auf mindestens ein Review von einem Maintainer
6. Adressiere alle Review-Kommentare
7. Halte deinen Branch aktuell mit: `git rebase main`

### Review-Kriterien

Dein PR wird akzeptiert, wenn:
- Alle automatischen Checks bestehen
- Code-Stil eingehalten wird
- Tests vorhanden und erfolgreich sind
- Dokumentation aktualisiert wurde (wenn nötig)
- Kein breaking change ohne Diskussion in einem Issue

## Commit-Konventionen

Wir nutzen [Conventional Commits](https://www.conventionalcommits.org/de/):

```
<typ>(<scope>): <beschreibung>

[optionaler body]

[optionaler footer]
```

### Typen

| Typ | Beschreibung |
|-----|-------------|
| `feat` | Neue Funktion |
| `fix` | Bug-Fix |
| `docs` | Dokumentation |
| `style` | Formatierung (kein Logik-Change) |
| `refactor` | Code-Refactoring |
| `test` | Tests hinzufügen/anpassen |
| `chore` | Build, Dependencies, Konfiguration |
| `perf` | Performance-Verbesserung |
| `ci` | CI/CD-Änderungen |

### Beispiele

```bash
feat(auth): add 2FA support for admin accounts
fix(reports): correct receipt code generation for edge case
docs(deployment): add Kubernetes deployment guide
chore(deps): update Angular to 18.3.0
```

## Code-Stil

- TypeScript strict mode aktiviert
- Prettier für Formatierung (`.prettierrc` in diesem Repo)
- ESLint für Code-Qualität
- Kommentare auf Deutsch oder Englisch (konsistent bleiben)

```bash
# Code formatieren
npm run format

# Lint-Fehler prüfen
npm run lint

# Lint-Fehler automatisch beheben
npm run lint:fix
```

## Testen

```bash
# Unit Tests
npm test

# E2E Tests (Playwright)
npm run test:e2e

# Load Tests (k6 erforderlich)
npm run test:load
```

**Anforderungen**: Jede neue Funktion muss mit Unit-Tests abgedeckt sein. Bug-Fixes sollten einen Regression-Test enthalten.

## Fragen?

- **GitHub Discussions**: [Diskutiere Ideen und stelle Fragen](https://github.com/Aitema-gmbh/hinweisgebersystem/discussions)
- **E-Mail**: [info@aitema.de](mailto:info@aitema.de)
- **Website**: [aitema.de](https://aitema.de)

Vielen Dank für deinen Beitrag!
