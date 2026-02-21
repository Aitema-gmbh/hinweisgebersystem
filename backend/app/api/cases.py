"""
aitema|Hinweis - Cases API
Fallbearbeitung und Status-Workflow.
D3: /acknowledge (Eingangsbestaetigung), deadline_status in Listenresponse
D4: /forward-to-ombudsperson, /recommendation (Ombudsperson-Workflow)
"""

import uuid
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
import structlog

from app.models.case import Case, CaseStatus, CaseEvent, OmbudspersonEmpfehlung
from app.models.hinweis import Hinweis, HinweisStatus
from app.models.audit_log import AuditLog, AuditAction
from app.services.deadline_service import get_case_deadline_status, get_deadline_summary

log = structlog.get_logger()
cases_bp = Blueprint("cases", __name__)


def _deadline_status_dict(case) -> dict:
    """Hilfsfunktion: DeadlineStatus als Dict fuer JSON-Response."""
    ds = get_case_deadline_status(case)
    return {
        "status": ds.status,
        "label": ds.label,
        "deadline_type": ds.deadline_type,
        "deadline_type_label": ds.deadline_type_label,
        "days_remaining": ds.days_remaining,
        "deadline": ds.deadline,
        "ack_done": ds.ack_done,
        "resolve_done": ds.resolve_done,
        "ack_deadline": ds.ack_deadline,
        "resolve_deadline": ds.resolve_deadline,
    }


def _case_to_dict(c: Case, include_deadline: bool = True) -> dict:
    """Serialisiert ein Case-Objekt als Dict fuer JSON-Responses."""
    result = {
        "id": str(c.id),
        "case_number": c.case_number,
        "titel": c.titel,
        "status": c.status.value,
        "schweregrad": c.schweregrad,
        "assignee_id": str(c.assignee_id) if c.assignee_id else None,
        "bearbeitungsdauer_tage": c.bearbeitungsdauer_tage,
        "opened_at": c.opened_at.isoformat(),
        "updated_at": c.updated_at.isoformat(),
        # D3: Fristen-Felder
        "acknowledged_at": c.acknowledged_at.isoformat() if c.acknowledged_at else None,
        "resolved_at": c.resolved_at.isoformat() if c.resolved_at else None,
        # D4: Ombudsperson-Felder
        "forwarded_to_ombudsperson_at": (
            c.forwarded_to_ombudsperson_at.isoformat()
            if c.forwarded_to_ombudsperson_at else None
        ),
        "ombudsperson_recommendation": c.ombudsperson_recommendation,
        "ombudsperson_reviewed_at": (
            c.ombudsperson_reviewed_at.isoformat()
            if c.ombudsperson_reviewed_at else None
        ),
    }
    if include_deadline:
        result["deadline_status"] = _deadline_status_dict(c)
    return result


# ==========================================================
# BESTEHENDE ENDPUNKTE (erweitert)
# ==========================================================

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
        hinweis = session.query(Hinweis).get(uuid.UUID(data["hinweis_id"]))
        if not hinweis:
            return jsonify({"error": "Meldung nicht gefunden"}), 404

        if str(hinweis.tenant_id) != str(tenant_id):
            return jsonify({"error": "Keine Berechtigung"}), 403

        existing_case = session.query(Case).filter(
            Case.hinweis_id == hinweis.id
        ).first()
        if existing_case:
            return jsonify({
                "error": "Fuer diese Meldung existiert bereits ein Fall",
                "case_number": existing_case.case_number,
            }), 409

        case_number = Case.generate_case_number(claims.get("tenant_slug", "HW"))

        case = Case(
            tenant_id=tenant_id,
            hinweis_id=hinweis.id,
            case_number=case_number,
            titel=data.get("titel", hinweis.titel),
            created_by_id=user_id,
            status=CaseStatus.OFFEN,
        )

        if data.get("assignee_id"):
            case.assignee_id = uuid.UUID(data["assignee_id"])
            case.status = CaseStatus.ZUGEWIESEN
            case.assigned_at = datetime.now(timezone.utc)

        session.add(case)
        session.flush()

        hinweis.status = HinweisStatus.IN_BEARBEITUNG
        session.add(hinweis)

        event = CaseEvent(
            case_id=case.id,
            user_id=user_id,
            event_type="case_created",
            new_status=case.status.value,
            description=f"Fall {case_number} eroeffnet",
        )
        session.add(event)

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
                "deadline_status": _deadline_status_dict(case),
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
    """
    Alle Faelle des Tenants auflisten.
    D3: Gibt deadline_status fuer jeden Fall zurueck.
    """
    claims = get_jwt()
    role = claims.get("role")
    tenant_id = claims.get("tenant_id")
    user_id = get_jwt_identity()

    session = current_app.Session()
    try:
        query = session.query(Case).filter(Case.tenant_id == uuid.UUID(tenant_id))

        if role == "fallbearbeiter":
            query = query.filter(Case.assignee_id == uuid.UUID(user_id))

        status = request.args.get("status")
        if status:
            query = query.filter(Case.status == CaseStatus(status))

        # D3: Filter fuer Fristenampel
        deadline_filter = request.args.get("deadline_filter")
        if deadline_filter == "urgent":
            # Nur Faelle die noch nicht resolved sind
            query = query.filter(Case.resolved_at.is_(None))

        # D4: Filter fuer Ombudsperson-weitergeleitet
        ombudsperson_filter = request.args.get("ombudsperson_filter")
        if ombudsperson_filter == "forwarded":
            query = query.filter(Case.forwarded_to_ombudsperson_at.isnot(None))

        query = query.order_by(Case.updated_at.desc())

        page = int(request.args.get("page", 1))
        per_page = min(int(request.args.get("per_page", 25)), 100)
        total = query.count()
        cases = query.offset((page - 1) * per_page).limit(per_page).all()

        # D3: Deadline-Summary fuer alle sichtbaren Faelle (ungepaginiert)
        all_cases_for_summary = session.query(Case).filter(
            Case.tenant_id == uuid.UUID(tenant_id)
        ).all()
        deadline_summary = get_deadline_summary(all_cases_for_summary)

        return jsonify({
            "items": [_case_to_dict(c) for c in cases],
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "pages": (total + per_page - 1) // per_page,
            },
            "deadline_summary": deadline_summary,  # D3: Dashboard-Widget-Daten
        }), 200

    except Exception as e:
        log.error("list_cases_failed", error=str(e))
        return jsonify({"error": "Fehler beim Laden der Faelle"}), 500
    finally:
        session.close()


@cases_bp.route("/<case_id>/status", methods=["PUT"])
@jwt_required()
def update_case_status(case_id: str):
    """Status eines Falls aendern."""
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

        if str(case.tenant_id) != claims.get("tenant_id"):
            return jsonify({"error": "Keine Berechtigung"}), 403

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

        event = CaseEvent(
            case_id=case.id,
            user_id=user_id,
            event_type="status_change",
            old_status=old_status.value,
            new_status=new_status.value,
            description=data.get("kommentar", f"Status geaendert: {old_status.value} -> {new_status.value}"),
        )
        session.add(event)

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
        log.info("case_status_changed", case_number=case.case_number,
                 old=old_status.value, new=new_status.value)

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
    """Fall einem Fallbearbeiter zuweisen."""
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
            description=f"Fall zugewiesen an {data['assignee_id']}",
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


# ==========================================================
# D3: FRISTENAMPEL - NEUE ENDPUNKTE
# ==========================================================

@cases_bp.route("/<case_id>/acknowledge", methods=["POST"])
@jwt_required()
def acknowledge_case(case_id: str):
    """
    D3: Eingangsbestaetigung fuer einen Fall setzen.
    Setzt acknowledged_at = now() und aktualisiert die Fristenampel.

    Nur erlaubt fuer: admin, ombudsperson, fallbearbeiter
    """
    claims = get_jwt()
    role = claims.get("role")
    if role not in ("admin", "ombudsperson", "fallbearbeiter"):
        return jsonify({"error": "Keine Berechtigung"}), 403

    user_id = uuid.UUID(get_jwt_identity())
    session = current_app.Session()

    try:
        case = session.query(Case).get(uuid.UUID(case_id))
        if not case:
            return jsonify({"error": "Fall nicht gefunden"}), 404

        if str(case.tenant_id) != claims.get("tenant_id"):
            return jsonify({"error": "Keine Berechtigung"}), 403

        if case.acknowledged_at is not None:
            return jsonify({
                "error": "Eingangsbestaetigung wurde bereits gesendet",
                "acknowledged_at": case.acknowledged_at.isoformat(),
            }), 409

        now = datetime.now(timezone.utc)
        case.acknowledged_at = now

        # Case-Event dokumentieren
        event = CaseEvent(
            case_id=case.id,
            user_id=user_id,
            event_type="acknowledged",
            description="Eingangsbestaetigung an Melder versendet (HinSchG §17 Abs. 1)",
        )
        session.add(event)

        # Audit-Log
        audit = AuditLog(
            tenant_id=case.tenant_id,
            user_id=user_id,
            action=AuditAction.EINGANGSBESTAETIGUNG_SENT,
            resource_type="case",
            resource_id=str(case.id),
            ip_address=request.remote_addr,
            description=f"Eingangsbestaetigung fuer Fall {case.case_number} versendet",
        )
        session.add(audit)

        session.commit()

        ds = get_case_deadline_status(case)
        log.info("case_acknowledged", case_number=case.case_number,
                 deadline_status=ds.status)

        return jsonify({
            "message": "Eingangsbestaetigung erfolgreich gesetzt",
            "acknowledged_at": now.isoformat(),
            "deadline_status": _deadline_status_dict(case),
        }), 200

    except Exception as e:
        session.rollback()
        log.error("case_acknowledge_failed", error=str(e))
        return jsonify({"error": "Fehler beim Setzen der Eingangsbestaetigung"}), 500
    finally:
        session.close()


@cases_bp.route("/<case_id>/resolve", methods=["POST"])
@jwt_required()
def resolve_case(case_id: str):
    """
    D3: Abschluss-Rueckmeldung fuer einen Fall setzen.
    Setzt resolved_at = now() (HinSchG §17 Abs. 2: 3-Monats-Frist).

    Nur erlaubt fuer: admin, ombudsperson, fallbearbeiter
    """
    claims = get_jwt()
    role = claims.get("role")
    if role not in ("admin", "ombudsperson", "fallbearbeiter"):
        return jsonify({"error": "Keine Berechtigung"}), 403

    user_id = uuid.UUID(get_jwt_identity())
    session = current_app.Session()

    try:
        case = session.query(Case).get(uuid.UUID(case_id))
        if not case:
            return jsonify({"error": "Fall nicht gefunden"}), 404

        if str(case.tenant_id) != claims.get("tenant_id"):
            return jsonify({"error": "Keine Berechtigung"}), 403

        if case.resolved_at is not None:
            return jsonify({
                "error": "Abschluss-Rueckmeldung wurde bereits versendet",
                "resolved_at": case.resolved_at.isoformat(),
            }), 409

        data = request.get_json() or {}
        now = datetime.now(timezone.utc)
        case.resolved_at = now

        event = CaseEvent(
            case_id=case.id,
            user_id=user_id,
            event_type="resolved",
            description=data.get(
                "kommentar",
                "Abschluss-Rueckmeldung an Melder versendet (HinSchG §17 Abs. 2)"
            ),
        )
        session.add(event)

        audit = AuditLog(
            tenant_id=case.tenant_id,
            user_id=user_id,
            action=AuditAction.RUECKMELDUNG_SENT,
            resource_type="case",
            resource_id=str(case.id),
            ip_address=request.remote_addr,
            description=f"Abschluss-Rueckmeldung fuer Fall {case.case_number} versendet",
        )
        session.add(audit)

        session.commit()

        log.info("case_resolved", case_number=case.case_number)

        return jsonify({
            "message": "Abschluss-Rueckmeldung erfolgreich gesetzt",
            "resolved_at": now.isoformat(),
            "deadline_status": _deadline_status_dict(case),
        }), 200

    except Exception as e:
        session.rollback()
        log.error("case_resolve_failed", error=str(e))
        return jsonify({"error": "Fehler beim Setzen der Abschluss-Rueckmeldung"}), 500
    finally:
        session.close()


@cases_bp.route("/deadline-summary", methods=["GET"])
@jwt_required()
def get_deadline_summary_endpoint():
    """
    D3: Fristenampel-Zusammenfassung fuer das Dashboard-Widget.
    Gibt Anzahl Gruen/Gelb/Rot/Done/Total zurueck.
    """
    claims = get_jwt()
    tenant_id = claims.get("tenant_id")

    session = current_app.Session()
    try:
        cases = session.query(Case).filter(
            Case.tenant_id == uuid.UUID(tenant_id)
        ).all()

        summary = get_deadline_summary(cases)
        return jsonify(summary), 200

    except Exception as e:
        log.error("deadline_summary_failed", error=str(e))
        return jsonify({"error": "Fehler beim Laden der Fristenübersicht"}), 500
    finally:
        session.close()


# ==========================================================
# D4: OMBUDSPERSON - NEUE ENDPUNKTE
# ==========================================================

@cases_bp.route("/<case_id>/forward-to-ombudsperson", methods=["POST"])
@jwt_required()
def forward_to_ombudsperson(case_id: str):
    """
    D4: Fall an Ombudsperson weiterleiten.
    Nur Sachbearbeiter und Admins duerfen weiterleiten.
    Setzt forwarded_to_ombudsperson_at = now().
    """
    claims = get_jwt()
    role = claims.get("role")
    if role not in ("admin", "fallbearbeiter", "ombudsperson"):
        return jsonify({"error": "Keine Berechtigung zum Weiterleiten"}), 403

    user_id = uuid.UUID(get_jwt_identity())
    session = current_app.Session()

    try:
        case = session.query(Case).get(uuid.UUID(case_id))
        if not case:
            return jsonify({"error": "Fall nicht gefunden"}), 404

        if str(case.tenant_id) != claims.get("tenant_id"):
            return jsonify({"error": "Keine Berechtigung"}), 403

        if case.forwarded_to_ombudsperson_at is not None:
            return jsonify({
                "error": "Fall wurde bereits an Ombudsperson weitergeleitet",
                "forwarded_at": case.forwarded_to_ombudsperson_at.isoformat(),
            }), 409

        data = request.get_json() or {}
        now = datetime.now(timezone.utc)
        case.forwarded_to_ombudsperson_at = now
        case.forwarded_to_ombudsperson_by = user_id

        event = CaseEvent(
            case_id=case.id,
            user_id=user_id,
            event_type="forwarded_to_ombudsperson",
            description=data.get("kommentar", "Fall an Ombudsperson weitergeleitet"),
            is_internal=True,
        )
        session.add(event)

        audit = AuditLog(
            tenant_id=case.tenant_id,
            user_id=user_id,
            action=AuditAction.CASE_ESCALATED,
            resource_type="case",
            resource_id=str(case.id),
            ip_address=request.remote_addr,
            description=f"Fall {case.case_number} an Ombudsperson weitergeleitet",
        )
        session.add(audit)

        session.commit()
        log.info("case_forwarded_to_ombudsperson", case_number=case.case_number)

        return jsonify({
            "message": "Fall erfolgreich an Ombudsperson weitergeleitet",
            "forwarded_at": now.isoformat(),
        }), 200

    except Exception as e:
        session.rollback()
        log.error("case_forward_failed", error=str(e))
        return jsonify({"error": "Fehler beim Weiterleiten an Ombudsperson"}), 500
    finally:
        session.close()


# D4: Ombudsperson-eigene Endpunkte (separates Blueprint in ombudsperson.py)
# Hinweis: GET /api/v1/ombudsperson/cases und POST /recommendation
# werden im separaten ombudsperson Blueprint implementiert.
