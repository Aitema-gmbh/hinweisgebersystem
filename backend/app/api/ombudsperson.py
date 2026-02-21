"""
aitema|Hinweis - D4: Ombudsperson API
Endpunkte exklusiv fuer die Ombudsperson-Rolle.

Datenschutz: Identitaetsdaten (melder_name_encrypted, melder_email_encrypted,
melder_phone_encrypted, ip_hash) werden in allen Responses entfernt.

Registrierung in app/__init__.py:
    from app.api.ombudsperson import ombudsperson_bp
    app.register_blueprint(ombudsperson_bp, url_prefix=f"{api_prefix}/ombudsperson")
"""

import uuid
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
import structlog

from app.models.case import Case, CaseStatus, CaseEvent, OmbudspersonEmpfehlung
from app.models.audit_log import AuditLog, AuditAction

log = structlog.get_logger()
ombudsperson_bp = Blueprint("ombudsperson", __name__)


def _require_ombudsperson(claims: dict):
    """Prueft ob der aktuelle Nutzer Ombudsperson oder Admin ist."""
    role = claims.get("role")
    # Keycloak-Rolle: 'hinweis-ombudsperson', JWT-Rolle: 'ombudsperson'
    if role not in ("ombudsperson", "admin"):
        return False
    return True


def _mask_hinweis_for_ombudsperson(hinweis) -> dict:
    """
    Maskiert Identitaetsdaten des Melders fuer die Ombudsperson-View.
    Entfernt: melder_name_encrypted, melder_email_encrypted,
              melder_phone_encrypted, ip_hash, user_agent_hash
    Behaelt: Fallinhalt, Kategorie, Zeitraum, Schwere
    """
    return {
        "id": str(hinweis.id),
        "reference_code": hinweis.reference_code,
        "titel": hinweis.titel,
        # beschreibung_encrypted wird fuer Ombudsperson angezeigt (inhaltlich relevant)
        # aber ohne Entschluesselung hier (Frontend entschluesselt separat)
        "kategorie": hinweis.kategorie.value if hinweis.kategorie else None,
        "prioritaet": hinweis.prioritaet.value if hinweis.prioritaet else None,
        "status": hinweis.status.value if hinweis.status else None,
        "betroffene_abteilung": hinweis.betroffene_abteilung,
        "zeitraum_von": hinweis.zeitraum_von.isoformat() if hinweis.zeitraum_von else None,
        "zeitraum_bis": hinweis.zeitraum_bis.isoformat() if hinweis.zeitraum_bis else None,
        "schaetzung_schaden": hinweis.schaetzung_schaden,
        "compliance_relevant": hinweis.compliance_relevant,
        "eingegangen_am": hinweis.eingegangen_am.isoformat() if hinweis.eingegangen_am else None,
        # MASKIERT: keine Identitaetsdaten
        "melder_name": "[vertraulich]",
        "melder_email": "[vertraulich]",
        "melder_phone": "[vertraulich]",
        "melder_ip": "[vertraulich]",
        "is_anonymous": hinweis.is_anonymous,
    }


def _case_for_ombudsperson(c: Case) -> dict:
    """
    Serialisiert einen Fall fuer die Ombudsperson-View.
    Entfernt alle Identitaetsdaten des Melders.
    """
    result = {
        "id": str(c.id),
        "case_number": c.case_number,
        "titel": c.titel,
        "status": c.status.value,
        "schweregrad": c.schweregrad,
        "opened_at": c.opened_at.isoformat(),
        "forwarded_to_ombudsperson_at": (
            c.forwarded_to_ombudsperson_at.isoformat()
            if c.forwarded_to_ombudsperson_at else None
        ),
        "ombudsperson_recommendation": c.ombudsperson_recommendation,
        "ombudsperson_reviewed_at": (
            c.ombudsperson_reviewed_at.isoformat()
            if c.ombudsperson_reviewed_at else None
        ),
        # Hinweis-Daten maskiert
        "hinweis": _mask_hinweis_for_ombudsperson(c.hinweis) if c.hinweis else None,
    }
    return result


@ombudsperson_bp.route("/cases", methods=["GET"])
@jwt_required()
def list_ombudsperson_cases():
    """
    D4: Faelle fuer die Ombudsperson auflisten.
    Nur weitergeleitete Faelle (forwarded_to_ombudsperson_at IS NOT NULL).
    Alle Identitaetsdaten des Melders sind maskiert.

    Query-Parameter:
        reviewed: 'true' | 'false' (Filter: Empfehlung bereits abgegeben)
        page, per_page: Pagination
    """
    claims = get_jwt()
    if not _require_ombudsperson(claims):
        return jsonify({"error": "Nur Ombudspersonen haben Zugriff auf diese Ressource"}), 403

    tenant_id = claims.get("tenant_id")
    session = current_app.Session()

    try:
        query = session.query(Case).filter(
            Case.tenant_id == uuid.UUID(tenant_id),
            Case.forwarded_to_ombudsperson_at.isnot(None),
        )

        # Filter: Empfehlung bereits abgegeben oder nicht
        reviewed = request.args.get("reviewed")
        if reviewed == "true":
            query = query.filter(Case.ombudsperson_recommendation.isnot(None))
        elif reviewed == "false":
            query = query.filter(Case.ombudsperson_recommendation.is_(None))

        query = query.order_by(Case.forwarded_to_ombudsperson_at.desc())

        page = int(request.args.get("page", 1))
        per_page = min(int(request.args.get("per_page", 25)), 100)
        total = query.count()
        cases = query.offset((page - 1) * per_page).limit(per_page).all()

        return jsonify({
            "items": [_case_for_ombudsperson(c) for c in cases],
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "pages": (total + per_page - 1) // per_page,
            },
            "pending_review": session.query(Case).filter(
                Case.tenant_id == uuid.UUID(tenant_id),
                Case.forwarded_to_ombudsperson_at.isnot(None),
                Case.ombudsperson_recommendation.is_(None),
            ).count(),
        }), 200

    except Exception as e:
        log.error("ombudsperson_list_cases_failed", error=str(e))
        return jsonify({"error": "Fehler beim Laden der Faelle"}), 500
    finally:
        session.close()


@ombudsperson_bp.route("/cases/<case_id>", methods=["GET"])
@jwt_required()
def get_ombudsperson_case(case_id: str):
    """
    D4: Einzelfall fuer die Ombudsperson.
    Gibt Fall mit maskierten Identitaetsdaten zurueck.
    Nur zugaenglich wenn Fall weitergeleitet wurde.
    """
    claims = get_jwt()
    if not _require_ombudsperson(claims):
        return jsonify({"error": "Nur Ombudspersonen haben Zugriff auf diese Ressource"}), 403

    session = current_app.Session()
    try:
        case = session.query(Case).get(uuid.UUID(case_id))
        if not case:
            return jsonify({"error": "Fall nicht gefunden"}), 404

        if str(case.tenant_id) != claims.get("tenant_id"):
            return jsonify({"error": "Keine Berechtigung"}), 403

        if not case.forwarded_to_ombudsperson_at:
            return jsonify({
                "error": "Dieser Fall wurde nicht an die Ombudsperson weitergeleitet"
            }), 403

        # Events fuer Ombudsperson (nur nicht-interne oder weiterleitungs-Events)
        visible_events = [
            {
                "id": str(e.id),
                "event_type": e.event_type,
                "description": e.description if e.event_type not in (
                    "note_added",
                ) else "[intern]",
                "created_at": e.created_at.isoformat(),
            }
            for e in case.events
            if e.event_type in (
                "case_created", "status_change", "acknowledged",
                "forwarded_to_ombudsperson", "ombudsperson_recommendation",
                "resolved",
            )
        ]

        return jsonify({
            "case": _case_for_ombudsperson(case),
            "events": visible_events,
        }), 200

    except Exception as e:
        log.error("ombudsperson_get_case_failed", error=str(e))
        return jsonify({"error": "Fehler beim Laden des Falls"}), 500
    finally:
        session.close()


@ombudsperson_bp.route("/cases/<case_id>/recommendation", methods=["POST"])
@jwt_required()
def submit_recommendation(case_id: str):
    """
    D4: Ombudsperson gibt Empfehlung fuer einen Fall ab.

    Request Body:
        {
            "recommendation": "pursue" | "close" | "escalate",
            "notes": "Begruendung (optional, wird verschluesselt)"
        }

    Erlaubte Empfehlungen:
        - pursue:   Fall weiter verfolgen
        - close:    Fall schliessen
        - escalate: An externe Stelle eskalieren
    """
    claims = get_jwt()
    if not _require_ombudsperson(claims):
        return jsonify({"error": "Nur Ombudspersonen koennen Empfehlungen abgeben"}), 403

    data = request.get_json()
    if not data or not data.get("recommendation"):
        return jsonify({"error": "recommendation ist erforderlich"}), 400

    recommendation = data["recommendation"]
    valid_recommendations = [e.value for e in OmbudspersonEmpfehlung]
    if recommendation not in valid_recommendations:
        return jsonify({
            "error": f"Ungueltige Empfehlung: {recommendation}",
            "valid_values": valid_recommendations,
        }), 400

    user_id = uuid.UUID(get_jwt_identity())
    session = current_app.Session()

    try:
        case = session.query(Case).get(uuid.UUID(case_id))
        if not case:
            return jsonify({"error": "Fall nicht gefunden"}), 404

        if str(case.tenant_id) != claims.get("tenant_id"):
            return jsonify({"error": "Keine Berechtigung"}), 403

        if not case.forwarded_to_ombudsperson_at:
            return jsonify({
                "error": "Fall wurde nicht an Ombudsperson weitergeleitet"
            }), 400

        if case.ombudsperson_recommendation is not None:
            return jsonify({
                "error": "Empfehlung wurde bereits abgegeben",
                "recommendation": case.ombudsperson_recommendation,
                "reviewed_at": case.ombudsperson_reviewed_at.isoformat()
                if case.ombudsperson_reviewed_at else None,
            }), 409

        now = datetime.now(timezone.utc)
        case.ombudsperson_recommendation = recommendation
        case.ombudsperson_reviewed_at = now
        case.ombudsperson_reviewed_by = user_id

        # Notizen werden als encrypted gespeichert (Platzhalter: Klartext)
        # In Produktion: EncryptionService verwenden
        notes = data.get("notes", "")
        if notes:
            case.ombudsperson_notes_encrypted = notes  # TODO: verschluesseln

        # Empfehlung 'escalate' -> Case-Status eskalieren
        if recommendation == OmbudspersonEmpfehlung.ESKALIEREN.value:
            case.eskaliert = True
            case.eskaliert_am = now
            if case.can_transition_to(CaseStatus.ESKALIERT):
                case.previous_status = case.status.value
                case.status = CaseStatus.ESKALIERT

        event = CaseEvent(
            case_id=case.id,
            user_id=user_id,
            event_type="ombudsperson_recommendation",
            description=f"Ombudsperson-Empfehlung: {recommendation}. {notes[:200] if notes else ''}",
            is_internal=True,
        )
        session.add(event)

        audit = AuditLog(
            tenant_id=case.tenant_id,
            user_id=user_id,
            action=AuditAction.CASE_NOTE_ADDED,
            resource_type="case",
            resource_id=str(case.id),
            ip_address=request.remote_addr,
            description=f"Ombudsperson-Empfehlung fuer Fall {case.case_number}: {recommendation}",
        )
        session.add(audit)

        session.commit()
        log.info("ombudsperson_recommendation_submitted",
                 case_number=case.case_number, recommendation=recommendation)

        return jsonify({
            "message": "Empfehlung erfolgreich abgegeben",
            "recommendation": recommendation,
            "reviewed_at": now.isoformat(),
        }), 200

    except Exception as e:
        session.rollback()
        log.error("ombudsperson_recommendation_failed", error=str(e))
        return jsonify({"error": "Fehler beim Speichern der Empfehlung"}), 500
    finally:
        session.close()
