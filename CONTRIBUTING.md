# Beitrag leisten zu aitema|Hinweis

Vielen Dank fuer dein Interesse! Wir freuen uns ueber Beitraege aller Art.

## Schnellstart fuer Entwickler

### Voraussetzungen
- Docker & Docker Compose
- Node.js 20+
- Git

### Lokale Entwicklungsumgebung
```bash
git clone https://github.com/Aitema-gmbh/hinweisgebersystem.git
cd hinweisgebersystem
cp .env.example .env
docker compose up -d
```

## Wie du beitragen kannst

### 1. Issues
- **Bug gefunden?** → [Bug-Report erstellen](https://github.com/Aitema-gmbh/hinweisgebersystem/issues/new?template=bug_report.md)
- **Feature-Idee?** → [Feature-Request erstellen](https://github.com/Aitema-gmbh/hinweisgebersystem/issues/new?template=feature_request.md)
- **Fuer Kommunen:** → [Kommune-Anfrage stellen](https://github.com/Aitema-gmbh/hinweisgebersystem/issues/new?template=kommune_anfrage.md)

### 2. Pull Requests

```bash
# Fork erstellen (GitHub UI)
git clone https://github.com/DEIN-USERNAME/hinweisgebersystem.git
git checkout -b feat/meine-verbesserung
# Aenderungen vornehmen
git commit -m feat: beschreibe deine Aenderung
git push origin feat/meine-verbesserung
# Pull Request auf GitHub erstellen
```

### 3. Commit-Konventionen

Wir folgen [Conventional Commits](https://www.conventionalcommits.org/de/):

| Prefix | Wann |
|--------|------|
|  | Neue Funktionalitaet |
|  | Fehlerbehebung |
|  | Dokumentation |
|  | Formatierung (keine Logik-Aenderung) |
|  | Code-Verbesserung ohne Feature/Fix |
|  | Tests hinzufuegen/aendern |
|  | Wartungsaufgaben (Dependencies etc.) |

### 4. Branch-Strategie

-  - Stabile Produktion
-  - Entwicklungsbranch (PRs hierhin)
-  - Feature-Branches
-  - Bugfix-Branches
-  - Kritische Fixes direkt auf main

## Tests ausfuehren

```bash
# Unit Tests
npm test

# E2E Tests (Playwright)
npm run test:e2e

# Linting
npm run lint

# Type-Check
npm run type-check
```

## Code-Stil

- **TypeScript** ueberall (kein  wenn vermeidbar)
- **ESLint + Prettier** - Automatisch via Pre-commit-Hook
- **Kommentare** auf Deutsch (Code-Identifikatoren Englisch)
- **Barrierefreiheit** - WCAG 2.1 AA fuer alle UI-Aenderungen

## Sicherheit

Sicherheitsluecken bitte NICHT als oeffentliches Issue melden!
→ E-Mail an: security@aitema.de (PGP-Schluessel auf Anfrage)

Oder nutze [GitHub Security Advisories](https://github.com/Aitema-gmbh/hinweisgebersystem/security/advisories/new).

## Lizenz

Mit deinem Beitrag stimmst du zu, dass dieser unter der [AGPL-3.0](LICENSE) Lizenz veroeffentlicht wird.

## Fragen?

- [GitHub Discussions](https://github.com/Aitema-gmbh/hinweisgebersystem/discussions)
- E-Mail: community@aitema.de
- Matrix: #aitema:matrix.org (demnaechst)

---

*Vielen Dank, dass du aitema besser machst!*
