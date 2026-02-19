"""
aitema|Hinweis - Audit Service
Revisionssicherer Audit-Trail und Reporting.
"""

import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from flask import request, current_app
from celery import shared_task
import structlog

from app.models.audit_log import AuditLog, AuditAction

log = structlog.get_logger()


class AuditService:
    """
    Service fuer revisionssichere Protokollierung.

    Alle sicherheitsrelevanten Aktionen werden protokolliert:
    - Wer (User-ID, IP-Adresse)
    - Was (Aktion, betroffene Ressource)
    - Wann (Zeitstempel)
    - Wie (Request-Methode, Pfad)
    - Ergebnis (Erfolg/Fehler)
    """

    @staticmethod
    def log_action(
        action: AuditAction,
        tenant_id: Optional[uuid.UUID] = None,
        user_id: Optional[uuid.UUID] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        description: Optional[str] = None,
        details: Optional[dict] = None,
        changes: Optional[dict] = None,
        success: bool = True,
        error_message: Optional[str] = None,
    ) -> None:
        """
        Erstellt einen Audit-Log-Eintrag.

        Args:
            action: Art der Aktion (AuditAction Enum)
            tenant_id: Mandanten-ID
            user_id: Benutzer-ID
            resource_type: Typ der betroffenen Ressource
            resource_id: ID der betroffenen Ressource
            description: Menschenlesbare Beschreibung
            details: Zusaetzliche Details (JSON)
            changes: Geaenderte Felder mit alten/neuen Werten
            success: Ob die Aktion erfolgreich war
            error_message: Fehlermeldung bei Misserfolg
        """
        session = current_app.Session()
        try:
            # Request-Kontext erfassen
            ip_address = None
            user_agent = None
            request_method = None
            request_path = None
            request_id = None

            try:
                ip_address = request.remote_addr
                user_agent = request.headers.get("User-Agent", "")[:500]
                request_method = request.method
                request_path = request.path
                request_id = request.headers.get("X-Request-ID")
            except RuntimeError:
                # Kein Request-Kontext (z.B. in Celery-Tasks)
                pass

            audit_entry = AuditLog(
                tenant_id=tenant_id,
                user_id=user_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                description=description,
                details=details or {},
                changes=changes,
                ip_address=ip_address,
                user_agent=user_agent,
                request_method=request_method,
                request_path=request_path,
                request_id=request_id,
                success=success,
                error_message=error_message,
            )

            session.add(audit_entry)
            session.commit()

            log.info(
                "audit_logged",
                action=action.value,
                resource_type=resource_type,
                resource_id=resource_id,
                success=success,
            )

        except Exception as e:
            log.error("audit_log_failed", error=str(e), action=action.value)
            session.rollback()
        finally:
            session.close()

    @staticmethod
    def get_audit_trail(
        tenant_id: uuid.UUID,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        user_id: Optional[uuid.UUID] = None,
        action: Optional[AuditAction] = None,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        page: int = 1,
        per_page: int = 50,
    ) -> dict:
        """
        Ruft den Audit-Trail ab mit Filtermoeglichkeiten.

        Returns:
            Dict mit items und pagination
        """
        session = current_app.Session()
        try:
            query = session.query(AuditLog).filter(
                AuditLog.tenant_id == tenant_id
            )

            if resource_type:
                query = query.filter(AuditLog.resource_type == resource_type)
            if resource_id:
                query = query.filter(AuditLog.resource_id == resource_id)
            if user_id:
                query = query.filter(AuditLog.user_id == user_id)
            if action:
                query = query.filter(AuditLog.action == action)
            if from_date:
                query = query.filter(AuditLog.created_at >= from_date)
            if to_date:
                query = query.filter(AuditLog.created_at <= to_date)

            query = query.order_by(AuditLog.created_at.desc())
            total = query.count()
            items = query.offset((page - 1) * per_page).limit(per_page).all()

            return {
                "items": [
                    {
                        "id": str(entry.id),
                        "action": entry.action.value,
                        "resource_type": entry.resource_type,
                        "resource_id": entry.resource_id,
                        "user_id": str(entry.user_id) if entry.user_id else None,
                        "description": entry.description,
                        "success": entry.success,
                        "ip_address": str(entry.ip_address) if entry.ip_address else None,
                        "created_at": entry.created_at.isoformat(),
                    }
                    for entry in items
                ],
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": total,
                    "pages": (total + per_page - 1) // per_page,
                },
            }
        finally:
            session.close()


@shared_task(name="app.services.audit.cleanup_expired_sessions")
def cleanup_expired_sessions():
    """Bereinigt abgelaufene Sessions aus Redis."""
    log.info("cleanup_expired_sessions_started")
    # Redis TTL handhabt dies automatisch, aber wir loggen es
    try:
        redis_client = current_app.redis
        # Zaehle aktive Sessions
        session_keys = redis_client.keys("session:*")
        blocklist_keys = redis_client.keys("blocklist:*")
        log.info(
            "session_cleanup_completed",
            active_sessions=len(session_keys),
            blocked_tokens=len(blocklist_keys),
        )
    except Exception as e:
        log.error("session_cleanup_failed", error=str(e))


@shared_task(name="app.services.audit.generate_daily_report")
def generate_daily_report():
    """Generiert den taeglichen Audit-Bericht."""
    log.info("daily_audit_report_started")

    session = current_app.Session()
    try:
        from sqlalchemy import func
        from app.models.hinweis import Hinweis

        yesterday = datetime.now(timezone.utc) - timedelta(days=1)

        # Aktionen der letzten 24 Stunden zaehlen
        action_counts = dict(
            session.query(AuditLog.action, func.count(AuditLog.id))
            .filter(AuditLog.created_at >= yesterday)
            .group_by(AuditLog.action)
            .all()
        )

        # Fehlgeschlagene Logins
        failed_logins = action_counts.get(AuditAction.LOGIN_FAILED, 0)

        log.info(
            "daily_audit_report_generated",
            total_actions=sum(action_counts.values()),
            failed_logins=failed_logins,
            action_summary={k.value: v for k, v in action_counts.items()},
        )

    except Exception as e:
        log.error("daily_report_generation_failed", error=str(e))
    finally:
        session.close()
