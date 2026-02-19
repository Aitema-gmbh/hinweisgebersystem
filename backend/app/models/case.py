"""
aitema|Hinweis - Case Model
Fallbearbeitung mit Status-Workflow.
"""

import uuid
import enum
from datetime import datetime
from typing import Optional, List

from sqlalchemy import (
    String, Boolean, DateTime, Text, Integer, Enum, ForeignKey,
    func, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSON

from app.models import Base


class CaseStatus(str, enum.Enum):
    """Status-Workflow eines Falls."""
    OFFEN = "offen"                        # Neu eroeffnet
    ZUGEWIESEN = "zugewiesen"              # Fallbearbeiter zugewiesen
    IN_ERMITTLUNG = "in_ermittlung"        # Sachverhalt wird ermittelt
    STELLUNGNAHME = "stellungnahme"        # Stellungnahme eingeholt
    MASSNAHMEN = "massnahmen"              # Folgemaßnahmen definiert
    UMSETZUNG = "umsetzung"               # Massnahmen werden umgesetzt
    ABGESCHLOSSEN = "abgeschlossen"        # Fall abgeschlossen
    EINGESTELLT = "eingestellt"            # Fall eingestellt (unbegründet)
    ESKALIERT = "eskaliert"                # An hoehere Instanz eskaliert


class CaseEvent(Base):
    """
    Ereignis in der Fallbearbeitung.
    Dokumentiert jeden Bearbeitungsschritt revisionssicher.
    """

    __tablename__ = "case_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )

    event_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # "status_change", "note_added", "assignment", "attachment", "notification"

    # Statusaenderung
    old_status: Mapped[Optional[str]] = mapped_column(String(50))
    new_status: Mapped[Optional[str]] = mapped_column(String(50))

    # Beschreibung (verschluesselt fuer sensible Inhalte)
    description: Mapped[Optional[str]] = mapped_column(Text)
    description_encrypted: Mapped[Optional[str]] = mapped_column(Text)

    # Metadaten
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    is_internal: Mapped[bool] = mapped_column(Boolean, default=True)
    is_visible_to_melder: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Beziehungen
    case: Mapped["Case"] = relationship("Case", back_populates="events")
    user: Mapped[Optional["User"]] = relationship("User")

    __table_args__ = (
        Index("ix_case_events_case_id", "case_id"),
        Index("ix_case_events_created", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<CaseEvent(case_id={self.case_id\!r}, type={self.event_type\!r})>"


class Case(Base):
    """
    Fall / Vorgang zur Bearbeitung einer Hinweismeldung.

    Wird aus einem Hinweis eroeffnet und durchlaeuft
    einen definierten Bearbeitungs-Workflow.
    """

    __tablename__ = "cases"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    hinweis_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("hinweise.id", ondelete="CASCADE"),
        nullable=False, unique=True
    )

    # Referenz
    case_number: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)

    # Zuweisung
    assignee_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    created_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )

    # Status
    status: Mapped[CaseStatus] = mapped_column(
        Enum(CaseStatus, name="case_status_enum"),
        nullable=False,
        default=CaseStatus.OFFEN,
    )
    previous_status: Mapped[Optional[str]] = mapped_column(String(50))

    # Inhalt
    titel: Mapped[str] = mapped_column(String(500), nullable=False)
    zusammenfassung_encrypted: Mapped[Optional[str]] = mapped_column(Text)
    ergebnis_encrypted: Mapped[Optional[str]] = mapped_column(Text)
    massnahmen_encrypted: Mapped[Optional[str]] = mapped_column(Text)
    interne_notizen_encrypted: Mapped[Optional[str]] = mapped_column(Text)

    # Bewertung
    begruendet: Mapped[Optional[bool]] = mapped_column(Boolean)
    schweregrad: Mapped[Optional[str]] = mapped_column(String(20))  # "gering", "mittel", "schwer", "kritisch"
    schadenshoehe: Mapped[Optional[str]] = mapped_column(String(100))
    compliance_verstoss: Mapped[bool] = mapped_column(Boolean, default=False)
    straftat_verdacht: Mapped[bool] = mapped_column(Boolean, default=False)

    # Eskalation
    eskaliert: Mapped[bool] = mapped_column(Boolean, default=False)
    eskaliert_an: Mapped[Optional[str]] = mapped_column(String(255))
    eskaliert_am: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # Externe Weitergabe
    extern_gemeldet: Mapped[bool] = mapped_column(Boolean, default=False)
    externe_stelle: Mapped[Optional[str]] = mapped_column(String(255))
    extern_gemeldet_am: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # Zeitstempel
    opened_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    assigned_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Beziehungen
    hinweis: Mapped["Hinweis"] = relationship("Hinweis", back_populates="case")
    assignee: Mapped[Optional["User"]] = relationship(
        "User", back_populates="assigned_cases", foreign_keys=[assignee_id]
    )
    created_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[created_by_id])
    events: Mapped[List["CaseEvent"]] = relationship(
        "CaseEvent", back_populates="case", cascade="all, delete-orphan",
        order_by="CaseEvent.created_at.desc()"
    )

    __table_args__ = (
        Index("ix_cases_tenant_status", "tenant_id", "status"),
        Index("ix_cases_assignee", "assignee_id"),
        Index("ix_cases_case_number", "case_number"),
    )

    def __repr__(self) -> str:
        return f"<Case(number={self.case_number\!r}, status={self.status.value\!r})>"

    @staticmethod
    def generate_case_number(tenant_slug: str) -> str:
        """Generiert eine Fallnummer (z.B. DEFAULT-2026-0001)."""
        import secrets
        year = datetime.now().year
        random_part = secrets.randbelow(10000)
        return f"{tenant_slug.upper()[:10]}-{year}-{random_part:04d}"

    @property
    def bearbeitungsdauer_tage(self) -> Optional[int]:
        """Bearbeitungsdauer in Tagen."""
        if self.closed_at:
            delta = self.closed_at - self.opened_at
            return delta.days
        delta = datetime.now(self.opened_at.tzinfo) - self.opened_at
        return delta.days

    def can_transition_to(self, new_status: CaseStatus) -> bool:
        """Prueft ob ein Statusuebergang erlaubt ist."""
        allowed_transitions = {
            CaseStatus.OFFEN: {CaseStatus.ZUGEWIESEN, CaseStatus.EINGESTELLT},
            CaseStatus.ZUGEWIESEN: {
                CaseStatus.IN_ERMITTLUNG, CaseStatus.EINGESTELLT, CaseStatus.OFFEN
            },
            CaseStatus.IN_ERMITTLUNG: {
                CaseStatus.STELLUNGNAHME, CaseStatus.MASSNAHMEN,
                CaseStatus.ABGESCHLOSSEN, CaseStatus.EINGESTELLT,
                CaseStatus.ESKALIERT,
            },
            CaseStatus.STELLUNGNAHME: {
                CaseStatus.IN_ERMITTLUNG, CaseStatus.MASSNAHMEN,
                CaseStatus.ABGESCHLOSSEN, CaseStatus.ESKALIERT,
            },
            CaseStatus.MASSNAHMEN: {
                CaseStatus.UMSETZUNG, CaseStatus.ABGESCHLOSSEN, CaseStatus.ESKALIERT,
            },
            CaseStatus.UMSETZUNG: {CaseStatus.ABGESCHLOSSEN, CaseStatus.MASSNAHMEN},
            CaseStatus.ABGESCHLOSSEN: set(),  # Endstatus
            CaseStatus.EINGESTELLT: {CaseStatus.OFFEN},  # Kann wiedereroeffnet werden
            CaseStatus.ESKALIERT: {CaseStatus.IN_ERMITTLUNG, CaseStatus.ABGESCHLOSSEN},
        }
        return new_status in allowed_transitions.get(self.status, set())
