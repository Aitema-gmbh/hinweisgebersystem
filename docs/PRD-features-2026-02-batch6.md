# PRD: aitema GovTech Sprint Batch 6 – Februar 2026

**Datum:** 2026-02-22 | **Status:** Approved

---

## E1 – RAG-Chat über Beschlüsse (aitema|RIS)

**Story:** Als Bürger möchte ich eine Frage über Ratsbeschlüsse stellen und eine sofortige, quellenbasierte Antwort erhalten.

**AK:**
- [ ] FastAPI RAG-Endpoint `POST /api/search/rag` mit pgvector Hybrid-Search (Elasticsearch + pgvector)
- [ ] Streaming-Antwort via Server-Sent Events (SSE)
- [ ] Antwort enthält immer Quellen-Links (Beschluss-URL, Datum, Gremium)
- [ ] LLM: Claude claude-haiku-4-5-20251001 via Anthropic API (DSGVO: kein Training auf Kommunaldaten)
- [ ] System-Prompt: Antworten nur aus Kontext (keine Halluzination), Deutsch, neutral
- [ ] Next.js: `/suche` Seite bekommt Chat-Tab neben Suchergebnissen
- [ ] Chat-UI: Streaming-Text, Quellen-Cards, "Neue Frage"-Button, Gesprächshistorie (Session)
- [ ] Fallback: "Keine relevanten Beschlüsse gefunden" wenn Ähnlichkeit < Threshold

**Basis:** pgvector + Elasticsearch bereits vorhanden (B1 Semantic Search), Anthropic API Key in .env  
**Aufwand:** M

---

## E2 – BITV 2.0 / WCAG 2.1 AA Barrierefreiheit (alle 3 Produkte)

**Story:** Als Nutzer mit Behinderung möchte ich alle aitema-Produkte barrierefrei nutzen können (Tastatur, Screen Reader, Kontrast).

**AK:**
- [ ] axe-core in alle Dev-Setups integrieren (`@axe-core/react` für RIS, `axe-core` für Hinweis/Termin)
- [ ] Skip-to-content Link auf jeder Seite
- [ ] Alle interaktiven Elemente: ARIA-Labels, role, aria-expanded, aria-live
- [ ] Farbkontrast: mindestens 4.5:1 für Text (WCAG AA)
- [ ] Fokus-Ringe sichtbar auf allen fokussierbaren Elementen
- [ ] Keyboard-Navigation: Tab-Reihenfolge logisch, kein Fokus-Trap außer Modals
- [ ] Alle Bilder/Icons: alt-Text oder aria-hidden="true"
- [ ] Formulare: label + error-Meldungen per aria-describedby verknüpft
- [ ] `lang="de"` auf html-Element gesetzt
- [ ] Lighthouse Accessibility Score ≥ 90 als CI-Gate (GitHub Actions)

**Basis:** React Aria in RIS vorhanden, Angular CDK a11y in Hinweis, SvelteKit semantic HTML  
**Aufwand:** M

---

## E3 – PWA + Web Push Notifications (aitema|RIS + aitema|Termin)

**Story:** Als Bürger möchte ich Push-Benachrichtigungen erhalten wenn neue Beschlüsse zu meinen Themen erscheinen.

**AK (RIS):**
- [ ] `next-pwa` / `@ducanh2912/next-pwa` Integration, manifest.json, Service Worker
- [ ] "App installieren"-Banner nach 30 Sekunden (dismissable, localStorage-State)
- [ ] Web Push API: VAPID-Keys generieren, in .env speichern
- [ ] DB: Tabelle `push_subscriptions` (endpoint, p256dh, auth, municipality_id, topics[])
- [ ] FastAPI: `POST /api/push/subscribe`, `DELETE /api/push/unsubscribe`
- [ ] Subscribe-Button auf Suchseite: "Benachrichtigung für '{Suchbegriff}'" 
- [ ] Background Job: nach OParl-Import → relevante Subscriptions finden → Push senden
- [ ] Push-Payload: Titel, Beschluss-Kurztext (50 Zeichen), URL

**AK (Termin):**
- [ ] SvelteKit PWA via `@vite-pwa/sveltekit`, manifest.json
- [ ] Push: "Termin morgen"-Reminder 24h vor Termin
- [ ] DB: `appointment_push_subscriptions` mit appointment_id

**Aufwand:** M (RIS), S (Termin)

---

## E4 – ICS Kalender-Export (aitema|RIS + aitema|Termin)

**Story:** Als Bürger möchte ich Ratssitzungen und meine Termine in meinen Kalender importieren.

**AK (RIS):**
- [ ] `GET /api/oparl/v1/sitzungen.ics` – alle Sitzungen der Kommune
- [ ] `GET /api/oparl/v1/gremium/{id}/sitzungen.ics` – pro Ausschuss
- [ ] `GET /api/suche?q={query}&format=ics` – thematischer Abo-Feed
- [ ] VEVENT: DTSTART, DTEND, SUMMARY, LOCATION, DESCRIPTION (Tagesordnung), URL
- [ ] UI: "Kalender abonnieren"-Button bei Sitzungslisten + Detail-Seiten
- [ ] iCal-Link ist dauerhaft (Feed-URL, nicht Download) für Kalender-Subscription

**AK (Termin):**
- [ ] Nach Buchung: ICS-Datei automatisch als E-Mail-Anhang
- [ ] `GET /api/termine/{token}/calendar.ics` – Download-Link in Bestätigungs-E-Mail
- [ ] VEVENT: Terminart, Standort, Adresse, Referenznummer

**Basis:** Python `icalendar` Library (MIT), Next.js Route Handler, Fastify Route  
**Aufwand:** S

---

## Implementierungsreihenfolge

1. **E4 (ICS)** – kleinste Einheit, sofort sichtbarer Nutzen, S
2. **E2 (BITV)** – läuft parallel auf allen 3 Repos, M  
3. **E3 (PWA+Push)** – nach E4, M
4. **E1 (RAG-Chat)** – größtes Feature, nach E2+E3, M

---

## Technische Basis

- RIS: `/opt/aitema/ratsinformationssystem` (Next.js 14 + FastAPI + pgvector)
- Hinweis: `/opt/aitema/hinweisgebersystem` (Angular 17 + Flask)
- Termin: `/opt/aitema/terminvergabe` (SvelteKit + Fastify + Prisma)
- Anthropic API Key: in .env vorhanden (`ANTHROPIC_API_KEY`)
- pgvector: bereits aktiviert + Embeddings-Tabelle aus B1

