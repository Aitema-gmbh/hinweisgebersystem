"""
aitema|Hinweis - Webhooks API
Event-Benachrichtigungen an externe Systeme.
"""

import uuid
import hmac
import hashlib
import json
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
import structlog
import httpx

log = structlog.get_logger()
webhooks_bp = Blueprint("webhooks", __name__)


# Webhook-Events
WEBHOOK_EVENTS = [
    "submission.created",
    "submission.status_changed",
    "case.created",
    "case.status_changed",
    "case.assigned",
    "deadline.approaching",
    "deadline.overdue",
]


def generate_webhook_signature(payload: str, secret: str) -> str:
    """Generiert eine HMAC-SHA256-Signatur fuer den Webhook-Payload."""
    return hmac.new(
        secret.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


async def deliver_webhook(url: str, event: str, data: dict, secret: str) -> bool:
    """Liefert einen Webhook aus."""
    payload = json.dumps({
        "event": event,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": data,
    })

    signature = generate_webhook_signature(payload, secret)

    headers = {
        "Content-Type": "application/json",
        "X-Webhook-Event": event,
        "X-Webhook-Signature": f"sha256={signature}",
        "User-Agent": "aitema-hinweis/1.0",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, content=payload, headers=headers)
            return response.status_code < 400
    except Exception as e:
        log.error("webhook_delivery_failed", url=url, event=event, error=str(e))
        return False


@webhooks_bp.route("/", methods=["GET"])
@jwt_required()
def list_webhooks():
    """Alle konfigurierten Webhooks auflisten."""
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"error": "Keine Berechtigung"}), 403

    # Webhooks aus Redis laden (oder DB)
    tenant_id = claims.get("tenant_id")
    webhooks_key = f"webhooks:{tenant_id}"

    try:
        webhooks_data = current_app.redis.get(webhooks_key)
        webhooks = json.loads(webhooks_data) if webhooks_data else []
        return jsonify({"webhooks": webhooks, "available_events": WEBHOOK_EVENTS}), 200
    except Exception as e:
        log.error("list_webhooks_failed", error=str(e))
        return jsonify({"error": "Fehler beim Laden der Webhooks"}), 500


@webhooks_bp.route("/", methods=["POST"])
@jwt_required()
def create_webhook():
    """
    Neuen Webhook registrieren.

    Request Body:
        {
            "url": "https://example.de/webhook",
            "events": ["submission.created", "case.status_changed"],
            "secret": "my_webhook_secret",
            "description": "Benachrichtigung an SIEM"
        }
    """
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"error": "Keine Berechtigung"}), 403

    data = request.get_json()
    url = data.get("url", "").strip()
    events = data.get("events", [])
    secret = data.get("secret", "")

    if not url or not url.startswith("https://"):
        return jsonify({"error": "URL muss mit https:// beginnen"}), 400

    if not events:
        return jsonify({"error": "Mindestens ein Event muss angegeben werden"}), 400

    invalid_events = [e for e in events if e not in WEBHOOK_EVENTS]
    if invalid_events:
        return jsonify({
            "error": f"Ungueltige Events: {invalid_events}",
            "valid_events": WEBHOOK_EVENTS,
        }), 400

    tenant_id = claims.get("tenant_id")
    webhook_id = str(uuid.uuid4())

    webhook = {
        "id": webhook_id,
        "url": url,
        "events": events,
        "secret": secret,
        "description": data.get("description", ""),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        webhooks_key = f"webhooks:{tenant_id}"
        webhooks_data = current_app.redis.get(webhooks_key)
        webhooks = json.loads(webhooks_data) if webhooks_data else []
        webhooks.append(webhook)
        current_app.redis.set(webhooks_key, json.dumps(webhooks))

        log.info("webhook_created", webhook_id=webhook_id, url=url, events=events)

        return jsonify({
            "message": "Webhook erfolgreich registriert",
            "webhook": {"id": webhook_id, "url": url, "events": events},
        }), 201

    except Exception as e:
        log.error("webhook_creation_failed", error=str(e))
        return jsonify({"error": "Fehler beim Registrieren des Webhooks"}), 500


@webhooks_bp.route("/test/<webhook_id>", methods=["POST"])
@jwt_required()
def test_webhook(webhook_id: str):
    """Sendet ein Test-Event an einen Webhook."""
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"error": "Keine Berechtigung"}), 403

    test_payload = {
        "event": "test",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": {"message": "Dies ist ein Test-Event von aitema|Hinweis"},
    }

    return jsonify({
        "message": "Test-Event gesendet",
        "payload": test_payload,
    }), 200
