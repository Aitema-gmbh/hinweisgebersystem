# PRD: aitema GovTech Sprint Batch 3 – Februar 2026

**Datum:** 2026-02-21 | **Status:** Approved

---

## B1 – Semantische Volltext-Suche (aitema|RIS)

**Story:** Als Bürger/Stadtrat möchte ich "Schulbau 2019" suchen und auch Dokumente finden die "Grundschulneubau" oder "Bildungseinrichtung" enthalten – ohne den exakten Begriff kennen zu müssen.

**AK:**
- [ ] pgvector Extension in PostgreSQL aktivieren
- [ ] `embeddings` Spalte in Papers-Tabelle (vector(1536))
- [ ] Embedding-Generierung bei Paper-Erstellung/Update via Anthropic Embeddings API
- [ ] Batch-Job: bestehende Papers nachträglich embedden
- [ ] Neuer Endpunkt `POST /api/search/semantic` mit Query-Embedding + cosine similarity
- [ ] Frontend: Semantische Suche als Toggle neben Keyword-Suche ("Semantisch" Chip)
- [ ] Ergebnisse zeigen Relevanz-Score (0-100%) als Badge
- [ ] Fallback auf Elasticsearch wenn pgvector nicht verfügbar

**Basis:** PostgreSQL 16 (pgvector installierbar), Anthropic SDK bereits vorhanden  
**Library:** `pgvector` Python, `psycopg2`  
**Aufwand:** M

---

## B2 – No-Show-Scoring & Auto-Reminder (aitema|Termin)

**Story:** Als Amtsleiter möchte ich sehen welche Termine hohes No-Show-Risiko haben, damit ich rechtzeitig nachhaken kann – und das System sendet automatisch eine Extra-Erinnerung.

**AK:**
- [ ] Risk-Score 0-100 pro Buchung (Heuristik-basiert):
  - Buchungsvorlauf > 14 Tage: +20 Punkte
  - Montag 08:00-09:00 Uhr: +15 Punkte
  - Dienstag-Donnerstag Mittag: -10 Punkte
  - Keine Telefonnummer hinterlegt: +25 Punkte
  - Erste Buchung des Bürgers: +10 Punkte
  - Letzte-Minute-Buchung (< 2h vor Termin): +30 Punkte
- [ ] Score in Staff-Dashboard anzeigen (grün < 30, gelb 30-60, rot > 60)
- [ ] Auto-SMS/E-Mail wenn Score > 70 und Termin morgen (zusätzlich zur regulären Erinnerung)
- [ ] Endpunkt `GET /api/v1/bookings/:id/risk-score`
- [ ] Staff-Ansicht: Risiko-Badge pro Termin in Tagesübersicht

**Basis:** Booking-Daten in DB, SMS-Service bereits implementiert (Batch 1)  
**Aufwand:** S

---

## B3 – Mehrsprachigkeit aktivieren (aitema|Hinweis)

**Story:** Als nicht-deutschsprachiger Bürger möchte ich Hinweise in meiner Sprache einreichen können.

**AK:**
- [ ] Sprachen: Deutsch (DE), Englisch (EN), Türkisch (TR), Arabisch (AR), Russisch (RU)
- [ ] Sprachauswahl-Dropdown in Navigation + persistiert in localStorage
- [ ] Angular i18n: `@angular/localize` konfigurieren (Struktur bereits vorbereitet)
- [ ] Übersetzungsdateien: `messages.de.xlf`, `messages.en.xlf`, `messages.tr.xlf`, `messages.ar.xlf`, `messages.ru.xlf`
- [ ] Alle UI-Strings im Anonymous-Flow übersetzt (Submit + Status)
- [ ] RTL-Support für Arabisch (`dir="rtl"` wenn AR aktiv)
- [ ] Sprach-Flag-Icons im Switcher

**Basis:** i18n-Struktur bereits vorbereitet in Angular, `@angular/localize` installiert  
**Aufwand:** M

