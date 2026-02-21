# PRD: aitema GovTech Sprint Batch 5 – Februar 2026

**Datum:** 2026-02-21 | **Status:** Approved | **Quelle:** Konkurrenzanalyse (EQS, TEVIS, JCC, ALLRIS)

---

## D1 – Automatische Warteliste (aitema|Termin)

**Story:** Als Bürger möchte ich mich auf eine Warteliste setzen können, wenn kein Termin verfügbar ist, und automatisch benachrichtigt werden wenn einer frei wird.

**AK:**
- [ ] Wartelisten-Eintrag: Name, Telefon, bevorzugte Zeitfenster (optional), Service
- [ ] BullMQ-Job: lauscht auf Stornierungsevent → sucht passenden Wartelisten-Eintrag → reserviert Termin
- [ ] SMS-Benachrichtigung via Sipgate: "Ein Termin wurde für Sie reserviert: [Datum/Zeit]. Bestätigen Sie innerhalb 2h oder der Termin geht an die nächste Person."
- [ ] Bestätigungs-Mechanismus: Link im SMS → Termin bestätigen oder ablehnen
- [ ] Staff-Dashboard: Wartelisten-Tab pro Service mit Anzahl wartender Personen
- [ ] Ablauf bei kein Match: Tägliche SMS-Zusammenfassung verfügbarer Termine

**Basis:** BullMQ + Redis + Sipgate bereits vorhanden
**Aufwand:** S

---

## D2 – Video-Termin-Option (aitema|Termin)

**Story:** Als Bürger möchte ich bei der Buchung zwischen Vor-Ort und Video-Termin wählen können.

**AK:**
- [ ] Buchungsschritt 2 (Service): Toggle "Vor-Ort" / "Video-Termin" (wenn Service es erlaubt)
- [ ] Backend: Service-Konfiguration: supports_video: boolean
- [ ] Jitsi-Raum-Generierung: eindeutige Room-ID per Booking-Code (kein externer Dienst nötig: meet.jit.si/{bookingCode})
- [ ] Bestätigungs-SMS: enthält Jitsi-Link
- [ ] Staff-Dashboard: Video-Termine farblich markiert + "Jetzt beitreten"-Button
- [ ] Termin-Detail: Video-Icon + Link
- [ ] Datenschutz-Hinweis bei Video-Buchung (meet.jit.si Datenschutz)

**Basis:** Jitsi Public (meet.jit.si) ohne eigene Infrastruktur für MVP
**Aufwand:** M

---

## D3 – HinSchG-Fristenampel (aitema|Hinweis)

**Story:** Als Sachbearbeiter möchte ich auf einen Blick sehen, welche Fälle kurz vor der gesetzlichen Frist stehen (HinSchG: 7 Tage Eingangsbestätigung, 3 Monate Abschluss).

**AK:**
- [ ] Datenbankfeld: acknowledged_at (Eingangsbestätigung), resolved_at
- [ ] Berechnung: Status-Ampel pro Fall
  - Grün: > 14 Tage bis Frist
  - Gelb: 7–14 Tage bis Frist
  - Rot: < 7 Tage bis Frist / überfällig
- [ ] Dashboard-Tabelle: neue Spalte "Frist" mit Ampel-Badge
- [ ] Fristenübersicht-Widget: Anzahl Grün/Gelb/Rot im Dashboard-Header
- [ ] Celery-Task (täglich 8 Uhr): E-Mail an zuständige Sachbearbeiter bei gelben/roten Fällen
- [ ] Eingangsbestätigung-Button im Fall: setzt acknowledged_at + Fristberechnung

**Basis:** Celery + Redis bereits vorhanden, PostgreSQL-Schema erweiterbar
**Aufwand:** S-M

---

## D4 – Ombudsperson-Rolle (aitema|Hinweis)

**Story:** Als externe Ombudsperson möchte ich auf ausgewählte Fälle zugreifen können, ohne Identitätsdaten des Meldenden zu sehen.

**AK:**
- [ ] Neue Keycloak-Realm-Rolle: hinweis-ombudsperson
- [ ] Eingeschränktes Dashboard: nur Fälle sichtbar die explizit "an Ombudsperson weitergeleitet" wurden
- [ ] Fallansicht für Ombudsperson: Fallinhalt anonymisiert (Name/Kontakt ausgeblendet), Kategorie + Beschreibung sichtbar
- [ ] Workflow: Sachbearbeiter klickt "An Ombudsperson weiterleiten" → Fall erscheint in Ombudsperson-Queue
- [ ] Ombudsperson kann Empfehlung abgeben: Freitext-Feld + Dropdown ("Weiter verfolgen" / "Einstellen" / "Eskalieren")
- [ ] Audit-Trail: Zeitstempel der Weiterleitung und der Empfehlung (unveränderlich)
- [ ] Ombudsperson kann KEINE Fälle löschen oder Status ändern

**Basis:** Keycloak bereits konfiguriert (gleicher Realm), RBAC-Guards vorhanden
**Aufwand:** M

---

## D5 – Bürger-Abonnement für Gremien/Themen (aitema|RIS)

**Story:** Als interessierter Bürger möchte ich E-Mail-Benachrichtigungen erhalten, wenn neue Sitzungen oder Vorlagen zu einem Gremium oder Thema meines Interesses veröffentlicht werden.

**AK:**
- [ ] Subscribe-Button auf Gremiums-Seite und Stichwort-Seite
- [ ] Double-Opt-In: E-Mail mit Bestätigungslink (DSGVO §7 UWG)
- [ ] Datenbank: subscriptions Tabelle (email, type=gremium|keyword, target_id, confirmed, token)
- [ ] FastAPI-Endpunkte: POST /subscribe, GET /confirm/:token, POST /unsubscribe
- [ ] Celery/Hintergrund-Job: Wenn neue Sitzung/Vorlage → passende Abonnenten suchen → E-Mail via SMTP
- [ ] Unsubscribe-Link in jeder Mail (DSGVO-Pflicht)
- [ ] Rate-Limiting: max 1 Mail pro Abonnent pro Tag (Digest statt Einzel-Mails)

**Basis:** PostgreSQL, FastAPI, SMTP-Konfiguration verfügbar
**Aufwand:** M
