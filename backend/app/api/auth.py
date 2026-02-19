"""
aitema|Hinweis - Auth API
Authentifizierung, MFA und Session-Management.
"""

import uuid
from datetime import datetime, timezone, timedelta

from flask import Blueprint, request, jsonify, current_app, g
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
    get_jwt,
)
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
import pyotp
import structlog

from app.models.user import User, UserRole
from app.models.audit_log import AuditLog, AuditAction

log = structlog.get_logger()
auth_bp = Blueprint("auth", __name__)
ph = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=4,
    hash_len=32,
    salt_len=16,
)


def get_tenant_id() -> str:
    """Liest die Tenant-ID aus dem WSGI-Environment."""
    return request.environ.get("TENANT_ID", "default")


def log_audit(action: AuditAction, user_id=None, success=True, details=None):
    """Erstellt einen Audit-Log-Eintrag."""
    session = current_app.Session()
    try:
        audit = AuditLog(
            tenant_id=None,  # Wird spaeter aufgeloest
            user_id=user_id,
            action=action,
            ip_address=request.remote_addr,
            user_agent=request.headers.get("User-Agent", "")[:500],
            request_method=request.method,
            request_path=request.path,
            success=success,
            details=details or {},
        )
        session.add(audit)
        session.commit()
    except Exception as e:
        log.error("audit_log_failed", error=str(e))
        session.rollback()
    finally:
        session.close()


@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Benutzer-Login mit E-Mail und Passwort.

    Request Body:
        {
            "email": "user@example.de",
            "password": "sicheres_passwort",
            "mfa_code": "123456"  (optional, wenn MFA aktiviert)
        }

    Returns:
        200: {"access_token": "...", "refresh_token": "...", "user": {...}}
        401: {"error": "Ungueltige Anmeldedaten"}
        423: {"error": "Konto gesperrt"}
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request-Body fehlt"}), 400

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    mfa_code = data.get("mfa_code")

    if not email or not password:
        return jsonify({"error": "E-Mail und Passwort sind erforderlich"}), 400

    session = current_app.Session()
    try:
        user = session.query(User).filter(
            User.email == email,
            User.is_active.is_(True),
        ).first()

        if not user:
            log_audit(AuditAction.LOGIN_FAILED, details={"email": email, "reason": "user_not_found"})
            return jsonify({"error": "Ungueltige Anmeldedaten"}), 401

        # Account-Sperre pruefen
        if user.is_locked:
            log_audit(
                AuditAction.LOGIN_FAILED,
                user_id=user.id,
                details={"reason": "account_locked"},
            )
            return jsonify({
                "error": "Konto gesperrt",
                "detail": "Zu viele fehlgeschlagene Anmeldeversuche. Bitte spaeter erneut versuchen.",
            }), 423

        # Passwort pruefen
        try:
            ph.verify(user.password_hash, password)
        except VerifyMismatchError:
            user.failed_login_attempts += 1
            max_attempts = current_app.config.get("BRUTE_FORCE_LOCKOUT_ATTEMPTS", 5)
            if user.failed_login_attempts >= max_attempts:
                lockout_minutes = current_app.config.get("BRUTE_FORCE_LOCKOUT_MINUTES", 30)
                user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=lockout_minutes)
                log_audit(
                    AuditAction.ACCOUNT_LOCKED,
                    user_id=user.id,
                    details={"failed_attempts": user.failed_login_attempts},
                )

            session.commit()
            log_audit(
                AuditAction.LOGIN_FAILED,
                user_id=user.id,
                details={"reason": "wrong_password"},
            )
            return jsonify({"error": "Ungueltige Anmeldedaten"}), 401

        # Passwort-Hash bei Bedarf aktualisieren (Rehash)
        if ph.check_needs_rehash(user.password_hash):
            user.password_hash = ph.hash(password)

        # MFA pruefen
        if user.mfa_enabled:
            if not mfa_code:
                return jsonify({
                    "error": "MFA-Code erforderlich",
                    "mfa_required": True,
                }), 401

            totp = pyotp.TOTP(user.mfa_secret)
            if not totp.verify(mfa_code, valid_window=1):
                log_audit(
                    AuditAction.LOGIN_FAILED,
                    user_id=user.id,
                    details={"reason": "invalid_mfa"},
                )
                return jsonify({"error": "Ungueltiger MFA-Code"}), 401

        # Erfolgreicher Login
        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_login_at = datetime.now(timezone.utc)
        user.last_login_ip = request.remote_addr
        session.commit()

        # JWT-Tokens erstellen
        additional_claims = {
            "tenant_id": str(user.tenant_id),
            "role": user.role.value,
            "name": user.full_name,
        }
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims=additional_claims,
        )
        refresh_token = create_refresh_token(
            identity=str(user.id),
            additional_claims=additional_claims,
        )

        log_audit(AuditAction.LOGIN_SUCCESS, user_id=user.id)

        return jsonify({
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {
                "id": str(user.id),
                "email": user.email,
                "name": user.full_name,
                "role": user.role.value,
                "tenant_id": str(user.tenant_id),
                "must_change_password": user.must_change_password,
                "mfa_enabled": user.mfa_enabled,
            },
        }), 200

    except Exception as e:
        log.error("login_error", error=str(e))
        session.rollback()
        return jsonify({"error": "Interner Fehler bei der Anmeldung"}), 500
    finally:
        session.close()


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    """Erneuert den Access-Token mit einem gueltigen Refresh-Token."""
    identity = get_jwt_identity()
    claims = get_jwt()
    access_token = create_access_token(
        identity=identity,
        additional_claims={
            "tenant_id": claims.get("tenant_id"),
            "role": claims.get("role"),
            "name": claims.get("name"),
        },
    )
    return jsonify({"access_token": access_token}), 200


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    """Benutzer-Logout. Invalidiert den aktuellen Token."""
    jti = get_jwt()["jti"]
    user_id = get_jwt_identity()

    # Token in Redis-Blocklist speichern
    try:
        current_app.redis.setex(
            f"blocklist:{jti}",
            current_app.config["JWT_ACCESS_TOKEN_EXPIRES"],
            "true",
        )
    except Exception as e:
        log.warning("redis_blocklist_error", error=str(e))

    log_audit(AuditAction.LOGOUT, user_id=uuid.UUID(user_id))
    return jsonify({"message": "Erfolgreich abgemeldet"}), 200


@auth_bp.route("/mfa/setup", methods=["POST"])
@jwt_required()
def setup_mfa():
    """Richtet MFA (TOTP) fuer den aktuellen Benutzer ein."""
    user_id = get_jwt_identity()
    session = current_app.Session()

    try:
        user = session.query(User).get(uuid.UUID(user_id))
        if not user:
            return jsonify({"error": "Benutzer nicht gefunden"}), 404

        if user.mfa_enabled:
            return jsonify({"error": "MFA ist bereits aktiviert"}), 400

        # TOTP-Secret generieren
        secret = pyotp.random_base32()
        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(
            name=user.email,
            issuer_name="aitema|Hinweis",
        )

        # Secret temporaer in Redis speichern (nicht direkt in DB)
        current_app.redis.setex(
            f"mfa_setup:{user_id}",
            300,  # 5 Minuten gueltig
            secret,
        )

        return jsonify({
            "secret": secret,
            "provisioning_uri": provisioning_uri,
            "message": "Bitte scannen Sie den QR-Code und bestaetigen Sie mit einem Code.",
        }), 200
    finally:
        session.close()


@auth_bp.route("/mfa/verify", methods=["POST"])
@jwt_required()
def verify_mfa():
    """Bestaetigt MFA-Setup mit einem gueltigen Code."""
    user_id = get_jwt_identity()
    data = request.get_json()
    code = data.get("code", "")

    if not code:
        return jsonify({"error": "MFA-Code erforderlich"}), 400

    # Secret aus Redis holen
    secret = current_app.redis.get(f"mfa_setup:{user_id}")
    if not secret:
        return jsonify({"error": "MFA-Setup abgelaufen. Bitte erneut starten."}), 400

    totp = pyotp.TOTP(secret)
    if not totp.verify(code, valid_window=1):
        return jsonify({"error": "Ungueltiger Code"}), 400

    session = current_app.Session()
    try:
        user = session.query(User).get(uuid.UUID(user_id))
        user.mfa_enabled = True
        user.mfa_secret = secret  # In Produktion verschluesselt speichern\!
        session.commit()

        current_app.redis.delete(f"mfa_setup:{user_id}")
        log_audit(AuditAction.MFA_ENABLED, user_id=user.id)

        return jsonify({"message": "MFA erfolgreich aktiviert"}), 200
    except Exception as e:
        session.rollback()
        log.error("mfa_verify_error", error=str(e))
        return jsonify({"error": "Fehler bei MFA-Aktivierung"}), 500
    finally:
        session.close()


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    """Gibt die Daten des aktuell angemeldeten Benutzers zurueck."""
    user_id = get_jwt_identity()
    session = current_app.Session()
    try:
        user = session.query(User).get(uuid.UUID(user_id))
        if not user:
            return jsonify({"error": "Benutzer nicht gefunden"}), 404

        return jsonify({
            "id": str(user.id),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "name": user.full_name,
            "role": user.role.value,
            "tenant_id": str(user.tenant_id),
            "mfa_enabled": user.mfa_enabled,
            "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
        }), 200
    finally:
        session.close()
