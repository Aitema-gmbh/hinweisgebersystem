"""
aitema|Hinweis - Cases API
Fallbearbeitung und Status-Workflow.
"""

import uuid
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
import structlog

from app.models.case import Case, CaseStatus, CaseEvent
from app.models.hinweis import Hinweis, HinweisStatus
from app.models.audit_log import AuditLog, AuditAction

log = structlog.get_logger()
cases_bp = Blueprint("cases", __name__)


@cases_bp.route("/", methods=["POST"])
@jwt_required()
def create_case():
    """
    Neuen Fall aus einer Hinweismeldung eroeffnen.

    Request Body:
        {
            "hinweis_id": "uuid",
            "titel": "Falltitel",
            "assignee_id": "uuid"  (optional)
        }
    """
    claims = get_jwt()
    role = claims.get("role")
    if role not in ("admin", "ombudsperson"):
        return jsonify({"error": "Nur Ombudspersonen und Admins koennen Faelle eroeffnen"}), 403

    data = request.get_json()
    if not data or not data.get("hinweis_id"):
        return jsonify({"error": "hinweis_id ist erforderlich"}), 400

    user_id = uuid.UUID(get_jwt_identity())
    tenant_id = uuid.UUID(claims.get("tenant_id"))
    session = current_app.Session()

    try:
        # Hinweis laden und pruefen
        hinweis = session.query(Hinweis).get(uuid.UUID(data["hinweis_id"]))
        if not hinweis:
            return jsonify({"error": "Meldung nicht gefunden"}), 404

        if str(hinweis.tenant_id) \!= str(tenant_id):
            return jsonify({"error": "Keine Berechtigung"}), 403

        # Pruefen ob bereits ein Fall existiert
        existing_case = session.query(Case).filter(
            Case.hinweis_id == hinweis.id
        ).first()
        if existing_case:
            return jsonify({
                "error": "Fuer diese Meldung existiert bereits ein Fall",
                "case_number": existing_case.case_number,
            }), 409

        # Fall erstellen
        case_number = Case.generate_case_number(
            claims.get("tenant_slug", "HW")
        )

        case = Case(
            tenant_id=tenant_id,
            hinweis_id=hinweis.id,
            case_number=case_number,
            titel=data.get("titel", hinweis.titel),
            created_by_id=user_id,
            status=CaseStatus.OFFEN,
        )

        # Zuweisung (optional)
        if data.get("assignee_id"):
            case.assignee_id = uuid.UUID(data["assignee_id"])
            case.status = CaseStatus.ZUGEWIESEN
            case.assigned_at = datetime.now(timezone.utc)

        session.add(case)
        session.flush()

        # Hinweis-Status aktualisieren
        hinweis.status = HinweisStatus.IN_BEARBEITUNG
        session.add(hinweis)

        # Erstes Case-Event
        event = CaseEvent(
            case_id=case.id,
            user_id=user_id,
            event_type="case_created",
            new_status=case.status.value,
            description=f"Fall {case_number} eroeffnet",
        )
        session.add(event)

        # Audit-Log
        audit = AuditLog(
            tenant_id=tenant_id,
            user_id=user_id,
            action=AuditAction.CASE_CREATED,
            resource_type="case",
            resource_id=str(case.id),
            ip_address=request.remote_addr,
            description=f"Fall {case_number} eroeffnet fuer Meldung {hinweis.reference_code}",
        )
        session.add(audit)

        session.commit()

        log.info("case_created", case_number=case_number, hinweis_ref=hinweis.reference_code)

        return jsonify({
            "message": "Fall erfolgreich eroeffnet",
            "case": {
                "id": str(case.id),
                "case_number": case_number,
                "status": case.status.value,
                "hinweis_reference": hinweis.reference_code,
            },
        }), 201

    except Exception as e:
        session.rollback()
        log.error("case_creation_failed", error=str(e))
        return jsonify({"error": "Fehler beim Eroeffnen des Falls"}), 500
    finally:
        session.close()


@cases_bp.route("/", methods=["GET"])
@jwt_required()
def list_cases():
    """Alle Faelle des Tenants auflisten."""
    claims = get_jwt()
    role = claims.get("role")
    tenant_id = claims.get("tenant_id")
    user_id = get_jwt_identity()

    session = current_app.Session()
    try:
        query = session.query(Case).filter(Case.tenant_id == uuid.UUID(tenant_id))

        # Fallbearbeiter sehen nur zugewiesene Faelle
        if role == "fallbearbeiter":
            query = query.filter(Case.assignee_id == uuid.UUID(user_id))

        # Filter
        status = request.args.get("status")
        if status:
            query = query.filter(Case.status == CaseStatus(status))

        # Sortierung
        query = query.order_by(Case.updated_at.desc())

        # Pagination
        page = int(request.args.get("page", 1))
        per_page = min(int(request.args.get("per_page", 25)), 100)
        total = query.count()
        cases = query.offset((page - 1) * per_page).limit(per_page).all()

        return jsonify({
            "items": [
                {
                    "id": str(c.id),
                    "case_number": c.case_number,
                    "titel": c.titel,
                    "status": c.status.value,
                    "schweregrad": c.schweregrad,
                    "assignee_id": str(c.assignee_id) if c.assignee_id else None,
                    "bearbeitungsdauer_tage": c.bearbeitungsdauer_tage,
                    "opened_at": c.opened_at.isoformat(),
                    "updated_at": c.updated_at.isoformat(),
                }
                for c in cases
            ],
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "pages": (total + per_page - 1) // per_page,
            },
        }), 200

    except Exception as e:
        log.error("list_cases_failed", error=str(e))
        return jsonify({"error": "Fehler beim Laden der Faelle"}), 500
    finally:
        session.close()


@cases_bp.route("/<case_id>/status", methods=["PUT"])
@jwt_required()
def update_case_status(case_id: str):
    """
    Status eines Falls aendern.

    Request Body:
        {
            "status": "in_ermittlung",
            "kommentar": "Ermittlung eingeleitet"
        }
    """
    claims = get_jwt()
    role = claims.get("role")
    if role not in ("admin", "ombudsperson", "fallbearbeiter"):
        return jsonify({"error": "Keine Berechtigung"}), 403

    data = request.get_json()
    new_status_str = data.get("status")
    if not new_status_str:
        return jsonify({"error": "Neuer Status ist erforderlich"}), 400

    try:
        new_status = CaseStatus(new_status_str)
    except ValueError:
        return jsonify({
            "error": f"Ungueltiger Status: {new_status_str}",
            "valid_statuses": [s.value for s in CaseStatus],
        }), 400

    user_id = uuid.UUID(get_jwt_identity())
    session = current_app.Session()

    try:
        case = session.query(Case).get(uuid.UUID(case_id))
        if not case:
            return jsonify({"error": "Fall nicht gefunden"}), 404

        if str(case.tenant_id) \!= claims.get("tenant_id"):
            return jsonify({"error": "Keine Berechtigung"}), 403

        # Statusuebergang pruefen
        if not case.can_transition_to(new_status):
            return jsonify({
                "error": f"Uebergang von {case.status.value} nach {new_status.value} nicht erlaubt",
            }), 400

        old_status = case.status
        case.previous_status = old_status.value
        case.status = new_status

        if new_status == CaseStatus.ABGESCHLOSSEN:
            case.closed_at = datetime.now(timezone.utc)
        elif new_status == CaseStatus.ESKALIERT:
            case.eskaliert = True
            case.eskaliert_am = datetime.now(timezone.utc)

        # Event erstellen
        event = CaseEvent(
            case_id=case.id,
            user_id=user_id,
            event_type="status_change",
            old_status=old_status.value,
            new_status=new_status.value,
            description=data.get("kommentar", f"Status geaendert: {old_status.value} -> {new_status.value}"),
        )
        session.add(event)

        # Audit-Log
        audit = AuditLog(
            tenant_id=case.tenant_id,
            user_id=user_id,
            action=AuditAction.CASE_STATUS_CHANGED,
            resource_type="case",
            resource_id=str(case.id),
            ip_address=request.remote_addr,
            changes={"status": {"old": old_status.value, "new": new_status.value}},
        )
        session.add(audit)

        session.commit()

        log.info(
            "case_status_changed",
            case_number=case.case_number,
            old_status=old_status.value,
            new_status=new_status.value,
        )

        return jsonify({
            "message": "Status erfolgreich geaendert",
            "case_number": case.case_number,
            "old_status": old_status.value,
            "new_status": new_status.value,
        }), 200

    except Exception as e:
        session.rollback()
        log.error("case_status_update_failed", error=str(e))
        return jsonify({"error": "Fehler beim Aendern des Status"}), 500
    finally:
        session.close()


@cases_bp.route("/<case_id>/assign", methods=["PUT"])
@jwt_required()
def assign_case(case_id: str):
    """
    Fall einem Fallbearbeiter zuweisen.

    Request Body:
        {"assignee_id": "uuid"}
    """
    claims = get_jwt()
    if claims.get("role") not in ("admin", "ombudsperson"):
        return jsonify({"error": "Nur Ombudspersonen und Admins koennen Faelle zuweisen"}), 403

    data = request.get_json()
    if not data or not data.get("assignee_id"):
        return jsonify({"error": "assignee_id ist erforderlich"}), 400

    user_id = uuid.UUID(get_jwt_identity())
    session = current_app.Session()

    try:
        case = session.query(Case).get(uuid.UUID(case_id))
        if not case:
            return jsonify({"error": "Fall nicht gefunden"}), 404

        old_assignee = case.assignee_id
        case.assignee_id = uuid.UUID(data["assignee_id"])
        case.assigned_at = datetime.now(timezone.utc)

        if case.status == CaseStatus.OFFEN:
            case.status = CaseStatus.ZUGEWIESEN

        event = CaseEvent(
            case_id=case.id,
            user_id=user_id,
            event_type="assignment",
            description=f"Fall zugewiesen an {data[assignee_id]}",
            metadata_json={"old_assignee": str(old_assignee) if old_assignee else None},
        )
        session.add(event)

        audit = AuditLog(
            tenant_id=case.tenant_id,
            user_id=user_id,
            action=AuditAction.CASE_ASSIGNED,
            resource_type="case",
            resource_id=str(case.id),
            ip_address=request.remote_addr,
        )
        session.add(audit)

        session.commit()
        return jsonify({"message": "Fall erfolgreich zugewiesen"}), 200

    except Exception as e:
        session.rollback()
        log.error("case_assignment_failed", error=str(e))
        return jsonify({"error": "Fehler bei der Zuweisung"}), 500
    finally:
        session.close()
