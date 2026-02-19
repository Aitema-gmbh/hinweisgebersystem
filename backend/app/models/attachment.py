"""
aitema|Hinweis - Attachment Model
Verschluesselte Dateianhänge fuer Hinweismeldungen.
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    String, Boolean, DateTime, Text, Integer, BigInteger, ForeignKey,
    func, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.models import Base


# Erlaubte MIME-Types (Sicherheit)
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "text/plain",
    "text/csv",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # .docx
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  # .xlsx
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",  # .pptx
    "application/vnd.oasis.opendocument.text",  # .odt
    "application/vnd.oasis.opendocument.spreadsheet",  # .ods
    "message/rfc822",  # .eml
    "application/zip",
    "audio/mpeg",
    "audio/wav",
    "video/mp4",
}

# Maximale Dateigroesse pro Datei (50 MB)
MAX_FILE_SIZE = 50 * 1024 * 1024


class Attachment(Base):
    """
    Verschluesselter Dateianhang zu einer Hinweismeldung.

    Dateien werden:
    1. Auf Viren geprueft (ClamAV)
    2. MIME-Type validiert (Magic Bytes)
    3. Mit AES-256-GCM verschluesselt
    4. Auf dem Dateisystem gespeichert (nicht in der DB)
    5. Metadaten getrennt von Inhalt gespeichert
    """

    __tablename__ = "attachments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    hinweis_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("hinweise.id", ondelete="CASCADE"), nullable=False
    )
    uploaded_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )

    # Datei-Metadaten
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_filename: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False
    )  # UUID-basiert, kein Rueckschluss auf Original
    mime_type: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    file_extension: Mapped[str] = mapped_column(String(20), nullable=False)

    # Verschluesselung
    encryption_key_id: Mapped[str] = mapped_column(
        String(64), nullable=False
    )  # Referenz auf den Verschluesselungsschluessel
    encryption_iv: Mapped[str] = mapped_column(
        String(64), nullable=False
    )  # Initialisierungsvektor (Base64)
    encryption_tag: Mapped[str] = mapped_column(
        String(64), nullable=False
    )  # Authentifizierungs-Tag (Base64)

    # Integritaet
    checksum_sha256: Mapped[str] = mapped_column(
        String(64), nullable=False
    )  # SHA-256 des Klartexts
    checksum_encrypted: Mapped[str] = mapped_column(
        String(64), nullable=False
    )  # SHA-256 des Ciphertexts

    # Virenscanner
    virus_scanned: Mapped[bool] = mapped_column(Boolean, default=False)
    virus_scan_result: Mapped[Optional[str]] = mapped_column(String(100))
    virus_scanned_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # Speicherort
    storage_path: Mapped[str] = mapped_column(
        Text, nullable=False
    )  # Relativer Pfad im Upload-Verzeichnis
    storage_backend: Mapped[str] = mapped_column(
        String(20), default="local"
    )  # "local", "s3"

    # Beschreibung
    description: Mapped[Optional[str]] = mapped_column(String(500))

    # Status
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # Zugriffs-Tracking
    download_count: Mapped[int] = mapped_column(Integer, default=0)
    last_accessed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # Zeitstempel
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Beziehungen
    hinweis: Mapped["Hinweis"] = relationship("Hinweis", back_populates="attachments")
    uploaded_by: Mapped[Optional["User"]] = relationship("User")

    __table_args__ = (
        Index("ix_attachments_hinweis", "hinweis_id"),
        Index("ix_attachments_stored_filename", "stored_filename"),
    )

    def __repr__(self) -> str:
        return f"<Attachment(filename={self.original_filename!r}, size={self.file_size})>"

    @property
    def file_size_human(self) -> str:
        """Menschenlesbare Dateigroesse."""
        size = self.file_size
        for unit in ("B", "KB", "MB", "GB"):
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.1f} TB"

    @classmethod
    def is_allowed_mime_type(cls, mime_type: str) -> bool:
        """Prueft ob der MIME-Type erlaubt ist."""
        return mime_type in ALLOWED_MIME_TYPES

    @classmethod
    def is_allowed_file_size(cls, size: int) -> bool:
        """Prueft ob die Dateigroesse erlaubt ist."""
        return 0 < size <= MAX_FILE_SIZE
