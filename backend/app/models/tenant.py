"""
aitema|Hinweis - Tenant Model
Multi-Tenant-Verwaltung mit DB-per-Tenant Unterstuetzung.
"""

import uuid
from datetime import datetime
from typing import Optional, List

from sqlalchemy import (
    String, Boolean, DateTime, Text, Integer, JSON,
    func, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.models import Base


class Tenant(Base):
    """
    Mandant im Hinweisgebersystem.

    Jeder Mandant (Organisation) hat:
    - Eigene Konfiguration
    - Eigene Benutzer
    - Eigene Hinweismeldungen
    - Optional eigene Datenbank (DB-per-Tenant)
    """

    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    slug: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[Optional[str]] = mapped_column(String(255))

    # Kontaktdaten der Organisation
    organization_type: Mapped[Optional[str]] = mapped_column(
        String(50)
    )  # "behoerde", "unternehmen", "verein"
    organization_size: Mapped[Optional[str]] = mapped_column(
        String(20)
    )  # "small" (<50), "medium" (50-249), "large" (250+)
    street: Mapped[Optional[str]] = mapped_column(String(255))
    city: Mapped[Optional[str]] = mapped_column(String(100))
    postal_code: Mapped[Optional[str]] = mapped_column(String(10))
    country: Mapped[str] = mapped_column(String(2), default="DE")
    contact_email: Mapped[Optional[str]] = mapped_column(String(255))
    contact_phone: Mapped[Optional[str]] = mapped_column(String(50))

    # Datenbankverbindung (fuer DB-per-Tenant)
    database_url: Mapped[Optional[str]] = mapped_column(Text)
    database_schema: Mapped[Optional[str]] = mapped_column(String(100))

    # Konfiguration
    config: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    custom_branding: Mapped[Optional[dict]] = mapped_column(
        JSON, default=dict
    )  # Logo, Farben, Texte
    enabled_features: Mapped[Optional[dict]] = mapped_column(
        JSON, default=dict
    )  # Feature-Flags

    # HinSchG-spezifische Konfiguration
    ombudsperson_name: Mapped[Optional[str]] = mapped_column(String(255))
    ombudsperson_email: Mapped[Optional[str]] = mapped_column(String(255))
    hinschg_eingangsbestaetigung_tage: Mapped[int] = mapped_column(Integer, default=7)
    hinschg_rueckmeldung_tage: Mapped[int] = mapped_column(Integer, default=90)
    datenschutz_hinweis: Mapped[Optional[str]] = mapped_column(Text)

    # Status & Metadaten
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_trial: Mapped[bool] = mapped_column(Boolean, default=False)
    trial_ends_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    max_users: Mapped[int] = mapped_column(Integer, default=10)
    max_cases_per_month: Mapped[int] = mapped_column(Integer, default=100)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Beziehungen
    users: Mapped[List["User"]] = relationship(
        "User", back_populates="tenant", cascade="all, delete-orphan"
    )
    hinweise: Mapped[List["Hinweis"]] = relationship(
        "Hinweis", back_populates="tenant", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_tenants_active", "is_active"),
        Index("ix_tenants_slug_active", "slug", "is_active"),
    )

    def __repr__(self) -> str:
        return f"<Tenant(slug={self.slug!r}, name={self.name!r})>"

    @property
    def is_hinschg_pflichtig(self) -> bool:
        """Pruefen ob der Mandant HinSchG-pflichtig ist (>= 50 Beschaeftigte)."""
        return self.organization_size in ("medium", "large")
