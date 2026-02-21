# PRD: aitema GovTech Sprint Batch 2 – Februar 2026

**Datum:** 2026-02-21 | **Status:** Approved

---

## M1 – Plausible Analytics (alle 3 Produkte)

**Story:** Als Admin möchte ich DSGVO-konforme Nutzungsstatistiken ohne Cookie-Banner.

**AK:**
- [ ] Plausible Self-Hosted auf Hetzner oder Cloud-Account (eu.plausible.io)
- [ ] Script-Tag in alle 3 Frontends: `<script defer data-domain="..." src="https://plausible.io/js/script.js">`
- [ ] Custom Events: Hinweis=`meldung_eingereicht`, RIS=`vorlage_angesehen`, Termin=`termin_gebucht`
- [ ] Kein Cookie-Banner nötig (cookiefrei by design)
- [ ] Datenschutzerklärung-Hinweis aktualisieren

**Basis:** Alle 3 Frontends haben `<head>` / Layout-Datei  
**Aufwand:** XS

---

## M2 – No-Show Push-Notification (aitema|Termin)

**Story:** Als wartender Bürger möchte ich 10 Minuten vor meinem Aufruf eine Push-Notification erhalten.

**AK:**
- [ ] WebSocket-Kanal `citizen:{bookingId}` sendet Event wenn Ticket bald dran
- [ ] Frontend abonniert WebSocket bei Check-in, zeigt Browser-Notification
- [ ] Fallback: SMS wenn WebSocket nicht verbunden (Twilio bereits implementiert)
- [ ] Staff-UI: "Nächster" Button löst WebSocket-Event aus

**Basis:** WebSocket via Redis PubSub bereits vorhanden (`queue:locationId`)  
**Aufwand:** S

---

## M3 – Kalender-Sync CalDAV (aitema|Termin Staff)

**Story:** Als Sachbearbeiter möchte ich meine Termine automatisch in Outlook/Apple Calendar sehen.

**AK:**
- [ ] Staff-Settings: CalDAV-Feed-URL anzeigen (persönlicher iCal-Feed per Mitarbeiter)
- [ ] `GET /api/staff/:userId/calendar.ics` → alle Termine des Mitarbeiters heute+30 Tage
- [ ] URL enthält Auth-Token (read-only, revocable)
- [ ] Copy-to-Clipboard Button in Staff-Settings

**Basis:** iCal-Generator bereits installiert (T1), Booking-Daten in DB  
**Aufwand:** S

---

## M4 – Einfache Sprache Toggle (aitema|RIS)

**Story:** Als Bürger möchte ich Vorlagen-Zusammenfassungen in einfacher Sprache lesen.

**AK:**
- [ ] Toggle-Button "Einfache Sprache" auf Vorlagen-Detail + Sitzungs-Detail
- [ ] Bei Klick: API-Call `POST /api/papers/:id/simple-language`
- [ ] KI (Claude Haiku): "Erkläre folgende Vorlage in einfacher Sprache (A2-Niveau, kurze Sätze, keine Fachbegriffe): {text}"
- [ ] Ergebnis in DB gespeichert (`simple_language_text`)
- [ ] BFSG-Badge: "Einfache Sprache" sichtbar
- [ ] Gekennzeichnet als KI-generiert

**Basis:** Anthropic SDK bereits installiert (R1), ai_summary Pattern wiederverwendbar  
**Aufwand:** S

---

## M5 – Metadaten-Stripping bei Datei-Upload (aitema|Hinweis)

**Story:** Als anonymer Hinweisgeber möchte ich sicher sein, dass meine hochgeladenen Dateien keine EXIF-Daten enthalten die mich identifizieren könnten.

**AK:**
- [ ] Bilder (JPEG, PNG, HEIC): EXIF-Daten komplett entfernen (GPS, Gerät, Zeitstempel)
- [ ] PDFs: Metadaten-Felder leeren (Autor, Software, Erstellungsdatum)
- [ ] Processing-Hinweis im Upload-UI: "Metadaten werden automatisch entfernt"
- [ ] ClamAV-Virenscan vor Speicherung (falls nicht bereits vorhanden)
- [ ] Erlaubte Typen: JPEG, PNG, PDF, DOCX (max. 10MB)

**Basis:** Python-Backend (Celery für async), Datei-Upload bereits implementiert  
**Library:** `Pillow` (EXIF), `pypdf` (PDF-Metadaten), `python-clamavscan` optional  
**Aufwand:** S

