"""
aitema|Hinweis - Tenant Manager
DB-per-Tenant Logik fuer Multi-Mandanten-Betrieb.
"""

import os
from typing import Optional

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, scoped_session
from flask import Flask
import structlog

from app.models import Base

log = structlog.get_logger()


class TenantManager:
    """
    Verwaltet die Multi-Tenant-Architektur.

    Unterstuetzt drei Isolationsmodi:
    1. database: Eigene Datenbank pro Tenant (hoechste Isolation)
    2. schema: Eigenes Schema pro Tenant (mittlere Isolation)
    3. row: Zeilenbasierte Isolation mit tenant_id (geringste Isolation)
    """

    def __init__(self, app: Flask):
        self.app = app
        self.isolation_mode = os.environ.get("TENANT_ISOLATION_MODE", "row")
        self._tenant_engines: dict[str, any] = {}
        self._tenant_sessions: dict[str, scoped_session] = {}

    def initialize_tenant(self, tenant) -> None:
        """
        Initialisiert einen neuen Tenant.

        Je nach Isolationsmodus:
        - database: Erstellt eine neue Datenbank
        - schema: Erstellt ein neues Schema
        - row: Nur Eintrag in tenants-Tabelle
        """
        if self.isolation_mode == "database":
            self._create_tenant_database(tenant)
        elif self.isolation_mode == "schema":
            self._create_tenant_schema(tenant)
        else:
            # Row-Level: Keine zusaetzliche Aktion noetig
            log.info("tenant_initialized_row_level", slug=tenant.slug)

    def _create_tenant_database(self, tenant) -> None:
        """Erstellt eine eigene Datenbank fuer den Tenant."""
        db_name = f"hinweis_tenant_{tenant.slug}"

        try:
            # Verbindung zur Master-DB
            engine = self.app.engine

            # Datenbank erstellen (autocommit erforderlich)
            with engine.connect() as conn:
                conn = conn.execution_options(isolation_level="AUTOCOMMIT")
                conn.execute(text(f"CREATE DATABASE \"{db_name}\""))

            # Tabellen in neuer DB erstellen
            master_url = str(engine.url)
            tenant_url = master_url.rsplit("/", 1)[0] + f"/{db_name}"
            tenant_engine = create_engine(tenant_url)
            Base.metadata.create_all(tenant_engine)

            # URL in Tenant speichern
            tenant.database_url = tenant_url

            log.info("tenant_database_created", slug=tenant.slug, db=db_name)

        except Exception as e:
            log.error("tenant_database_creation_failed", slug=tenant.slug, error=str(e))
            raise

    def _create_tenant_schema(self, tenant) -> None:
        """Erstellt ein eigenes Schema fuer den Tenant."""
        schema_name = f"tenant_{tenant.slug}"

        try:
            with self.app.engine.connect() as conn:
                conn = conn.execution_options(isolation_level="AUTOCOMMIT")
                conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS \"{schema_name}\""))

            # Tabellen im neuen Schema erstellen
            schema_metadata = Base.metadata
            for table in schema_metadata.tables.values():
                table.schema = schema_name

            schema_metadata.create_all(self.app.engine)

            # Schema-Name in Tenant speichern
            tenant.database_schema = schema_name

            # Schema zuruecksetzen
            for table in schema_metadata.tables.values():
                table.schema = None

            log.info("tenant_schema_created", slug=tenant.slug, schema=schema_name)

        except Exception as e:
            log.error("tenant_schema_creation_failed", slug=tenant.slug, error=str(e))
            raise

    def get_session(self, tenant_id: str) -> scoped_session:
        """
        Gibt eine DB-Session fuer den angegebenen Tenant zurueck.

        Bei row-Level-Isolation wird die Standard-Session genutzt.
        Bei database/schema-Isolation wird eine tenant-spezifische Session erstellt.
        """
        if self.isolation_mode == "row":
            return self.app.Session

        if tenant_id in self._tenant_sessions:
            return self._tenant_sessions[tenant_id]

        # Tenant-spezifische Session erstellen
        from app.models.tenant import Tenant

        session = self.app.Session()
        tenant = session.query(Tenant).filter(Tenant.slug == tenant_id).first()
        session.close()

        if not tenant:
            return self.app.Session

        if self.isolation_mode == "database" and tenant.database_url:
            engine = create_engine(tenant.database_url)
        elif self.isolation_mode == "schema" and tenant.database_schema:
            engine = self.app.engine.execution_options(
                schema_translate_map={None: tenant.database_schema}
            )
        else:
            return self.app.Session

        factory = sessionmaker(bind=engine, expire_on_commit=False)
        tenant_session = scoped_session(factory)
        self._tenant_sessions[tenant_id] = tenant_session
        return tenant_session

    def cleanup(self) -> None:
        """Bereinigt alle Tenant-Sessions."""
        for session in self._tenant_sessions.values():
            session.remove()
        self._tenant_sessions.clear()
        self._tenant_engines.clear()
