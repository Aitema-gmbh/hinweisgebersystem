# Feature-Vergleichsmatrix: Hinweisgebersysteme fuer Kommunen

Stand: Februar 2026

---

## Legende

| Symbol | Bedeutung |
|--------|-----------|
| ✅ | Vollstaendig vorhanden |
| ⚠️ | Teilweise / eingeschraenkt |
| ❌ | Nicht vorhanden |
| 🔄 | In Entwicklung / geplant |

---

## Gesetzliche Anforderungen (HinSchG)

| Anforderung | Paragraph | aitema\|Hinweis | BKMS Compliance | Hintbox | Whistleblower SW | GOvdp |
|-------------|-----------|:-:|:-:|:-:|:-:|:-:|
| Interne Meldestelle | §12 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Eingangsbestaetigung (7 Tage) | §8 Abs. 1 | ✅ automatisch | ✅ automatisch | ✅ automatisch | ✅ manuell | ❌ |
| Rueckmeldung (3 Monate) | §8 Abs. 2 | ✅ automatisch | ✅ automatisch | ✅ Erinnerung | ⚠️ manuell | ❌ |
| Fristenautomat mit Eskalation | §8 | ✅ | ✅ | ⚠️ nur Erinnerung | ❌ | ❌ |
| Multi-Kanal: Online-Formular | §16 Abs. 1 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Multi-Kanal: Telefon-Protokoll | §16 Abs. 2 | ✅ | ⚠️ Zusatzmodul | ❌ | ❌ | ❌ |
| Multi-Kanal: Posteingang | §16 Abs. 3 | ✅ | ⚠️ Zusatzmodul | ❌ | ❌ | ❌ |
| Multi-Kanal: Persoenliche Vorsprache | §16 Abs. 4 | ✅ | ❌ | ❌ | ❌ | ❌ |
| Vertraulichkeitsgebot | §8 Abs. 1 | ✅ Zero-Knowledge | ✅ | ✅ | ✅ | ✅ |
| Dokumentationspflicht | §11 | ✅ automatisch | ✅ | ✅ | ⚠️ | ✅ |
| Automatische Loeschung (3 Jahre) | §11 Abs. 5 | ✅ konfigurierbar | ✅ | ⚠️ manuell | ❌ | ⚠️ |
| Fallbearbeitung / Workflow | §17 | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| Jahresberichte / Statistiken | §27 | ✅ automatisch | ✅ | ⚠️ manuell | ❌ | ⚠️ |

---

## Anonymitaet & Sicherheit

| Feature | aitema\|Hinweis | BKMS Compliance | Hintbox | Whistleblower SW | GOvdp |
|---------|:-:|:-:|:-:|:-:|:-:|
| Anonyme Meldungsabgabe | ✅ | ✅ | ✅ | ✅ | ✅ |
| Anonymer Rueckkanal | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| Zero-Knowledge-Verschluesselung | ✅ | ❌ | ❌ | ❌ | ✅ |
| Ende-zu-Ende-Verschluesselung | ✅ | ⚠️ | ⚠️ | ❌ | ✅ |
| 2-Faktor-Authentifizierung | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| Audit-Trail / Zugriffsprotokolle | ✅ | ✅ | ⚠️ | ❌ | ✅ |
| Verschluesselte Datei-Uploads | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| Tor/Onion-Support | ✅ | ❌ | ❌ | ❌ | ✅ |

---

## Technische Features

| Feature | aitema\|Hinweis | BKMS Compliance | Hintbox | Whistleblower SW | GOvdp |
|---------|:-:|:-:|:-:|:-:|:-:|
| Multi-Tenant / Mandantenfaehig | ✅ | ⚠️ Aufpreis | ❌ | ❌ | ✅ |
| REST API | ✅ | ❌ | ⚠️ | ❌ | ✅ |
| Self-Hosted (eigene Server) | ✅ | ❌ | ❌ | ❌ | ✅ |
| Managed Hosting (Deutschland) | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| Docker Compose Deployment | ✅ | ❌ | ❌ | ❌ | ✅ |
| Kubernetes Support | 🔄 | ❌ | ❌ | ❌ | ⚠️ |
| LDAP/AD Integration | ✅ Enterprise | ✅ | ⚠️ | ❌ | ⚠️ |
| ALLRIS-Integration | ✅ Enterprise | ❌ | ❌ | ❌ | ❌ |
| E-Akte-Anbindung | 🔄 | ❌ | ❌ | ❌ | ❌ |
| CSV/JSON Import | ✅ | ❌ | ❌ | ❌ | ✅ |
| Webhook-Benachrichtigungen | ✅ | ❌ | ⚠️ | ❌ | ✅ |

---

## Compliance & Standards

| Standard | aitema\|Hinweis | BKMS Compliance | Hintbox | Whistleblower SW | GOvdp |
|----------|:-:|:-:|:-:|:-:|:-:|
| DSGVO-konform | ✅ | ✅ | ✅ | ✅ | ✅ |
| BSI IT-Grundschutz | ✅ | ✅ | ⚠️ | ❌ | ⚠️ |
| BITV 2.0 (Barrierefreiheit) | ✅ | ⚠️ | ⚠️ | ❌ | ⚠️ |
| WCAG 2.1 Level AA | ✅ | ⚠️ | ⚠️ | ❌ | ⚠️ |
| ISO 27001 (Hosting) | ✅ Managed | ✅ | ✅ | ⚠️ | ⚠️ |
| AVV (Auftragsverarbeitung) | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| EU Whistleblower-Richtlinie | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Barrierefreiheit (Detail)

| Kriterium | aitema\|Hinweis | BKMS Compliance | Hintbox | Whistleblower SW | GOvdp |
|-----------|:-:|:-:|:-:|:-:|:-:|
| Screenreader-kompatibel | ✅ | ⚠️ | ⚠️ | ❌ | ⚠️ |
| Tastaturnavigation | ✅ | ⚠️ | ⚠️ | ❌ | ✅ |
| Kontrastmodus | ✅ | ❌ | ❌ | ❌ | ⚠️ |
| Responsive Design | ✅ | ✅ | ✅ | ✅ | ✅ |
| Leichte Sprache | 🔄 | ❌ | ❌ | ❌ | ❌ |
| Gebaerdensprache (Video) | 🔄 | ❌ | ❌ | ❌ | ❌ |

---

## Lizenz & Kosten

| Aspekt | aitema\|Hinweis | BKMS Compliance | Hintbox | Whistleblower SW | GOvdp |
|--------|:-:|:-:|:-:|:-:|:-:|
| Open Source | ✅ AGPLv3 | ❌ proprietaer | ❌ proprietaer | ❌ proprietaer | ✅ AGPLv3 |
| Community Edition (kostenlos) | ✅ | ❌ | ❌ | ❌ | ✅ |
| Managed ab (pro Jahr) | 3.588 EUR | ~5.000 EUR | ~3.600 EUR | ~4.800 EUR | Auf Anfrage |
| Setup-Kosten | 0 EUR | ~2.000 EUR | ~500 EUR | ~1.000 EUR | 0 EUR |
| Vendor Lock-in | ❌ Kein | ✅ Hoch | ✅ Mittel | ✅ Hoch | ❌ Kein |
| Datenexport | ✅ Jederzeit | ⚠️ Eingeschraenkt | ⚠️ CSV | ❌ | ✅ |

---

## Zusammenfassung

**aitema|Hinweis** bietet als einzige Loesung neben GOvdp (GlobaLeaks-basiert):
- Vollstaendigen Open-Source-Zugang (AGPLv3)
- Self-Hosted-Option fuer volle Datensouveraenitaet
- Multi-Tenant-Faehigkeit fuer IT-Zweckverbaende
- Vollstaendige BITV 2.0 Barrierefreiheit

**Alleinstellungsmerkmale gegenueber GOvdp:**
- ALLRIS-Integration (Enterprise)
- Multi-Kanal-Eingang (Telefon, Post, persoenlich)
- E-Akte-Anbindung (Roadmap)
- Kommerzieller Support mit SLA
- Professionelles Managed Hosting

---

*Letzte Aktualisierung: Februar 2026*
*Alle Angaben ohne Gewaehr. Funktionsumfang der Wettbewerber basiert auf oeffentlich verfuegbaren Informationen.*
*Erstellt von: aitema GmbH*
