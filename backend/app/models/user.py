"""
aitema|Hinweis - User Model
Benutzerverwaltung mit Rollen: Ombudsperson, Melder, Admin, Fallbearbeiter.
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


class UserRole(str, enum.Enum):
    """Benutzerrollen gemaess HinSchG."""
    ADMIN = "admin"                    # Systemadministrator
    OMBUDSPERSON = "ombudsperson"      # Hinweisgeberschutzbeauftragte/r
    FALLBEARBEITER = "fallbearbeiter"  # Sachbearbeiter/in
    MELDER = "melder"                  # Hinweisgeber/in (registriert)
    AUDITOR = "auditor"               # Pruefer/in (nur Leserecht)


class User(Base):
    """
    Benutzer im Hinweisgebersystem.

    Rollen:
    - Admin: Systemverwaltung, Mandantenkonfiguration
    - Ombudsperson: Empfang und Bewertung von Hinweisen
    - Fallbearbeiter: Bearbeitung zugewiesener Faelle
    - Melder: Registrierter Hinweisgeber (optional, auch anonym moeglich)
    - Auditor: Nur-Lese-Zugriff fuer Revision
    """

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )

    # Authentifizierung
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(512), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role_enum"), nullable=False, default=UserRole.FALLBEARBEITER
    )

    # Persoenliche Daten
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    display_name: Mapped[Optional[str]] = mapped_column(String(200))
    phone: Mapped[Optional[str]] = mapped_column(String(50))
    department: Mapped[Optional[str]] = mapped_column(String(100))
    position: Mapped[Optional[str]] = mapped_column(String(100))

    # MFA
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    mfa_secret: Mapped[Optional[str]] = mapped_column(String(255))
    mfa_backup_codes: Mapped[Optional[dict]] = mapped_column(JSON)

    # Benachrichtigungseinstellungen
    notification_preferences: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)

    # Sicherheit
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    last_login_ip: Mapped[Optional[str]] = mapped_column(String(45))
    password_changed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=False)

    # Metadaten
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Beziehungen
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="users")
    assigned_cases: Mapped[List["Case"]] = relationship(
        "Case", back_populates="assignee", foreign_keys="Case.assignee_id"
    )

    __table_args__ = (
        Index("ix_users_tenant_email", "tenant_id", "email", unique=True),
        Index("ix_users_tenant_role", "tenant_id", "role"),
        Index("ix_users_active", "is_active"),
    )

    def __repr__(self) -> str:
        return f"<User(email={self.email!r}, role={self.role.value!r})>"

    @property
    def full_name(self) -> str:
        """Vollstaendiger Name."""
        return f"{self.first_name} {self.last_name}"

    @property
    def is_locked(self) -> bool:
        """Pruefen ob der Account gesperrt ist."""
        if self.locked_until is None:
            return False
        return datetime.now(self.locked_until.tzinfo) < self.locked_until

    def has_permission(self, permission: str) -> bool:
        """Pruefen ob der Benutzer eine bestimmte Berechtigung hat."""
        role_permissions = {
            UserRole.ADMIN: {
                "manage_tenants", "manage_users", "view_all_cases",
                "manage_system", "view_audit_logs", "manage_cases",
                "view_submissions", "export_data",
            },
            UserRole.OMBUDSPERSON: {
                "view_submissions", "manage_cases", "assign_cases",
                "view_audit_logs", "export_data", "view_all_cases",
                "send_notifications",
            },
            UserRole.FALLBEARBEITER: {
                "view_assigned_cases", "manage_cases", "add_case_notes",
                "upload_attachments",
            },
            UserRole.MELDER: {
                "create_submission", "view_own_submissions", "add_followup",
            },
            UserRole.AUDITOR: {
                "view_all_cases", "view_audit_logs", "view_submissions",
                "export_data",
            },
        }
        return permission in role_permissions.get(self.role, set())
