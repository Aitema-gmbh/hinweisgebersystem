# aitema|Hinweis – Pitch Deck
## HinSchG-konformes Hinweisgebersystem fuer Kommunen

---

## Folie 1: Titel

```
┌─────────────────────────────────────────┐
│                                         │
│          [aitema Logo]                  │
│                                         │
│        aitema|Hinweis                   │
│                                         │
│   HinSchG-konformes Hinweisgebersystem  │
│       fuer Ihre Kommune                 │
│                                         │
│   Open-Source. DSGVO-konform.           │
│   Made in Germany.                      │
│                                         │
│        www.aitema.de/hinweis            │
│                                         │
└─────────────────────────────────────────┘
```

---

## Folie 2: Das Problem

### Gesetzliche Pflicht seit 17.12.2023

- **Hinweisgeberschutzgesetz (HinSchG)** in Kraft seit 02.07.2023
- Uebergangsfristen fuer Kommunen mit 50-249 Beschaeftigten **abgelaufen** am 17.12.2023
- Jede Kommune mit >= 50 Beschaeftigten **muss** eine interne Meldestelle betreiben
- **Bussgelder bis 50.000 EUR** bei Verstoessen (§40 HinSchG)
- Persoenliche Haftung der Verwaltungsspitze moeglich

### Konkrete Anforderungen:
| Paragraph | Pflicht | Frist |
|-----------|---------|-------|
| §12 | Interne Meldestelle einrichten | Sofort |
| §8 | Eingangsbestaetigung | 7 Tage |
| §8 | Rueckmeldung an Hinweisgeber | 3 Monate |
| §16 | Mehrere Meldekanäle anbieten | Sofort |
| §11 | Dokumentation & Loeschfristen | Laufend |

---

## Folie 3: Aktuelle Situation in Kommunen

### Wie viele Kommunen heute arbeiten:

**Variante A: Improvisation**
- Excel-Tabellen zur Fallverfolgung
- E-Mail-Postfaecher ohne Verschluesselung
- Physischer Briefkasten im Rathaus
- Keine Fristenueberwachung
- Kein anonymer Rueckkanal
- **Risiko:** Nicht HinSchG-konform, Datenschutzverstoesse

**Variante B: Teure kommerzielle Anbieter**
- BKMS Compliance System: ab 5.000 EUR/Jahr
- Hintbox: ab 3.600 EUR/Jahr
- Proprietaere Software, kein Einblick in den Code
- Daten auf fremden Servern (teilweise EU-Ausland)
- Vendor Lock-in, keine Migrationsoption
- **Risiko:** Hohe Kosten, Abhaengigkeit

**Variante C: Ignorieren**
- "Betrifft uns nicht" / "Warten wir ab"
- **Risiko:** Bussgelder, Reputationsschaden, persoenliche Haftung

---

## Folie 4: Die Loesung – aitema|Hinweis

### Die sichere, transparente Alternative

**Was ist aitema|Hinweis?**
Ein vollstaendiges Hinweisgebersystem, das alle Anforderungen des HinSchG erfuellt – als Open-Source-Software.

**Kernvorteile:**

| Vorteil | Beschreibung |
|---------|-------------|
| Open Source | Volle Transparenz, AGPLv3-Lizenz, Code oeffentlich pruefbar |
| Self-Hosted | Daten bleiben auf Ihren Servern oder in deutschen Rechenzentren |
| Mandantenfaehig | Eine Installation fuer mehrere Kommunen (IT-Zweckverband) |
| Barrierefrei | BITV 2.0 / WCAG 2.1 Level AA |
| BSI-konform | Kompatibel mit IT-Grundschutz |
| DSGVO-konform | Datensparsamkeit, Loeschfristen, AVV verfuegbar |

**Technologie-Stack:**
- Backend: Python/Django REST API
- Frontend: Angular (responsive, barrierefrei)
- Datenbank: PostgreSQL mit Verschluesselung
- Deployment: Docker Compose
- Verschluesselung: Ende-zu-Ende, Zero-Knowledge

---

## Folie 5: Live-Demo

### Wichtigste Ansichten:

**1. Hinweisgeber-Portal (oeffentlich)**
- Anonymes Meldeformular mit Kategorieauswahl
- Datei-Upload (verschluesselt)
- Anonymer Rueckkanal mit Fallnummer
- Barrierefreie Oberflaeche

**2. Meldestellen-Dashboard (intern)**
- Uebersicht aller Meldungen mit Status
- Fristenautomat mit Ampelsystem (gruen/gelb/rot)
- Fallbearbeitung mit Kommentarfunktion
- Zuweisung an Ombudsperson

**3. Administrations-Bereich**
- Mandantenverwaltung
- Benutzerverwaltung mit Rollen (Admin, Ombudsperson, Sachbearbeiter)
- Audit-Log aller Aktionen
- Statistiken und Jahresberichte (§27 HinSchG)

**4. Anonymer Rueckkanal**
- Hinweisgeber kann mit Fallnummer Status pruefen
- Verschluesselte Kommunikation ohne Identitaetsoffenlegung
- Nachreichung von Dokumenten moeglich

---

## Folie 6: Architektur & Sicherheit

### Sicherheitsarchitektur

```
┌──────────────────────────────────────────────┐
│              Hinweisgeber                     │
│         (Browser / anonym)                    │
└──────────────┬───────────────────────────────┘
               │ HTTPS/TLS 1.3
┌──────────────▼───────────────────────────────┐
│           Reverse Proxy (Nginx)              │
│         WAF / Rate Limiting / HSTS           │
└──────────────┬───────────────────────────────┘
               │
┌──────────────▼───────────────────────────────┐
│        aitema|Hinweis Application             │
│  ┌─────────────┐  ┌───────────────────────┐  │
│  │  Frontend    │  │  REST API (Django)    │  │
│  │  (Angular)   │  │  Authentifizierung    │  │
│  │              │  │  Autorisierung        │  │
│  └─────────────┘  │  Verschluesselung     │  │
│                    │  Fristenautomat       │  │
│                    └───────────┬───────────┘  │
└────────────────────────────────┤──────────────┘
                                 │
               ┌─────────────────▼────────────┐
               │    PostgreSQL (verschl.)      │
               │    Backup: taeglich + off-site│
               └──────────────────────────────┘
```

### Sicherheits-Features:
- Ende-zu-Ende-Verschluesselung aller Meldungen
- Zero-Knowledge: Server kann Inhalte nicht entschluesseln
- 2-Faktor-Authentifizierung fuer Meldestellen-Zugang
- Audit-Trail aller Zugriffe (nicht manipulierbar)
- Automatische Loeschung nach §11 HinSchG (3 Jahre)
- Gehaertete Docker-Container
- Regelmaessige Dependency-Updates (Dependabot)

---

## Folie 7: Vergleich mit Wettbewerbern

| Feature | aitema\|Hinweis | BKMS | Hintbox | GOvdp |
|---------|:-:|:-:|:-:|:-:|
| HinSchG-konform | ✅ | ✅ | ✅ | ✅ |
| Fristenautomat §8 | ✅ | ✅ | ✅ | ❌ |
| Multi-Kanal §16 | ✅ | ⚠️ | ⚠️ | ❌ |
| Anonymer Rueckkanal | ✅ | ✅ | ✅ | ✅ |
| Mandantenfaehig | ✅ | ⚠️ | ❌ | ✅ |
| Open Source | ✅ | ❌ | ❌ | ✅ |
| Self-Hosted | ✅ | ❌ | ❌ | ✅ |
| Barrierefrei (BITV) | ✅ | ⚠️ | ⚠️ | ⚠️ |
| BSI IT-Grundschutz | ✅ | ✅ | ⚠️ | ⚠️ |
| REST API | ✅ | ❌ | ⚠️ | ✅ |
| ALLRIS-Integration | ✅ (Enterprise) | ❌ | ❌ | ❌ |
| Preis (ab/Jahr) | **0 EUR** | ~5.000 EUR | ~3.600 EUR | 0 EUR |

**Legende:** ✅ = Vorhanden | ⚠️ = Teilweise/eingeschraenkt | ❌ = Nicht vorhanden

---

## Folie 8: Preismodell – Commercial Open Source (COSS)

### Drei Editionen fuer jeden Bedarf

| | Community | Managed | Enterprise |
|---|---|---|---|
| **Preis** | Kostenfrei | ab 299 EUR/Monat | Auf Anfrage |
| **Lizenz** | AGPLv3 | Subskription | Subskription |
| **Hosting** | Self-Hosted | Deutsche Server | Dediziert/Self-Hosted |
| **Support** | Community (GitHub) | E-Mail + Ticket | 24/7 Telefon + SLA |
| **Updates** | Self-Service | Automatisch | Automatisch + Vorabtests |
| **Backups** | Eigenverantwortlich | Taeglich inkl. | Stundlich + Geo-Redundanz |
| **Schulung** | Dokumentation | Onboarding | Workshops + Zertifizierung |
| **SLA** | - | 99,5% | Bis 99,9% |
| **Anpassungen** | Fork erlaubt | - | Individuelle Entwicklung |
| **Zielgruppe** | IT-affine Kommunen | Einzelkommunen | Landkreise, Zweckverb. |

### Kostenvergleich (Kommune mit 200 Beschaeftigten, 3 Jahre):

| Anbieter | Jaehrliche Kosten | 3-Jahres-TCO |
|----------|------------------:|-------------:|
| BKMS Compliance System | ~5.000 EUR | ~15.000 EUR |
| Hintbox | ~3.600 EUR | ~10.800 EUR |
| **aitema\|Hinweis Managed** | **3.588 EUR** | **10.764 EUR** |
| **aitema\|Hinweis Community** | **0 EUR*** | **0 EUR*** |

*\* Eigene Serverkosten + IT-Personal nicht eingerechnet*

---

## Folie 9: Roadmap & Referenzen

### Roadmap 2025/2026

| Quartal | Feature |
|---------|---------|
| Q1 2025 | ✅ Core: Meldeformular, Fristenautomat, Dashboard |
| Q2 2025 | ✅ Multi-Tenant, Anonymer Rueckkanal |
| Q3 2025 | ✅ Barrierefreiheit BITV 2.0, Statistiken |
| Q4 2025 | ✅ BSI IT-Grundschutz Dokumentation |
| Q1 2026 | 🔄 ALLRIS-Integration, E-Akte-Anbindung |
| Q2 2026 | 📋 KI-gestuetzte Kategorisierung, Spracherkennung |
| Q3 2026 | 📋 OZG 2.0 Integration, FIM-Stamminformationen |

### Pilotprojekte (Platzhalter):
- [Kommune A] – Managed Edition seit Q1 2025
- [IT-Zweckverband B] – Enterprise mit 12 Kommunen
- [Landkreis C] – Community Edition, Self-Hosted

---

## Folie 10: Naechste Schritte

### So starten Sie:

1. **Heute:** Kostenlose Demo vereinbaren
2. **Diese Woche:** Bedarfsanalyse (30 Min. Videokonferenz)
3. **In 2 Wochen:** Testinstanz bereitstellen
4. **In 4 Wochen:** Produktivbetrieb

### Kontakt

**aitema GmbH**
E-Mail: hinweis@aitema.de
Web: www.aitema.de/hinweis
GitHub: github.com/aitema/aitema-hinweis

Ansprechpartner: [Name, Position]
Telefon: [Telefonnummer]

---

*Erstellt: Februar 2026*
*Version: 1.0*
*aitema GmbH – Open Source fuer das Gemeinwohl*
