"""
aitema|Hinweis - Submissions API
Hinweismeldungen einreichen (anonym + nicht-anonym).
"""

import uuid
import hashlib
from datetime import datetime, timezone, timedelta

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
import structlog

from app.models.hinweis import (
    Hinweis, HinweisStatus, HinweisKategorie, HinweisPrioritaet
)
from app.models.audit_log import AuditLog, AuditAction
from app.services.encryption import EncryptionService
from app.services.hinschg_compliance import HinSchGComplianceService

log = structlog.get_logger()
submissions_bp = Blueprint("submissions", __name__)


def get_tenant_id_from_env() -> str:
    """Liest Tenant-ID aus WSGI-Environment."""
    return request.environ.get("TENANT_ID", "default")


@submissions_bp.route("/", methods=["POST"])
def create_submission():
    """
    Neue Hinweismeldung einreichen.

    Kann anonym (ohne Auth) oder authentifiziert genutzt werden.

    Request Body:
        {
            "titel": "Verdacht auf ...",
            "beschreibung": "Detaillierte Beschreibung...",
            "kategorie": "korruption",
            "is_anonymous": true,
            "melder_name": "Optional",
            "melder_email": "optional@example.de",
            "melder_phone": "Optional",
            "preferred_channel": "portal",
            "betroffene_personen": "Optional",
            "betroffene_abteilung": "Optional",
            "zeitraum_von": "2025-01-01",
            "zeitraum_bis": "2025-12-31"
        }

    Returns:
        201: {"reference_code": "HW-2026-A3K9", "access_code": "...", "message": "..."}
        400: {"error": "Validierungsfehler"}
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request-Body fehlt"}), 400

    # Pflichtfelder validieren
    titel = data.get("titel", "").strip()
    beschreibung = data.get("beschreibung", "").strip()

    if not titel or len(titel) < 10:
        return jsonify({"error": "Titel muss mindestens 10 Zeichen lang sein"}), 400
    if not beschreibung or len(beschreibung) < 50:
        return jsonify({
            "error": "Beschreibung muss mindestens 50 Zeichen lang sein"
        }), 400

    # Kategorie validieren
    kategorie_str = data.get("kategorie", "sonstiges")
    try:
        kategorie = HinweisKategorie(kategorie_str)
    except ValueError:
        return jsonify({
            "error": f"Ungueltige Kategorie: {kategorie_str}",
            "valid_categories": [k.value for k in HinweisKategorie],
        }), 400

    tenant_id = get_tenant_id_from_env()
    is_anonymous = data.get("is_anonymous", True)

    session = current_app.Session()
    encryption = EncryptionService(current_app.config["ENCRYPTION_MASTER_KEY"])

    try:
        # Fristen berechnen (HinSchG)
        now = datetime.now(timezone.utc)
        eingangsbestaetigung_tage = current_app.config["HINSCHG_EINGANGSBESTAETIGUNG_TAGE"]
        rueckmeldung_tage = current_app.config["HINSCHG_RUECKMELDUNG_TAGE"]

        eingangsbestaetigung_frist = now + timedelta(days=eingangsbestaetigung_tage)
        rueckmeldung_frist = now + timedelta(days=rueckmeldung_tage)

        # Referenz-Code generieren
        reference_code = Hinweis.generate_reference_code()

        # Sensible Daten verschluesseln
        beschreibung_encrypted = encryption.encrypt(beschreibung)

        melder_name_enc = None
        melder_email_enc = None
        melder_phone_enc = None
        betroffene_personen_enc = None

        if data.get("melder_name"):
            melder_name_enc = encryption.encrypt(data["melder_name"])
        if data.get("melder_email"):
            melder_email_enc = encryption.encrypt(data["melder_email"])
        if data.get("melder_phone"):
            melder_phone_enc = encryption.encrypt(data["melder_phone"])
        if data.get("betroffene_personen"):
            betroffene_personen_enc = encryption.encrypt(data["betroffene_personen"])

        # IP-Adresse hashen (nicht im Klartext speichern)
        ip_hash = hashlib.sha256(
            (request.remote_addr or "unknown").encode()
        ).hexdigest()

        # Zeitraum parsen
        zeitraum_von = None
        zeitraum_bis = None
        if data.get("zeitraum_von"):
            zeitraum_von = datetime.fromisoformat(data["zeitraum_von"]).replace(
                tzinfo=timezone.utc
            )
        if data.get("zeitraum_bis"):
            zeitraum_bis = datetime.fromisoformat(data["zeitraum_bis"]).replace(
                tzinfo=timezone.utc
            )

        # Hinweis erstellen
        hinweis = Hinweis(
            tenant_id=uuid.UUID(tenant_id) if tenant_id != "default" else uuid.uuid4(),
            reference_code=reference_code,
            is_anonymous=is_anonymous,
            titel=titel,
            beschreibung_encrypted=beschreibung_encrypted,
            kategorie=kategorie,
            prioritaet=HinweisPrioritaet(data.get("prioritaet", "mittel")),
            status=HinweisStatus.EINGEGANGEN,
            melder_name_encrypted=melder_name_enc,
            melder_email_encrypted=melder_email_enc,
            melder_phone_encrypted=melder_phone_enc,
            melder_preferred_channel=data.get("preferred_channel", "portal"),
            betroffene_personen_encrypted=betroffene_personen_enc,
            betroffene_abteilung=data.get("betroffene_abteilung"),
            zeitraum_von=zeitraum_von,
            zeitraum_bis=zeitraum_bis,
            eingegangen_am=now,
            eingangsbestaetigung_frist=eingangsbestaetigung_frist,
            rueckmeldung_frist=rueckmeldung_frist,
            quelle=data.get("quelle", "web"),
            sprache=data.get("sprache", "de"),
            ip_hash=ip_hash,
            tags=data.get("tags", []),
        )

        session.add(hinweis)
        session.flush()  # ID generieren

        # Audit-Log
        audit = AuditLog(
            tenant_id=hinweis.tenant_id,
            action=AuditAction.SUBMISSION_CREATED,
            resource_type="hinweis",
            resource_id=str(hinweis.id),
            ip_address=request.remote_addr,
            description=f"Neue Meldung: {reference_code} (Kategorie: {kategorie.value})",
            details={"is_anonymous": is_anonymous, "kategorie": kategorie.value},
        )
        session.add(audit)

        session.commit()

        log.info(
            "submission_created",
            reference_code=reference_code,
            kategorie=kategorie.value,
            is_anonymous=is_anonymous,
        )

        return jsonify({
            "message": "Ihre Meldung wurde erfolgreich eingereicht.",
            "reference_code": reference_code,
            "access_code": hinweis.access_code,
            "eingangsbestaetigung_bis": eingangsbestaetigung_frist.isoformat(),
            "hinweis": (
                "Bitte bewahren Sie Ihren Zugangscode sicher auf. "
                "Sie benoetigen ihn, um den Status Ihrer Meldung zu pruefen."
            ),
        }), 201

    except Exception as e:
        session.rollback()
        log.error("submission_creation_failed", error=str(e))
        return jsonify({"error": "Fehler beim Einreichen der Meldung"}), 500
    finally:
        session.close()


@submissions_bp.route("/status/<access_code>", methods=["GET"])
def check_status(access_code: str):
    """
    Status einer Meldung per Zugangscode abfragen.
    Kein Login erforderlich - fuer anonyme Melder.
    """
    if not access_code or len(access_code) < 20:
        return jsonify({"error": "Ungueltiger Zugangscode"}), 400

    session = current_app.Session()
    try:
        hinweis = session.query(Hinweis).filter(
            Hinweis.access_code == access_code
        ).first()

        if not hinweis:
            return jsonify({"error": "Meldung nicht gefunden"}), 404

        response = {
            "reference_code": hinweis.reference_code,
            "status": hinweis.status.value,
            "kategorie": hinweis.kategorie.value,
            "eingegangen_am": hinweis.eingegangen_am.isoformat(),
            "tage_seit_eingang": hinweis.tage_seit_eingang,
            "eingangsbestaetigung_gesendet": hinweis.eingangsbestaetigung_gesendet_am is not None,
        }

        # Rueckmeldung nur anzeigen wenn vorhanden
        if hinweis.rueckmeldung_gesendet_am:
            response["rueckmeldung_gesendet_am"] = hinweis.rueckmeldung_gesendet_am.isoformat()

        return jsonify(response), 200

    finally:
        session.close()


@submissions_bp.route("/", methods=["GET"])
@jwt_required()
def list_submissions():
    """
    Alle Meldungen des Tenants auflisten.
    Nur fuer Ombudsperson, Admin, Fallbearbeiter.
    """
    claims = get_jwt()
    role = claims.get("role")
    if role not in ("admin", "ombudsperson", "fallbearbeiter", "auditor"):
        return jsonify({"error": "Keine Berechtigung"}), 403

    tenant_id = claims.get("tenant_id")
    session = current_app.Session()

    try:
        query = session.query(Hinweis).filter(
            Hinweis.tenant_id == uuid.UUID(tenant_id)
        )

        # Filter
        status = request.args.get("status")
        if status:
            query = query.filter(Hinweis.status == HinweisStatus(status))

        kategorie = request.args.get("kategorie")
        if kategorie:
            query = query.filter(Hinweis.kategorie == HinweisKategorie(kategorie))

        # Sortierung
        sort = request.args.get("sort", "eingegangen_am")
        order = request.args.get("order", "desc")
        sort_column = getattr(Hinweis, sort, Hinweis.eingegangen_am)
        if order == "desc":
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())

        # Pagination
        page = int(request.args.get("page", 1))
        per_page = min(int(request.args.get("per_page", 25)), 100)
        total = query.count()
        hinweise = query.offset((page - 1) * per_page).limit(per_page).all()

        return jsonify({
            "items": [
                {
                    "id": str(h.id),
                    "reference_code": h.reference_code,
                    "titel": h.titel,
                    "kategorie": h.kategorie.value,
                    "prioritaet": h.prioritaet.value,
                    "status": h.status.value,
                    "is_anonymous": h.is_anonymous,
                    "eingegangen_am": h.eingegangen_am.isoformat(),
                    "tage_seit_eingang": h.tage_seit_eingang,
                    "eingangsbestaetigung_ueberfaellig": h.eingangsbestaetigung_ueberfaellig,
                    "rueckmeldung_ueberfaellig": h.rueckmeldung_ueberfaellig,
                }
                for h in hinweise
            ],
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "pages": (total + per_page - 1) // per_page,
            },
        }), 200

    except Exception as e:
        log.error("list_submissions_failed", error=str(e))
        return jsonify({"error": "Fehler beim Laden der Meldungen"}), 500
    finally:
        session.close()


@submissions_bp.route("/<submission_id>", methods=["GET"])
@jwt_required()
def get_submission(submission_id: str):
    """Einzelne Meldung abrufen (nur autorisierte Benutzer)."""
    claims = get_jwt()
    role = claims.get("role")
    if role not in ("admin", "ombudsperson", "fallbearbeiter", "auditor"):
        return jsonify({"error": "Keine Berechtigung"}), 403

    session = current_app.Session()
    encryption = EncryptionService(current_app.config["ENCRYPTION_MASTER_KEY"])

    try:
        hinweis = session.query(Hinweis).get(uuid.UUID(submission_id))
        if not hinweis:
            return jsonify({"error": "Meldung nicht gefunden"}), 404

        # Tenant pruefen
        if str(hinweis.tenant_id) != claims.get("tenant_id"):
            return jsonify({"error": "Keine Berechtigung"}), 403

        # Audit-Log fuer Zugriff
        audit = AuditLog(
            tenant_id=hinweis.tenant_id,
            user_id=uuid.UUID(get_jwt_identity()),
            action=AuditAction.SUBMISSION_VIEWED,
            resource_type="hinweis",
            resource_id=str(hinweis.id),
            ip_address=request.remote_addr,
        )
        session.add(audit)
        session.commit()

        # Verschluesselte Felder entschluesseln
        response = {
            "id": str(hinweis.id),
            "reference_code": hinweis.reference_code,
            "titel": hinweis.titel,
            "beschreibung": encryption.decrypt(hinweis.beschreibung_encrypted),
            "kategorie": hinweis.kategorie.value,
            "prioritaet": hinweis.prioritaet.value,
            "status": hinweis.status.value,
            "is_anonymous": hinweis.is_anonymous,
            "betroffene_abteilung": hinweis.betroffene_abteilung,
            "zeitraum_von": hinweis.zeitraum_von.isoformat() if hinweis.zeitraum_von else None,
            "zeitraum_bis": hinweis.zeitraum_bis.isoformat() if hinweis.zeitraum_bis else None,
            "tags": hinweis.tags or [],
            "eingegangen_am": hinweis.eingegangen_am.isoformat(),
            "eingangsbestaetigung_frist": hinweis.eingangsbestaetigung_frist.isoformat(),
            "eingangsbestaetigung_gesendet_am": (
                hinweis.eingangsbestaetigung_gesendet_am.isoformat()
                if hinweis.eingangsbestaetigung_gesendet_am else None
            ),
            "rueckmeldung_frist": hinweis.rueckmeldung_frist.isoformat(),
            "rueckmeldung_gesendet_am": (
                hinweis.rueckmeldung_gesendet_am.isoformat()
                if hinweis.rueckmeldung_gesendet_am else None
            ),
            "tage_seit_eingang": hinweis.tage_seit_eingang,
            "attachments": [
                {
                    "id": str(a.id),
                    "filename": a.original_filename,
                    "size": a.file_size_human,
                    "mime_type": a.mime_type,
                    "uploaded_at": a.created_at.isoformat(),
                }
                for a in hinweis.attachments
            ],
        }

        # Melder-Daten nur entschluesseln wenn nicht anonym
        if not hinweis.is_anonymous:
            if hinweis.melder_name_encrypted:
                response["melder_name"] = encryption.decrypt(hinweis.melder_name_encrypted)
            if hinweis.melder_email_encrypted:
                response["melder_email"] = encryption.decrypt(hinweis.melder_email_encrypted)

        return jsonify(response), 200

    except Exception as e:
        log.error("get_submission_failed", error=str(e))
        return jsonify({"error": "Fehler beim Laden der Meldung"}), 500
    finally:
        session.close()
