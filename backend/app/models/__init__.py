"""
aitema|Hinweis - Datenbankmodelle
SQLAlchemy ORM Models fuer das Hinweisgebersystem.
"""

from sqlalchemy.orm import DeclarativeBase, MappedAsDataclass
from sqlalchemy import MetaData

# Naming-Konvention fuer konsistente Constraint-Namen
convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

metadata = MetaData(naming_convention=convention)


class Base(DeclarativeBase):
    """Basis-Klasse fuer alle SQLAlchemy-Models."""
    metadata = metadata


# Alle Models importieren, damit Alembic sie erkennt
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.models.hinweis import Hinweis, HinweisKategorie, HinweisPrioritaet, HinweisStatus
from app.models.case import Case, CaseStatus, CaseEvent, OmbudspersonEmpfehlung
from app.models.audit_log import AuditLog, AuditAction
from app.models.attachment import Attachment

__all__ = [
    "Base",
    "Tenant",
    "User",
    "UserRole",
    "Hinweis",
    "HinweisKategorie",
    "HinweisPrioritaet",
    "HinweisStatus",
    "Case",
    "CaseStatus",
    "CaseEvent",
    "OmbudspersonEmpfehlung",
    "AuditLog",
    "AuditAction",
    "Attachment",
]
