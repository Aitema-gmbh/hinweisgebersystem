# PRD: aitema GovTech Sprint Batch 4 – Februar 2026

**Datum:** 2026-02-21 | **Status:** Approved

---

## C1 – Admin-Frontend RIS (aitema|RIS)

**Story:** Als RIS-Administrator möchte ich Gremien, Personen und Sitzungen über eine UI verwalten statt direkt per API.

**AK:**
- [ ] Route `/admin` mit Auth-Guard (nur für Admin-Rolle)
- [ ] CRUD für Gremien (Organisationen): Liste, Erstellen, Bearbeiten, Löschen
- [ ] CRUD für Personen: Liste, Erstellen, Bearbeiten, Mitgliedschaften verwalten
- [ ] Sitzungen verwalten: Erstellen, Tagesordnungspunkte hinzufügen, Status setzen
- [ ] Vorlagen einpflegen: Upload PDF/DOCX, Metadaten, Ausschuss zuordnen
- [ ] Mandanten-Einstellungen: Logo, Name, Kontakt
- [ ] Backend-API bereits vollständig vorhanden

**Basis:** Admin-API in FastAPI vorhanden (`/api/admin/`), React-Komponenten (Button/Card) aus Batch 1  
**Aufwand:** M

---

## C2 – Abstimmungs-Ergebnis-Anzeige (aitema|RIS)

**Story:** Als Bürger möchte ich Abstimmungsergebnisse von Ratssitzungen online einsehen.

**AK:**
- [ ] Sitzungs-Detail-Seite: Abstimmungsergebnisse pro Tagesordnungspunkt
- [ ] Darstellung: Doughnut-Chart (Ja/Nein/Enthaltung) + Zahlenwerte
- [ ] Namentliche Abstimmung: Tabelle Ratsmitglied → Votum (wenn öffentlich)
- [ ] Status-Badge: Angenommen / Abgelehnt / Zurückgestellt
- [ ] Backend: Workflow-API Voting-Endpunkte bereits vorhanden

**Basis:** Voting im Workflow-Service vorhanden, Chart.js via CDN nutzbar  
**Aufwand:** S

---

## C3 – Keycloak SSO für aitema|Hinweis Staff-Login

**Story:** Als Hinweis-Sachbearbeiter möchte ich mich mit demselben Account wie in anderen aitema-Produkten einloggen (Single Sign-On).

**AK:**
- [ ] Keycloak-Integration in Angular (keycloak-angular Bibliothek)
- [ ] Staff-Login-Route nutzt Keycloak statt eigenem Auth
- [ ] JWT-Token aus Keycloak für API-Calls verwenden
- [ ] Bestehende Bürger-Flows (anonym) bleiben unverändert
- [ ] Keycloak-Realm: bereits auf Server konfiguriert (für Termin)

**Basis:** Keycloak bereits für aitema|Termin konfiguriert, gleicher Realm  
**Library:** `keycloak-angular`, `keycloak-js`  
**Aufwand:** M

