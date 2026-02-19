"""
aitema|Hinweis - Tenants API
Mandantenverwaltung (Multi-Tenant).
"""

import uuid
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
import structlog

from app.models.tenant import Tenant
from app.models.audit_log import AuditLog, AuditAction
from app.services.tenant_manager import TenantManager

log = structlog.get_logger()
tenants_bp = Blueprint("tenants", __name__)


@tenants_bp.route("/", methods=["GET"])
@jwt_required()
def list_tenants():
    """Alle Mandanten auflisten (nur System-Admins)."""
    claims = get_jwt()
    if claims.get("role") \!= "admin":
        return jsonify({"error": "Nur Administratoren haben Zugriff"}), 403

    session = current_app.Session()
    try:
        tenants = session.query(Tenant).filter(Tenant.is_active.is_(True)).all()
        return jsonify({
            "items": [
                {
                    "id": str(t.id),
                    "slug": t.slug,
                    "name": t.name,
                    "organization_type": t.organization_type,
                    "organization_size": t.organization_size,
                    "is_active": t.is_active,
                    "is_trial": t.is_trial,
                    "max_users": t.max_users,
                    "created_at": t.created_at.isoformat(),
                }
                for t in tenants
            ],
        }), 200
    finally:
        session.close()


@tenants_bp.route("/", methods=["POST"])
@jwt_required()
def create_tenant():
    """
    Neuen Mandanten anlegen.

    Request Body:
        {
            "slug": "firma-abc",
            "name": "Firma ABC GmbH",
            "organization_type": "unternehmen",
            "organization_size": "large",
            "contact_email": "kontakt@firma-abc.de",
            "ombudsperson_name": "Dr. Max Mustermann",
            "ombudsperson_email": "ombuds@firma-abc.de"
        }
    """
    claims = get_jwt()
    if claims.get("role") \!= "admin":
        return jsonify({"error": "Nur Administratoren koennen Mandanten anlegen"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"error": "Request-Body fehlt"}), 400

    slug = data.get("slug", "").strip().lower()
    name = data.get("name", "").strip()

    if not slug or not name:
        return jsonify({"error": "slug und name sind erforderlich"}), 400

    session = current_app.Session()
    try:
        # Slug-Eindeutigkeit pruefen
        existing = session.query(Tenant).filter(Tenant.slug == slug).first()
        if existing:
            return jsonify({"error": f"Slug {slug} bereits vergeben"}), 409

        tenant = Tenant(
            slug=slug,
            name=name,
            display_name=data.get("display_name", name),
            organization_type=data.get("organization_type"),
            organization_size=data.get("organization_size"),
            contact_email=data.get("contact_email"),
            contact_phone=data.get("contact_phone"),
            street=data.get("street"),
            city=data.get("city"),
            postal_code=data.get("postal_code"),
            ombudsperson_name=data.get("ombudsperson_name"),
            ombudsperson_email=data.get("ombudsperson_email"),
            datenschutz_hinweis=data.get("datenschutz_hinweis"),
            max_users=data.get("max_users", 10),
            is_trial=data.get("is_trial", False),
        )

        session.add(tenant)
        session.flush()

        # DB-per-Tenant Setup (optional)
        tenant_manager = TenantManager(current_app)
        tenant_manager.initialize_tenant(tenant)

        # Audit-Log
        audit = AuditLog(
            tenant_id=tenant.id,
            user_id=uuid.UUID(get_jwt_identity()),
            action=AuditAction.TENANT_CREATED,
            resource_type="tenant",
            resource_id=str(tenant.id),
            ip_address=request.remote_addr,
            description=f"Mandant {name} ({slug}) angelegt",
        )
        session.add(audit)

        session.commit()

        log.info("tenant_created", slug=slug, name=name)

        return jsonify({
            "message": "Mandant erfolgreich angelegt",
            "tenant": {
                "id": str(tenant.id),
                "slug": tenant.slug,
                "name": tenant.name,
            },
        }), 201

    except Exception as e:
        session.rollback()
        log.error("tenant_creation_failed", error=str(e))
        return jsonify({"error": "Fehler beim Anlegen des Mandanten"}), 500
    finally:
        session.close()


@tenants_bp.route("/<tenant_id>", methods=["GET"])
@jwt_required()
def get_tenant(tenant_id: str):
    """Mandanten-Details abrufen."""
    claims = get_jwt()
    if claims.get("role") \!= "admin" and claims.get("tenant_id") \!= tenant_id:
        return jsonify({"error": "Keine Berechtigung"}), 403

    session = current_app.Session()
    try:
        tenant = session.query(Tenant).get(uuid.UUID(tenant_id))
        if not tenant:
            return jsonify({"error": "Mandant nicht gefunden"}), 404

        return jsonify({
            "id": str(tenant.id),
            "slug": tenant.slug,
            "name": tenant.name,
            "display_name": tenant.display_name,
            "organization_type": tenant.organization_type,
            "organization_size": tenant.organization_size,
            "contact_email": tenant.contact_email,
            "ombudsperson_name": tenant.ombudsperson_name,
            "ombudsperson_email": tenant.ombudsperson_email,
            "is_active": tenant.is_active,
            "is_hinschg_pflichtig": tenant.is_hinschg_pflichtig,
            "max_users": tenant.max_users,
            "created_at": tenant.created_at.isoformat(),
        }), 200
    finally:
        session.close()


@tenants_bp.route("/<tenant_id>", methods=["PUT"])
@jwt_required()
def update_tenant(tenant_id: str):
    """Mandanten-Daten aktualisieren."""
    claims = get_jwt()
    if claims.get("role") \!= "admin":
        return jsonify({"error": "Nur Administratoren koennen Mandanten bearbeiten"}), 403

    data = request.get_json()
    session = current_app.Session()

    try:
        tenant = session.query(Tenant).get(uuid.UUID(tenant_id))
        if not tenant:
            return jsonify({"error": "Mandant nicht gefunden"}), 404

        # Aktualisierbare Felder
        updatable = [
            "name", "display_name", "organization_type", "organization_size",
            "contact_email", "contact_phone", "street", "city", "postal_code",
            "ombudsperson_name", "ombudsperson_email", "datenschutz_hinweis",
            "max_users", "is_active",
        ]

        changes = {}
        for field in updatable:
            if field in data:
                old_value = getattr(tenant, field)
                new_value = data[field]
                if old_value \!= new_value:
                    setattr(tenant, field, new_value)
                    changes[field] = {"old": str(old_value), "new": str(new_value)}

        if changes:
            audit = AuditLog(
                tenant_id=tenant.id,
                user_id=uuid.UUID(get_jwt_identity()),
                action=AuditAction.TENANT_UPDATED,
                resource_type="tenant",
                resource_id=str(tenant.id),
                ip_address=request.remote_addr,
                changes=changes,
            )
            session.add(audit)

        session.commit()
        return jsonify({"message": "Mandant aktualisiert", "changes": changes}), 200

    except Exception as e:
        session.rollback()
        log.error("tenant_update_failed", error=str(e))
        return jsonify({"error": "Fehler beim Aktualisieren"}), 500
    finally:
        session.close()
