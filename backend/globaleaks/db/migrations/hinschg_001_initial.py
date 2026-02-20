"""
hinschg_001_initial
-------------------
Creates all HinSchG tables and indices in SQLite.
Tables mirror the SQLAlchemy models defined in
globaleaks/models/hinschg/__init__.py and
globaleaks/models/hinschg/tenant_settings.py
"""


DDL = [

    # ------------------------------------------------------------------ #
    #  hinweis_cases                                                       #
    # ------------------------------------------------------------------ #
    """
    CREATE TABLE IF NOT EXISTS hinweis_cases (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        tid                 INTEGER NOT NULL DEFAULT 1,
        aktenzeichen        TEXT    NOT NULL UNIQUE,
        status              TEXT    NOT NULL DEFAULT 'eingegangen',
        kategorie           TEXT    NOT NULL DEFAULT 'sonstige',
        beschreibung        TEXT    NOT NULL DEFAULT '',
        zusammenfassung     TEXT    NOT NULL DEFAULT '',
        anonym              INTEGER NOT NULL DEFAULT 1,
        hinweisgeber_email  TEXT             DEFAULT NULL,
        hinweisgeber_name   TEXT             DEFAULT NULL,
        zustaendig_id       INTEGER          DEFAULT NULL,
        prioritaet          TEXT    NOT NULL DEFAULT 'normal',
        interne_notizen     TEXT    NOT NULL DEFAULT '',
        erstellt_am         TEXT    NOT NULL,
        aktualisiert_am     TEXT    NOT NULL,
        abgeschlossen_am    TEXT             DEFAULT NULL,
        frist_eingang       TEXT             DEFAULT NULL,
        frist_rueckmeldung  TEXT             DEFAULT NULL
    )
    """,

    # ------------------------------------------------------------------ #
    #  hinweis_case_history                                                #
    # ------------------------------------------------------------------ #
    """
    CREATE TABLE IF NOT EXISTS hinweis_case_history (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id     INTEGER NOT NULL,
        alter_status TEXT            DEFAULT NULL,
        neuer_status TEXT            DEFAULT NULL,
        aktion      TEXT    NOT NULL DEFAULT '',
        benutzer_id INTEGER          DEFAULT NULL,
        kommentar   TEXT    NOT NULL DEFAULT '',
        timestamp   TEXT    NOT NULL,
        FOREIGN KEY (case_id) REFERENCES hinweis_cases(id)
    )
    """,

    # ------------------------------------------------------------------ #
    #  hinweis_fristen                                                     #
    # ------------------------------------------------------------------ #
    """
    CREATE TABLE IF NOT EXISTS hinweis_fristen (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id             INTEGER NOT NULL,
        typ                 TEXT    NOT NULL DEFAULT 'eingang',
        faellig_am          TEXT    NOT NULL,
        erledigt_am         TEXT             DEFAULT NULL,
        tage_verbleibend    INTEGER          DEFAULT NULL,
        benachrichtigt      INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (case_id) REFERENCES hinweis_cases(id)
    )
    """,

    # ------------------------------------------------------------------ #
    #  ombudsperson_config                                                 #
    # ------------------------------------------------------------------ #
    """
    CREATE TABLE IF NOT EXISTS ombudsperson_config (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        tid         INTEGER NOT NULL DEFAULT 1,
        name        TEXT    NOT NULL DEFAULT '',
        email       TEXT    NOT NULL DEFAULT '',
        telefon     TEXT    NOT NULL DEFAULT '',
        intern      INTEGER NOT NULL DEFAULT 1,
        aktiv       INTEGER NOT NULL DEFAULT 1,
        erstellt_am TEXT    NOT NULL
    )
    """,

    # ------------------------------------------------------------------ #
    #  hinschg_reports                                                     #
    # ------------------------------------------------------------------ #
    """
    CREATE TABLE IF NOT EXISTS hinschg_reports (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        tid         INTEGER NOT NULL DEFAULT 1,
        berichtsjahr INTEGER NOT NULL,
        erstellt_am TEXT    NOT NULL,
        daten_json  TEXT    NOT NULL DEFAULT '{}'
    )
    """,

    # ------------------------------------------------------------------ #
    #  hinschg_tenant_settings                                             #
    # ------------------------------------------------------------------ #
    """
    CREATE TABLE IF NOT EXISTS hinschg_tenant_settings (
        id                          INTEGER PRIMARY KEY AUTOINCREMENT,
        tid                         INTEGER NOT NULL UNIQUE DEFAULT 1,
        eingangsbestaetigung_tage   INTEGER NOT NULL DEFAULT 7,
        rueckmeldung_tage           INTEGER NOT NULL DEFAULT 90,
        aufbewahrung_jahre          INTEGER NOT NULL DEFAULT 5,
        ombudsperson_intern         INTEGER NOT NULL DEFAULT 1,
        anonyme_meldungen           INTEGER NOT NULL DEFAULT 1,
        pflichtfelder_json          TEXT    NOT NULL DEFAULT '[]',
        benachrichtigungs_email     TEXT    NOT NULL DEFAULT '',
        aktiv                       INTEGER NOT NULL DEFAULT 1,
        erstellt_am                 TEXT    NOT NULL,
        aktualisiert_am             TEXT    NOT NULL
    )
    """,

    # ------------------------------------------------------------------ #
    #  Indices                                                             #
    # ------------------------------------------------------------------ #
    "CREATE INDEX IF NOT EXISTS idx_hinweis_cases_tid    ON hinweis_cases(tid)",
    "CREATE INDEX IF NOT EXISTS idx_hinweis_cases_status ON hinweis_cases(status)",
    "CREATE INDEX IF NOT EXISTS idx_hinweis_cases_frist  ON hinweis_cases(frist_rueckmeldung)",
    "CREATE INDEX IF NOT EXISTS idx_case_history_case_id ON hinweis_case_history(case_id)",
    "CREATE INDEX IF NOT EXISTS idx_fristen_case_id      ON hinweis_fristen(case_id)",
    "CREATE INDEX IF NOT EXISTS idx_fristen_faellig      ON hinweis_fristen(faellig_am)",
    "CREATE INDEX IF NOT EXISTS idx_ombuds_tid           ON ombudsperson_config(tid)",
    "CREATE INDEX IF NOT EXISTS idx_reports_tid_jahr     ON hinschg_reports(tid, berichtsjahr)",
    "CREATE INDEX IF NOT EXISTS idx_tenant_settings_tid  ON hinschg_tenant_settings(tid)",
]


def upgrade(session):
    """Execute all DDL statements."""
    for statement in DDL:
        session.execute(statement.strip())
    session.commit()
