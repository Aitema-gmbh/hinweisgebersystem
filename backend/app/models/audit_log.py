"""
aitema|Hinweis - Audit Log Model
Revisionssichere Protokollierung aller Aktionen.
"""

import uuid
import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    String, DateTime, Text, Enum, ForeignKey,
    func, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSON, INET

from app.models import Base


class AuditAction(str, enum.Enum):
    """Kategorien fuer Audit-Eintraege."""
    # Authentifizierung
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    LOGOUT = "logout"
    MFA_ENABLED = "mfa_enabled"
    MFA_DISABLED = "mfa_disabled"
    PASSWORD_CHANGED = "password_changed"
    PASSWORD_RESET = "password_reset"
    ACCOUNT_LOCKED = "account_locked"
    ACCOUNT_UNLOCKED = "account_unlocked"

    # Hinweismeldungen
    SUBMISSION_CREATED = "submission_created"
    SUBMISSION_VIEWED = "submission_viewed"
    SUBMISSION_UPDATED = "submission_updated"
    SUBMISSION_DELETED = "submission_deleted"
    EINGANGSBESTAETIGUNG_SENT = "eingangsbestaetigung_sent"
    RUECKMELDUNG_SENT = "rueckmeldung_sent"

    # Fallbearbeitung
    CASE_CREATED = "case_created"
    CASE_ASSIGNED = "case_assigned"
    CASE_STATUS_CHANGED = "case_status_changed"
    CASE_CLOSED = "case_closed"
    CASE_ESCALATED = "case_escalated"
    CASE_NOTE_ADDED = "case_note_added"

    # Dateien
    ATTACHMENT_UPLOADED = "attachment_uploaded"
    ATTACHMENT_DOWNLOADED = "attachment_downloaded"
    ATTACHMENT_DELETED = "attachment_deleted"

    # Administration
    USER_CREATED = "user_created"
    USER_UPDATED = "user_updated"
    USER_DELETED = "user_deleted"
    TENANT_CREATED = "tenant_created"
    TENANT_UPDATED = "tenant_updated"
    SYSTEM_CONFIG_CHANGED = "system_config_changed"

    # Datenexport
    DATA_EXPORTED = "data_exported"
    REPORT_GENERATED = "report_generated"

    # Sicherheit
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    UNAUTHORIZED_ACCESS = "unauthorized_access"


class AuditLog(Base):
    """
    Revisionssicherer Audit-Trail.

    Protokolliert alle sicherheitsrelevanten Aktionen
    im System gemaess BSI-Grundschutz und HinSchG.

    Eintraege koennen NICHT geaendert oder geloescht werden
    (nur INSERT, kein UPDATE/DELETE auf Applikationsebene).
    """

    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="SET NULL")
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )

    # Aktion
    action: Mapped[AuditAction] = mapped_column(
        Enum(AuditAction, name="audit_action_enum"), nullable=False
    )
    resource_type: Mapped[Optional[str]] = mapped_column(
        String(50)
    )  # "hinweis", "case", "user", "tenant", "attachment"
    resource_id: Mapped[Optional[str]] = mapped_column(String(36))  # UUID als String

    # Details
    description: Mapped[Optional[str]] = mapped_column(Text)
    details: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    changes: Mapped[Optional[dict]] = mapped_column(
        JSON
    )  # {"field": {"old": "...", "new": "..."}}

    # Request-Kontext
    ip_address: Mapped[Optional[str]] = mapped_column(INET)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500))
    request_method: Mapped[Optional[str]] = mapped_column(String(10))
    request_path: Mapped[Optional[str]] = mapped_column(String(500))
    request_id: Mapped[Optional[str]] = mapped_column(String(36))

    # Ergebnis
    success: Mapped[bool] = mapped_column(default=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text)

    # Zeitstempel (unveraenderlich)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Beziehungen (nur Lese-Referenzen)
    tenant: Mapped[Optional["Tenant"]] = relationship("Tenant", viewonly=True)
    user: Mapped[Optional["User"]] = relationship("User", viewonly=True)

    __table_args__ = (
        Index("ix_audit_logs_tenant_action", "tenant_id", "action"),
        Index("ix_audit_logs_user", "user_id"),
        Index("ix_audit_logs_resource", "resource_type", "resource_id"),
        Index("ix_audit_logs_created", "created_at"),
        Index("ix_audit_logs_tenant_created", "tenant_id", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<AuditLog(action={self.action.value\!r}, user={self.user_id\!r})>"
