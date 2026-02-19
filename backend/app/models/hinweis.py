"""
aitema|Hinweis - Hinweismeldung Model
HinSchG-konforme Hinweismeldung mit allen gesetzlichen Pflichtfeldern.
"""

import uuid
import enum
import secrets
from datetime import datetime, timedelta
from typing import Optional, List

from sqlalchemy import (
    String, Boolean, DateTime, Text, Integer, Enum, ForeignKey,
    func, Index, CheckConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSON, ARRAY

from app.models import Base


class HinweisStatus(str, enum.Enum):
    """Status-Workflow einer Hinweismeldung gemaess HinSchG."""
    EINGEGANGEN = "eingegangen"                  # Neu eingegangen
    EINGANGSBESTAETIGUNG = "eingangsbestaetigung" # Eingangsbestaetigung versendet (7 Tage)
    IN_PRUEFUNG = "in_pruefung"                  # Wird geprueft
    IN_BEARBEITUNG = "in_bearbeitung"            # Fall eroeffnet, in Bearbeitung
    RUECKMELDUNG = "rueckmeldung"                # Rueckmeldung an Melder (3 Monate)
    ABGESCHLOSSEN = "abgeschlossen"              # Abgeschlossen
    ABGELEHNT = "abgelehnt"                      # Nicht im Anwendungsbereich
    WEITERGELEITET = "weitergeleitet"            # An zustaendige Stelle weitergeleitet


class HinweisKategorie(str, enum.Enum):
    """Kategorien gemaess HinSchG Paragraf 2 - Sachlicher Anwendungsbereich."""
    KORRUPTION = "korruption"
    BETRUG = "betrug"
    GELDWAESCHE = "geldwaesche"
    STEUERHINTERZIEHUNG = "steuerhinterziehung"
    UMWELTVERSTOSS = "umweltverstoss"
    VERBRAUCHERSCHUTZ = "verbraucherschutz"
    DATENSCHUTZ = "datenschutz"
    DISKRIMINIERUNG = "diskriminierung"
    ARBEITSSICHERHEIT = "arbeitssicherheit"
    PRODUKTSICHERHEIT = "produktsicherheit"
    LEBENSMITTELSICHERHEIT = "lebensmittelsicherheit"
    VERGABERECHT = "vergaberecht"
    WETTBEWERBSRECHT = "wettbewerbsrecht"
    FINANZDIENSTLEISTUNGEN = "finanzdienstleistungen"
    KERNSICHERHEIT = "kernsicherheit"
    TIERGESUNDHEIT = "tiergesundheit"
    SONSTIGES = "sonstiges"


class HinweisPrioritaet(str, enum.Enum):
    """Prioritaet der Meldung."""
    NIEDRIG = "niedrig"
    MITTEL = "mittel"
    HOCH = "hoch"
    KRITISCH = "kritisch"


class Hinweis(Base):
    """
    Hinweismeldung gemaess Hinweisgeberschutzgesetz (HinSchG).

    Kernfelder nach HinSchG:
    - Eingangsbestaetigung: max. 7 Tage (Paragraf 17 Abs. 1 S. 2)
    - Rueckmeldung: max. 3 Monate (Paragraf 17 Abs. 2)
    - Anonyme Meldung moeglich (Paragraf 16 Abs. 1)
    - Vertraulichkeit der Identitaet (Paragraf 8)
    """

    __tablename__ = "hinweise"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )

    # Anonymer Zugangs-Code (fuer Melder zum Status-Check)
    access_code: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False,
        default=lambda: secrets.token_urlsafe(32)
    )
    # Menschenlesbarer Referenz-Code
    reference_code: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False
    )

    # Melder (optional - bei anonymer Meldung leer)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=True)
    melder_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    # Verschluesselte Kontaktdaten des Melders (wenn angegeben)
    melder_name_encrypted: Mapped[Optional[str]] = mapped_column(Text)
    melder_email_encrypted: Mapped[Optional[str]] = mapped_column(Text)
    melder_phone_encrypted: Mapped[Optional[str]] = mapped_column(Text)
    melder_preferred_channel: Mapped[Optional[str]] = mapped_column(
        String(20)
    )  # "email", "portal", "telefon"

    # Meldungsinhalt (verschluesselt gespeichert)
    titel: Mapped[str] = mapped_column(String(500), nullable=False)
    beschreibung_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    kategorie: Mapped[HinweisKategorie] = mapped_column(
        Enum(HinweisKategorie, name="hinweis_kategorie_enum"),
        nullable=False,
        default=HinweisKategorie.SONSTIGES,
    )
    prioritaet: Mapped[HinweisPrioritaet] = mapped_column(
        Enum(HinweisPrioritaet, name="hinweis_prioritaet_enum"),
        nullable=False,
        default=HinweisPrioritaet.MITTEL,
    )
    status: Mapped[HinweisStatus] = mapped_column(
        Enum(HinweisStatus, name="hinweis_status_enum"),
        nullable=False,
        default=HinweisStatus.EINGEGANGEN,
    )

    # Betroffene Stellen / Personen (verschluesselt)
    betroffene_personen_encrypted: Mapped[Optional[str]] = mapped_column(Text)
    betroffene_abteilung: Mapped[Optional[str]] = mapped_column(String(200))
    zeitraum_von: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    zeitraum_bis: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    schaetzung_schaden: Mapped[Optional[str]] = mapped_column(String(100))

    # Tags / Schlagworte
    tags: Mapped[Optional[list]] = mapped_column(ARRAY(String), default=list)

    # === HinSchG Fristen ===
    # Paragraf 17 Abs. 1 S. 2: Eingangsbestaetigung innerhalb von 7 Tagen
    eingegangen_am: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    eingangsbestaetigung_frist: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    eingangsbestaetigung_gesendet_am: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True)
    )

    # Paragraf 17 Abs. 2: Rueckmeldung innerhalb von 3 Monaten
    rueckmeldung_frist: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    rueckmeldung_gesendet_am: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True)
    )

    # Aufbewahrungsfrist (Paragraf 11 Abs. 5: 3 Jahre nach Abschluss)
    aufbewahrung_bis: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    loeschung_geplant_am: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # Metadaten
    quelle: Mapped[str] = mapped_column(
        String(20), default="web"
    )  # "web", "email", "telefon", "brief", "persoenlich"
    sprache: Mapped[str] = mapped_column(String(5), default="de")
    ip_hash: Mapped[Optional[str]] = mapped_column(
        String(64)
    )  # Gehashte IP (kein Klartext\!)
    user_agent_hash: Mapped[Optional[str]] = mapped_column(String(64))

    # Interne Bewertung
    interne_notizen_encrypted: Mapped[Optional[str]] = mapped_column(Text)
    compliance_relevant: Mapped[bool] = mapped_column(Boolean, default=False)
    extern_weitergeleitet: Mapped[bool] = mapped_column(Boolean, default=False)
    weitergeleitet_an: Mapped[Optional[str]] = mapped_column(String(255))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Beziehungen
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="hinweise")
    melder: Mapped[Optional["User"]] = relationship("User", foreign_keys=[melder_id])
    case: Mapped[Optional["Case"]] = relationship(
        "Case", back_populates="hinweis", uselist=False
    )
    attachments: Mapped[List["Attachment"]] = relationship(
        "Attachment", back_populates="hinweis", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_hinweise_tenant_status", "tenant_id", "status"),
        Index("ix_hinweise_tenant_kategorie", "tenant_id", "kategorie"),
        Index("ix_hinweise_eingangsbestaetigung_frist", "eingangsbestaetigung_frist"),
        Index("ix_hinweise_rueckmeldung_frist", "rueckmeldung_frist"),
        Index("ix_hinweise_access_code", "access_code"),
        Index("ix_hinweise_reference_code", "reference_code"),
        CheckConstraint(
            "eingangsbestaetigung_frist > eingegangen_am",
            name="ck_eingangsbestaetigung_nach_eingang",
        ),
    )

    def __repr__(self) -> str:
        return f"<Hinweis(ref={self.reference_code\!r}, status={self.status.value\!r})>"

    @staticmethod
    def generate_reference_code() -> str:
        """Generiert einen menschenlesbaren Referenz-Code (z.B. HW-2026-A3K9)."""
        year = datetime.now().year
        random_part = secrets.token_hex(2).upper()
        return f"HW-{year}-{random_part}"

    @property
    def eingangsbestaetigung_ueberfaellig(self) -> bool:
        """Prueft ob die 7-Tage-Frist fuer die Eingangsbestaetigung ueberschritten ist."""
        if self.eingangsbestaetigung_gesendet_am is not None:
            return False
        return datetime.now(self.eingangsbestaetigung_frist.tzinfo) > self.eingangsbestaetigung_frist

    @property
    def rueckmeldung_ueberfaellig(self) -> bool:
        """Prueft ob die 3-Monate-Frist fuer die Rueckmeldung ueberschritten ist."""
        if self.rueckmeldung_gesendet_am is not None:
            return False
        if self.status in (HinweisStatus.ABGESCHLOSSEN, HinweisStatus.ABGELEHNT):
            return False
        return datetime.now(self.rueckmeldung_frist.tzinfo) > self.rueckmeldung_frist

    @property
    def tage_seit_eingang(self) -> int:
        """Anzahl Tage seit Eingang der Meldung."""
        delta = datetime.now(self.eingegangen_am.tzinfo) - self.eingegangen_am
        return delta.days
