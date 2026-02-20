"""
hinschg_002_seed_demo
---------------------
Inserts realistic demo data for the HinSchG module:
  - 25 Hinweis-Fälle with various statuses and categories
  - History entries for each case
  - 7-day and 3-month deadlines
  - 3 Ombudspersonen
  - Default tenant settings for tid=1
"""

from datetime import datetime, timedelta


# ---- helpers ----------------------------------------------------------------

def _dt(days_offset=0, base=None):
    """Return UTC ISO timestamp offset by days from base (default: 2025-01-10)."""
    base = base or datetime(2025, 1, 10, 9, 0, 0)
    return (base + timedelta(days=days_offset)).isoformat()


def _aktenzeichen(n):
    return f"HIN-1-2025-{n:04d}"


# ---- demo data --------------------------------------------------------------

KATEGORIEN = [
    "korruption",
    "betrug",
    "datenschutz",
    "arbeitsschutz",
    "umwelt",
    "diskriminierung",
    "finanzmarkt",
    "sonstige",
]

STATUS_LISTE = [
    "eingegangen",
    "in_bearbeitung",
    "rueckmeldung_erteilt",
    "abgeschlossen",
    "abgelehnt",
]

BESCHREIBUNGEN = [
    ("korruption",
     "Vorgesetzter nimmt regelmäßig Geschenke von Lieferanten entgegen und bevorzugt diese bei Auftragsvergaben ohne sachliche Grundlage."),
    ("betrug",
     "Mitarbeiter der Buchhaltung bucht Privatausgaben als Geschäftsreisekosten ab; Belege wirken gefälscht."),
    ("datenschutz",
     "Kundendaten werden ohne Einwilligung an externe Marketingdienstleister weitergegeben; DSGVO-Verstoß liegt nahe."),
    ("arbeitsschutz",
     "Schutzausrüstung im Lager wird systematisch nicht zur Verfügung gestellt, Unfallgefahr ist erhöht."),
    ("umwelt",
     "Produktionsabwässer werden ungeklärt in den angrenzenden Bach eingeleitet; Fischsterben wurde beobachtet."),
    ("diskriminierung",
     "Beförderungen werden nachweislich geschlechtsspezifisch vergeben; qualifizierte Bewerberinnen werden übergangen."),
    ("finanzmarkt",
     "Vertriebsmitarbeiter empfehlen Finanzprodukte gegen Provision ohne Offenlegung gegenüber Kunden."),
    ("korruption",
     "Kommunale Vergabestelle vergibt Bauaufträge ohne öffentliche Ausschreibung an politisch nahestehende Unternehmen."),
    ("betrug",
     "Stundenzettel werden rückwirkend geändert, um Überstundenauszahlungen zu erschleichen."),
    ("datenschutz",
     "Bewerberdaten werden nach Abschluss des Verfahrens nicht gelöscht und intern für andere Zwecke genutzt."),
    ("arbeitsschutz",
     "Maschinen werden ohne vorgeschriebene Wartungsintervalle betrieben; Sicherheitsventile sind defekt."),
    ("umwelt",
     "Chemikaliengebinde werden illegal auf dem Betriebsgelände vergraben statt ordnungsgemäß entsorgt."),
    ("diskriminierung",
     "Ältere Mitarbeiter werden systematisch aus Fortbildungen ausgeschlossen und bei Gehaltserhöhungen übergangen."),
    ("finanzmarkt",
     "Insiderinformationen über bevorstehende Übernahmen werden an befreundete Händler weitergegeben."),
    ("sonstige",
     "Sicherheitsprotokolle für den Serverraum werden nicht eingehalten; externe Personen erhalten unkontrolliert Zutritt."),
    ("korruption",
     "Einkaufsleiter erhält Reisen und Sachleistungen von einem bevorzugten Lieferanten; Dokumentation fehlt."),
    ("betrug",
     "Rechnungen für nicht erbrachte Beratungsleistungen werden an eine Scheinfirma bezahlt."),
    ("datenschutz",
     "Beschäftigtendaten werden ohne Betriebsratsanhörung an die Muttergesellschaft im Ausland übermittelt."),
    ("arbeitsschutz",
     "Notausgänge im Verwaltungsgebäude sind dauerhaft mit Kartons blockiert; Fluchtwege nicht freigehalten."),
    ("umwelt",
     "Emissionsgrenzwerte werden gezielt nach Feierabend überschritten, wenn Messinstanzen nicht aktiv sind."),
    ("diskriminierung",
     "Hinweisgeber aus religiösen Minderheiten werden im Team systematisch gemobbt und isoliert."),
    ("finanzmarkt",
     "Kredit­vergabe erfolgt ohne Bonitätsprüfung an verbundene Unternehmen des Vorstandsvorsitzenden."),
    ("sonstige",
     "Arbeitsverträge für Saisonkräfte enthalten unzulässige Klauseln und werden nicht ausgehändigt."),
    ("korruption",
     "Subventionsanträge werden mit verfälschten Umsatzzahlen eingereicht, um höhere Förderungen zu erzielen."),
    ("betrug",
     "Ware wird doppelt in Rechnung gestellt; Lieferanten-Gutschriften werden nicht weitergegeben."),
]

PRIORITAETEN = ["niedrig", "normal", "hoch", "kritisch"]

OMBUDSLEUTE = [
    ("Dr. Sabine Hoffmann",   "s.hoffmann@aitema-hinweis.de",   "+49 89 1234 5670", 1),
    ("Markus Becker",         "m.becker@aitema-hinweis.de",     "+49 89 1234 5671", 1),
    ("Rechtsanwältin Eva Kern","e.kern@externe-ombuds.de",      "+49 30 9876 5432", 0),
]

AKTIONEN = [
    "Fall eingegangen und gespeichert",
    "Eingangsbestätigung versandt",
    "Erstkontakt aufgenommen",
    "Interne Prüfung eingeleitet",
    "Zeugenaussage dokumentiert",
    "Fachabteilung informiert",
    "Zwischenbescheid erteilt",
    "Abschlussbericht erstellt",
    "Fall abgeschlossen",
    "Meldung als unzulässig abgelehnt",
]


def upgrade(session):
    now_iso = datetime.utcnow().isoformat()

    # ------------------------------------------------------------------
    # Tenant settings (tid=1)
    # ------------------------------------------------------------------
    existing = session.execute(
        "SELECT id FROM hinschg_tenant_settings WHERE tid = 1"
    ).fetchone()
    if not existing:
        session.execute(
            """
            INSERT INTO hinschg_tenant_settings
                (tid, eingangsbestaetigung_tage, rueckmeldung_tage,
                 aufbewahrung_jahre, ombudsperson_intern, anonyme_meldungen,
                 pflichtfelder_json, benachrichtigungs_email, aktiv,
                 erstellt_am, aktualisiert_am)
            VALUES (1, 7, 90, 5, 1, 1, '["beschreibung","kategorie"]',
                    'hinweise@aitema-hinweis.de', 1, ?, ?)
            """,
            (now_iso, now_iso)
        )

    # ------------------------------------------------------------------
    # Ombudspersonen
    # ------------------------------------------------------------------
    for (name, email, telefon, intern) in OMBUDSLEUTE:
        session.execute(
            """
            INSERT INTO ombudsperson_config
                (tid, name, email, telefon, intern, aktiv, erstellt_am)
            VALUES (1, ?, ?, ?, ?, 1, ?)
            """,
            (name, email, telefon, intern, now_iso)
        )

    # ------------------------------------------------------------------
    # 25 Fälle
    # ------------------------------------------------------------------
    for i in range(1, 26):
        idx           = i - 1
        aktenzeichen  = _aktenzeichen(i)
        beschr_tuple  = BESCHREIBUNGEN[idx % len(BESCHREIBUNGEN)]
        kategorie     = beschr_tuple[0]
        beschreibung  = beschr_tuple[1]
        status        = STATUS_LISTE[idx % len(STATUS_LISTE)]
        prioritaet    = PRIORITAETEN[idx % len(PRIORITAETEN)]
        anonym        = 1 if i % 3 != 0 else 0
        erstellt      = _dt(days_offset=idx * 3)
        aktualisiert  = _dt(days_offset=idx * 3 + 5)
        abgeschlossen = aktualisiert if status in ("abgeschlossen", "abgelehnt") else None
        frist_eingang = _dt(days_offset=idx * 3 + 7)
        frist_rueck   = _dt(days_offset=idx * 3 + 90)
        hinweisgeber_email = f"hinweisgeber{i:02d}@beispiel.de" if not anonym else None
        hinweisgeber_name  = f"Anonyme Person {i}" if anonym else f"Hinweisgeber {i}"

        session.execute(
            """
            INSERT INTO hinweis_cases
                (tid, aktenzeichen, status, kategorie, beschreibung,
                 zusammenfassung, anonym, hinweisgeber_email, hinweisgeber_name,
                 prioritaet, interne_notizen,
                 erstellt_am, aktualisiert_am, abgeschlossen_am,
                 frist_eingang, frist_rueckmeldung)
            VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                aktenzeichen,
                status,
                kategorie,
                beschreibung,
                f"Hinweis zu {kategorie.replace('_', ' ').capitalize()} – Fall {i}",
                anonym,
                hinweisgeber_email,
                hinweisgeber_name,
                prioritaet,
                f"Interne Notiz zu Fall {aktenzeichen}: Weitere Prüfung erforderlich.",
                erstellt,
                aktualisiert,
                abgeschlossen,
                frist_eingang,
                frist_rueck,
            )
        )

        case_row = session.execute(
            "SELECT id FROM hinweis_cases WHERE aktenzeichen = ?",
            (aktenzeichen,)
        ).fetchone()
        case_id = case_row[0]

        # History: 2–4 Einträge je Fall
        num_history = 2 + (i % 3)
        prev_status = None
        for h in range(num_history):
            new_status = STATUS_LISTE[h % len(STATUS_LISTE)]
            ts = _dt(days_offset=idx * 3 + h * 2)
            aktion = AKTIONEN[h % len(AKTIONEN)]
            session.execute(
                """
                INSERT INTO hinweis_case_history
                    (case_id, alter_status, neuer_status, aktion,
                     benutzer_id, kommentar, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    case_id,
                    prev_status,
                    new_status,
                    aktion,
                    1,
                    f"Automatisch generierter Kommentar – Schritt {h + 1} für {aktenzeichen}.",
                    ts,
                )
            )
            prev_status = new_status

        # Fristen: 7-Tage-Eingangs­frist + 90-Tage-Rückmelde­frist
        erledigt_eingang = frist_eingang if status not in ("eingegangen",) else None
        erledigt_rueck   = frist_rueck   if status in ("abgeschlossen", "rueckmeldung_erteilt") else None

        session.execute(
            """
            INSERT INTO hinweis_fristen
                (case_id, typ, faellig_am, erledigt_am, tage_verbleibend, benachrichtigt)
            VALUES (?, 'eingang', ?, ?, ?, 0)
            """,
            (case_id, frist_eingang, erledigt_eingang, 7 - (i % 8))
        )
        session.execute(
            """
            INSERT INTO hinweis_fristen
                (case_id, typ, faellig_am, erledigt_am, tage_verbleibend, benachrichtigt)
            VALUES (?, 'rueckmeldung', ?, ?, ?, 0)
            """,
            (case_id, frist_rueck, erledigt_rueck, 90 - (i * 3 % 91))
        )

    session.commit()
