"""
HinSchG Migration Runner
Tracks and runs database migrations via _hinschg_migrations table.
"""

import os
import importlib
import logging
from datetime import datetime

log = logging.getLogger(__name__)

MIGRATIONS_TABLE = "_hinschg_migrations"

MIGRATIONS = [
    "hinschg_001_initial",
    "hinschg_002_seed_demo",
]


def ensure_tracking_table(session):
    """Create the migration tracking table if it does not exist."""
    session.execute(
        f"""
        CREATE TABLE IF NOT EXISTS {MIGRATIONS_TABLE} (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            name      TEXT    NOT NULL UNIQUE,
            applied_at TEXT   NOT NULL
        )
        """
    )
    session.commit()


def applied_migrations(session):
    """Return a set of already-applied migration names."""
    rows = session.execute(
        f"SELECT name FROM {MIGRATIONS_TABLE}"
    ).fetchall()
    return {row[0] for row in rows}


def mark_applied(session, name):
    """Record a migration as applied."""
    session.execute(
        f"INSERT INTO {MIGRATIONS_TABLE} (name, applied_at) VALUES (?, ?)",
        (name, datetime.utcnow().isoformat())
    )
    session.commit()


def run_migrations(session):
    """
    Run all pending HinSchG migrations in order.
    Called during GlobaLeaks database setup / upgrade.
    """
    ensure_tracking_table(session)
    done = applied_migrations(session)

    pkg = "globaleaks.db.migrations"

    for migration_name in MIGRATIONS:
        if migration_name in done:
            log.info("HinSchG migration already applied: %s", migration_name)
            continue

        log.info("Applying HinSchG migration: %s", migration_name)
        try:
            module = importlib.import_module(f"{pkg}.{migration_name}")
            module.upgrade(session)
            mark_applied(session, migration_name)
            log.info("HinSchG migration applied successfully: %s", migration_name)
        except Exception as exc:
            log.error(
                "HinSchG migration FAILED: %s — %s", migration_name, exc
            )
            session.rollback()
            raise
