"""
aitema|Hinweis - Admin API
Systemadministration und Benutzerverwaltung.
"""

import uuid

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from argon2 import PasswordHasher
import structlog

from app.models.user import User, UserRole
from app.models.audit_log import AuditLog, AuditAction

log = structlog.get_logger()
admin_bp = Blueprint("admin", __name__)
ph = PasswordHasher()


def require_admin():
    """Prueft ob der aktuelle Benutzer ein Admin ist."""
    claims = get_jwt()
    if claims.get("role") not in ("admin", "ombudsperson"):
        return False
    return True


@admin_bp.route("/users", methods=["GET"])
@jwt_required()
def list_users():
    """Alle Benutzer des Tenants auflisten."""
    if not require_admin():
        return jsonify({"error": "Keine Berechtigung"}), 403

    claims = get_jwt()
    tenant_id = claims.get("tenant_id")
    session = current_app.Session()

    try:
        users = session.query(User).filter(
            User.tenant_id == uuid.UUID(tenant_id)
        ).order_by(User.created_at.desc()).all()

        return jsonify({
            "items": [
                {
                    "id": str(u.id),
                    "email": u.email,
                    "first_name": u.first_name,
                    "last_name": u.last_name,
                    "name": u.full_name,
                    "role": u.role.value,
                    "department": u.department,
                    "is_active": u.is_active,
                    "mfa_enabled": u.mfa_enabled,
                    "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
                    "created_at": u.created_at.isoformat(),
                }
                for u in users
            ],
        }), 200
    finally:
        session.close()


@admin_bp.route("/users", methods=["POST"])
@jwt_required()
def create_user():
    """
    Neuen Benutzer anlegen.

    Request Body:
        {
            "email": "user@example.de",
            "password": "sicheres_passwort",
            "first_name": "Max",
            "last_name": "Mustermann",
            "role": "fallbearbeiter",
            "department": "Compliance"
        }
    """
    if not require_admin():
        return jsonify({"error": "Keine Berechtigung"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"error": "Request-Body fehlt"}), 400

    required_fields = ["email", "password", "first_name", "last_name"]
    for field in required_fields:
        if not data.get(field):
            return jsonify({"error": f"Feld {field} ist erforderlich"}), 400

    # Passwort-Staerke pruefen
    password = data["password"]
    min_length = current_app.config.get("PASSWORD_MIN_LENGTH", 12)
    if len(password) < min_length:
        return jsonify({
            "error": f"Passwort muss mindestens {min_length} Zeichen lang sein"
        }), 400

    # Rolle validieren
    role_str = data.get("role", "fallbearbeiter")
    try:
        role = UserRole(role_str)
    except ValueError:
        return jsonify({
            "error": f"Ungueltige Rolle: {role_str}",
            "valid_roles": [r.value for r in UserRole],
        }), 400

    claims = get_jwt()
    tenant_id = uuid.UUID(claims.get("tenant_id"))
    session = current_app.Session()

    try:
        # E-Mail-Eindeutigkeit pruefen (pro Tenant)
        existing = session.query(User).filter(
            User.tenant_id == tenant_id,
            User.email == data["email"].strip().lower(),
        ).first()
        if existing:
            return jsonify({"error": "E-Mail-Adresse bereits vergeben"}), 409

        user = User(
            tenant_id=tenant_id,
            email=data["email"].strip().lower(),
            password_hash=ph.hash(password),
            first_name=data["first_name"].strip(),
            last_name=data["last_name"].strip(),
            role=role,
            department=data.get("department"),
            position=data.get("position"),
            phone=data.get("phone"),
            must_change_password=data.get("must_change_password", True),
        )

        session.add(user)
        session.flush()

        audit = AuditLog(
            tenant_id=tenant_id,
            user_id=uuid.UUID(get_jwt_identity()),
            action=AuditAction.USER_CREATED,
            resource_type="user",
            resource_id=str(user.id),
            ip_address=request.remote_addr,
            description=f"Benutzer {user.email} (Rolle: {role.value}) angelegt",
        )
        session.add(audit)

        session.commit()

        log.info("user_created", email=user.email, role=role.value)

        return jsonify({
            "message": "Benutzer erfolgreich angelegt",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "name": user.full_name,
                "role": user.role.value,
            },
        }), 201

    except Exception as e:
        session.rollback()
        log.error("user_creation_failed", error=str(e))
        return jsonify({"error": "Fehler beim Anlegen des Benutzers"}), 500
    finally:
        session.close()


@admin_bp.route("/users/<user_id>", methods=["PUT"])
@jwt_required()
def update_user(user_id: str):
    """Benutzer aktualisieren."""
    if not require_admin():
        return jsonify({"error": "Keine Berechtigung"}), 403

    data = request.get_json()
    session = current_app.Session()

    try:
        user = session.query(User).get(uuid.UUID(user_id))
        if not user:
            return jsonify({"error": "Benutzer nicht gefunden"}), 404

        updatable = [
            "first_name", "last_name", "department", "position",
            "phone", "is_active", "role",
        ]

        changes = {}
        for field in updatable:
            if field in data:
                old_value = getattr(user, field)
                new_value = data[field]
                if field == "role":
                    new_value = UserRole(new_value)
                if str(old_value) != str(new_value):
                    setattr(user, field, new_value)
                    changes[field] = {"old": str(old_value), "new": str(new_value)}

        if data.get("password"):
            user.password_hash = ph.hash(data["password"])
            changes["password"] = {"old": "***", "new": "***"}

        if changes:
            audit = AuditLog(
                tenant_id=user.tenant_id,
                user_id=uuid.UUID(get_jwt_identity()),
                action=AuditAction.USER_UPDATED,
                resource_type="user",
                resource_id=str(user.id),
                ip_address=request.remote_addr,
                changes=changes,
            )
            session.add(audit)

        session.commit()
        return jsonify({"message": "Benutzer aktualisiert", "changes": changes}), 200

    except Exception as e:
        session.rollback()
        log.error("user_update_failed", error=str(e))
        return jsonify({"error": "Fehler beim Aktualisieren"}), 500
    finally:
        session.close()


@admin_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def admin_dashboard():
    """Dashboard-Statistiken fuer den Admin-Bereich."""
    if not require_admin():
        return jsonify({"error": "Keine Berechtigung"}), 403

    claims = get_jwt()
    tenant_id = uuid.UUID(claims.get("tenant_id"))
    session = current_app.Session()

    try:
        from app.models.hinweis import Hinweis, HinweisStatus
        from app.models.case import Case, CaseStatus
        from sqlalchemy import func

        # Meldungen nach Status
        hinweis_stats = dict(
            session.query(Hinweis.status, func.count(Hinweis.id))
            .filter(Hinweis.tenant_id == tenant_id)
            .group_by(Hinweis.status)
            .all()
        )

        # Faelle nach Status
        case_stats = dict(
            session.query(Case.status, func.count(Case.id))
            .filter(Case.tenant_id == tenant_id)
            .group_by(Case.status)
            .all()
        )

        # Ueberfaellige Fristen
        ueberfaellige_eingangsbestaetigung = session.query(func.count(Hinweis.id)).filter(
            Hinweis.tenant_id == tenant_id,
            Hinweis.eingangsbestaetigung_gesendet_am.is_(None),
            Hinweis.eingangsbestaetigung_frist < func.now(),
        ).scalar()

        ueberfaellige_rueckmeldung = session.query(func.count(Hinweis.id)).filter(
            Hinweis.tenant_id == tenant_id,
            Hinweis.rueckmeldung_gesendet_am.is_(None),
            Hinweis.rueckmeldung_frist < func.now(),
            Hinweis.status.notin_([HinweisStatus.ABGESCHLOSSEN, HinweisStatus.ABGELEHNT]),
        ).scalar()

        # Benutzer-Statistik
        user_count = session.query(func.count(User.id)).filter(
            User.tenant_id == tenant_id, User.is_active.is_(True)
        ).scalar()

        return jsonify({
            "hinweise": {
                status.value: count
                for status, count in hinweis_stats.items()
            },
            "cases": {
                status.value: count
                for status, count in case_stats.items()
            },
            "fristen": {
                "ueberfaellige_eingangsbestaetigung": ueberfaellige_eingangsbestaetigung,
                "ueberfaellige_rueckmeldung": ueberfaellige_rueckmeldung,
            },
            "users": {
                "active_count": user_count,
            },
        }), 200

    except Exception as e:
        log.error("dashboard_stats_failed", error=str(e))
        return jsonify({"error": "Fehler beim Laden der Statistiken"}), 500
    finally:
        session.close()
