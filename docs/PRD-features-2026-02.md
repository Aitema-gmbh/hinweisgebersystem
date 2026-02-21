# PRD: aitema GovTech Feature Sprint – Februar 2026

**Datum:** 2026-02-21  
**Status:** Approved  
**Produkte:** aitema|Termin, aitema|RIS, aitema|Hinweis  
**Rechtliche Grundlage:** OZG 2.0, BFSG (ab 28.6.2025), HinSchG

---

## Übersicht

6 Features werden parallel implementiert. Alle haben bestehende technische Grundlagen im Code und hohen Business-Value.

---

## T1 – iCal-Export (aitema|Termin)

**User Story:** Als Bürger möchte ich nach der Terminbuchung eine `.ics`-Datei erhalten, damit ich den Termin direkt in meinen Kalender (Outlook, Google Calendar, Apple Calendar) importieren kann.

**Akzeptanzkriterien:**
- [ ] Buchungsbestätigung enthält Download-Link für `.ics`-Datei
- [ ] `.ics`-Datei enthält: Titel (Dienstleistungsname), Datum+Uhrzeit, Standort (Adresse), Buchungsnummer als UID
- [ ] Backend-Endpunkt: `GET /api/bookings/:id/ical` → Content-Type: `text/calendar`
- [ ] E-Mail-Bestätigung enthält `.ics` als Attachment
- [ ] DSGVO: Keine personenbezogenen Daten außer Buchungsnummer in UID

**Technische Basis:** Booking-Daten vollständig in PostgreSQL, Notification-Service (nodemailer) vorhanden  
**Library:** `ical-generator` (npm, MIT-Lizenz)  
**Aufwand:** XS (2-4h)  
**OZG-Relevanz:** Hoch (Ende-zu-Ende-Digitalisierung, keine Medienbrüche)

---

## T2 – QR-Code-Generierung (aitema|Termin)

**User Story:** Als Bürger möchte ich in meiner Buchungsbestätigung einen QR-Code erhalten, um mich am Kiosk-Terminal schnell einchecken zu können, ohne meinen Namen eintippen zu müssen.

**Akzeptanzkriterien:**
- [ ] QR-Code wird serverseitig generiert (kein externer Dienst)
- [ ] QR-Code-Inhalt: `https://termin.aitema.de/checkin/{bookingId}` (Deep-Link)
- [ ] QR-Code in E-Mail als eingebettetes PNG (Base64)
- [ ] QR-Code im Buchungsbestätigungs-PDF (A4, druckbar)
- [ ] Kiosk-Seite `/checkin/:bookingId` liest QR-Code-Scan und bestätigt Check-in via API
- [ ] Fallback: Manuelle Buchungsnummer-Eingabe wenn kein Smartphone

**Technische Basis:** `qrCodeDataUrl`-Feld bereits im DB-Schema, PDF-Route vorhanden  
**Library:** `qrcode` (npm, MIT-Lizenz)  
**Aufwand:** S (4-6h)  
**OZG-Relevanz:** Hoch | **BFSG:** Kiosk-Check-in-Alternative für alle Nutzergruppen

---

## T3 – SMS-Erinnerung (aitema|Termin)

**User Story:** Als Bürger möchte ich 24 Stunden vor meinem Termin eine SMS-Erinnerung erhalten, damit ich den Termin nicht vergesse und ihn rechtzeitig absagen kann.

**Akzeptanzkriterien:**
- [ ] Opt-in: Telefonnummer-Feld im Buchungsformular (optional, DSGVO-Hinweis)
- [ ] SMS 24h vor Termin: "Ihr Termin morgen um {Uhrzeit} Uhr bei {Standort}. Buchungs-Nr: {ID}. Absagen: {URL}"
- [ ] SMS bei Stornierung durch Amt: "Ihr Termin am {Datum} wurde storniert. Neuen Termin: {URL}"
- [ ] Provider: Twilio (`SMS_PROVIDER=twilio`, `SMS_API_KEY` bereits in .env.example)
- [ ] Cron-Job läuft täglich 10:00 Uhr (Termin am nächsten Tag → SMS senden)
- [ ] Fallback wenn keine Telefonnummer: nur E-Mail
- [ ] Opt-out Link in SMS

**Technische Basis:** `SMS_PROVIDER`/`SMS_API_KEY` Env-Vars vorbereitet, Notification-Service erweiterbar, Redis für Cron  
**Library:** `twilio` (npm)  
**Aufwand:** S (4-8h)  
**Studien:** SMS-Erinnerungen reduzieren No-Shows um bis zu 50% (Berlin: 1.000 verlorene Termine/Tag)

---

## R1 – KI-Kurzfassungen von Vorlagen (aitema|RIS)

**User Story:** Als Stadtrat möchte ich zu jeder Vorlage automatisch eine 2-Satz-Kurzfassung sehen, damit ich vor der Sitzung schnell den Überblick bekomme, ohne alle Dokumente vollständig lesen zu müssen.

**Akzeptanzkriterien:**
- [ ] Kurzfassung (2 Sätze) wird automatisch generiert wenn Vorlage eingestellt wird
- [ ] Manuelle Regenerierung per Button möglich (für Redakteure)
- [ ] Kurzfassung erscheint in: Vorlagen-Liste (unter Titel), Sitzungs-Detail (unter TOP), Suche-Ergebnis
- [ ] KI-Modell: Claude claude-haiku-4-5-20251001 (kostengünstig, schnell)
- [ ] Prompt: "Fasse folgende Verwaltungsvorlage in genau 2 Sätzen zusammen. Neutral, sachlich, kein Fachjargon: {volltext}"
- [ ] Gekennzeichnet als "KI-generiert" mit Info-Icon (AI Act Transparenzpflicht)
- [ ] Fallback: Erste 300 Zeichen des Volltexts wenn KI nicht verfügbar
- [ ] Human-in-the-Loop: Redakteur kann Kurzfassung editieren und freigeben
- [ ] Backend: `POST /api/papers/:id/summarize` → speichert in DB-Feld `ai_summary`

**Technische Basis:** Elasticsearch-Index mit allen Vorlagentexten, FastAPI-Backend  
**Library:** `anthropic` Python SDK  
**Aufwand:** S (4-6h)  
**OZG-Relevanz:** Hoch (Transparenz, Bürgerinformation)

---

## R2 – iCal-Export aus Kalender (aitema|RIS)

**User Story:** Als Ratsmitglied möchte ich Sitzungstermine direkt aus dem RIS in meinen Kalender exportieren, damit ich keine Sitzungen verpasse.

**Akzeptanzkriterien:**
- [ ] Button "In Kalender exportieren" auf Sitzungs-Detail-Seite
- [ ] Button "Alle Sitzungen abonnieren" auf Kalender-Seite (iCal-Feed-URL)
- [ ] Backend-Endpunkt: `GET /api/meetings/:id/ical` → `.ics`-Datei
- [ ] Backend-Endpunkt: `GET /api/meetings/feed.ics` → vollständiger iCal-Feed (alle zukünftigen Sitzungen)
- [ ] `.ics` enthält: Titel (Gremium + Sitzungstyp), Datum+Uhrzeit, Ort (Sitzungssaal), Tagesordnungs-URL als URL-Feld
- [ ] Feed-URL kann in Outlook/Google Calendar als Abonnement eingetragen werden (auto-update)

**Technische Basis:** Calendar-Service bereits im RIS-Backend implementiert (nur UI-Button fehlt)  
**Library:** `icalendar` Python (bereits in Venv oder leicht installierbar)  
**Aufwand:** XS (2-3h)

---

## H1 – Compliance-Dashboard Charts (aitema|Hinweis)

**User Story:** Als Compliance-Beauftragter möchte ich interaktive Charts im Dashboard sehen, die mir aggregierte Trends über Meldungsvolumen, Kategorien und Fristenerfüllung zeigen, damit ich meiner Aufsichtsbehörde Rechenschaft ablegen kann.

**Akzeptanzkriterien:**
- [ ] Chart 1 – Meldungsvolumen (Zeitreihe): Neue Meldungen pro Monat (letzten 12 Monate), Line-Chart
- [ ] Chart 2 – Kategorie-Verteilung: Donut-Chart (Korruption, Datenschutz, Diskriminierung, Arbeitssicherheit, Sonstiges)
- [ ] Chart 3 – Bearbeitungsstatus: Horizontal-Bar (Offen, In Bearbeitung, Abgeschlossen, Abgelehnt)
- [ ] Chart 4 – Fristeneinhaltung: Gauge oder KPI-Cards (% fristgerecht nach HinSchG-Vorgaben)
- [ ] Alle Charts: Anonymisiert (Schwellenwert: min. 3 Meldungen pro Kategorie für Anzeige)
- [ ] Export: "PDF-Bericht generieren" Button → druckbarer Compliance-Report
- [ ] Farben: aitema Design-System (emerald=gut, accent=neutral, amber=warnung, rot=kritisch)
- [ ] Chart-Library: Chart.js (leichtgewichtig, kein React erforderlich, Angular-kompatibel via ng2-charts)

**Technische Basis:** Celery-Tasks für Analytics vorhanden, alle Daten in PostgreSQL, Redis für Caching  
**Library:** `ng2-charts` + `chart.js` (Angular-kompatibel)  
**Aufwand:** S (6-8h)  
**HinSchG-Relevanz:** Audit-Dokumentation für Aufsichtsbehörden

---

## Implementierungsplan

### Parallel-Agents (Worktrees)

```
worktree/feature-termin-ical-qr-sms     → Agent T (T1+T2+T3)
worktree/feature-ris-ki-ical            → Agent R (R1+R2)  
worktree/feature-hinweis-charts         → Agent H (H1)
```

### Verifikation (je Agent)

1. `npm run build` / `ng build` / `npm run build` → 0 Errors
2. `git diff --stat` → geänderte Dateien prüfen
3. `git add -A && git commit -m "feat: ..."` im Worktree
4. `git push origin <branch>`
5. PR erstellen

### Zeitplan

| Feature | Aufwand | Agent |
|---------|---------|-------|
| T1 iCal | XS | Termin-Agent |
| T2 QR-Code | S | Termin-Agent |
| T3 SMS | S | Termin-Agent |
| R1 KI-Summary | S | RIS-Agent |
| R2 iCal | XS | RIS-Agent |
| H1 Charts | S | Hinweis-Agent |

**Gesamt geschätzt:** 1 Parallel-Durchgang, ~4-8h Agent-Laufzeit

---

## Nicht in diesem Sprint

- KI-Transkription Ratssitzungen (Hochrisiko AI Act, needs tucan.ai Vertrag)
- Semantische Volltext-Suche (pgvector Migration, 2+ Wochen)
- Voicebot (Provider-Vertrag notwendig)
- E-Petition (BundID-Integration komplex)

---

*Erstellt: 2026-02-21 | aitema GmbH*
