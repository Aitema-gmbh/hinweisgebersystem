"""
Anonymer Meldekanal Handler - HinSchG §13 Vertraulichkeitsgebot

REST-Endpunkte fuer den anonymen Meldekanal ohne Authentifizierung.
Kein IP-Logging, Tor-Header-Erkennung, strikte Anonymitaet.

Endpunkte:
  POST /api/hinschg/anonymous/submit
  GET  /api/hinschg/anonymous/status/{receipt_code}
  POST /api/hinschg/anonymous/message/{receipt_code}
"""
import json
import re

from globaleaks.handlers.base import BaseHandler
from globaleaks.rest import errors
from globaleaks.utils.log import log

from globaleaks.services.hinschg.anonymous_channel import (
    create_anonymous_submission,
    lookup_by_receipt,
    add_anonymous_message,
    validate_receipt_code,
    normalize_receipt_code,
    RateLimitExceeded,
)

# Regexp fuer Receipt-Code-Validierung in URLs (mit oder ohne Bindestriche)
RECEIPT_CODE_REGEXP = r'[A-Z2-9]{16}|[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}'


# ============================================================
# Hilfsfunktionen
# ============================================================

def _detect_tor(request) -> bool:
    """
    Erkennt Tor-Verbindungen anhand von HTTP-Headern.

    Nginx setzt X-Tor-Hidden-Service wenn die Anfrage ueber den
    Hidden Service eingeht. Kein X-Forwarded-For weiterleiten.
    """
    # Nginx-Header wenn Anfrage ueber Tor Hidden Service kommt
    tor_header = request.getHeader('X-Tor-Hidden-Service')
    if tor_header:
        return True

    # Tor-Browser setzt typischerweise keinen Accept-Language
    # (kein zuverlaessiges Signal, aber ergaenzend)
    return False


def _get_rate_limit_key(request) -> str:
    """
    Bestimmt den Rate-Limit-Schlussel ohne IP zu speichern.

    Bei Tor: Tor-Circuit-ID aus Header (von Nginx gesetzt).
    Ohne Tor: 'anonymous' (kein IP-Logging).

    Hinweis: Absichtlich kein IP-Logging gemaess §13 HinSchG.
    """
    circuit_id = request.getHeader('X-Tor-Circuit-Id')
    if circuit_id:
        # Nur ersten 8 Zeichen fuer Rate-Limiting (kein Fingerprinting)
        return f"tor:{circuit_id[:8]}"

    # Kein IP-Logging - alle nicht-Tor-Anfragen teilen einen Pool
    # In Produktion: pro Nginx-Worker-Prozess aufteilen
    return 'anon_pool'


def _validate_kategorie(kategorie: str) -> bool:
    """Prueft ob Kategorie gueltig ist."""
    valid = {
        'straftat', 'ordnungswidrigkeit', 'verstoss_eu_recht',
        'verstoss_bundesrecht', 'verstoss_landesrecht', 'arbeitsschutz',
        'umweltschutz', 'verbraucherschutz', 'datenschutz', 'korruption',
        'geldwaesche', 'steuerbetrug', 'sonstiges',
    }
    return kategorie in valid


# ============================================================
# Handler Klassen
# ============================================================

class AnonSubmitHandler(BaseHandler):
    """
    POST /api/hinschg/anonymous/submit

    Nimmt eine anonyme Meldung entgegen.
    Kein Auth, kein IP-Logging.
    Gibt Receipt-Code und Aktenzeichen zurueck.
    """
    check_roles = 'none'

    def post(self):
        """Anonyme Meldung einreichen."""
        try:
            body = json.loads(self.request.content.read())
        except (json.JSONDecodeError, Exception):
            raise errors.InputValidationError

        kategorie = body.get('kategorie', '').strip()
        beschreibung = body.get('beschreibung', '').strip()
        hinweis_typ = body.get('hinweis_typ', '').strip()

        # Validierung
        if not kategorie or not _validate_kategorie(kategorie):
            raise errors.InputValidationError

        if not beschreibung or len(beschreibung) < 20:
            raise errors.InputValidationError

        if len(beschreibung) > 50000:
            raise errors.InputValidationError

        via_tor = _detect_tor(self.request)
        log.info(
            "Anonyme Meldung eingegangen: tid=%d via_tor=%s kategorie=%s",
            self.request.tid, via_tor, kategorie
        )

        return create_anonymous_submission(
            tid=self.request.tid,
            kategorie=kategorie,
            beschreibung=beschreibung,
            hinweis_typ=hinweis_typ or None,
        )


class AnonStatusHandler(BaseHandler):
    """
    GET /api/hinschg/anonymous/status/{receipt_code}

    Gibt den Status einer anonymen Meldung zurueck.
    Kein Auth, Rate-Limited (5/min).
    """
    check_roles = 'none'

    def get(self, receipt_code: str):
        """Status einer anonymen Meldung abfragen."""
        # Normalisieren (Bindestriche erlaubt in URL)
        normalized = normalize_receipt_code(receipt_code)

        if not validate_receipt_code(normalized):
            raise errors.ResourceNotFound

        rate_key = _get_rate_limit_key(self.request)

        try:
            result = lookup_by_receipt(
                receipt_code=normalized,
                rate_limit_key=rate_key,
            )
        except RateLimitExceeded:
            # HTTP 429
            self.request.setResponseCode(429)
            return {
                'error': 'rate_limit_exceeded',
                'message': 'Zu viele Anfragen. Bitte warten Sie eine Minute.',
                'retry_after': 60,
            }

        if result is None:
            raise errors.ResourceNotFound

        return result


class AnonMessageHandler(BaseHandler):
    """
    POST /api/hinschg/anonymous/message/{receipt_code}

    Sendet eine anonyme Nachricht zum laufenden Fall.
    Ermoeglicht Rueckfragen ohne Identitaetsoffenbarung.
    Kein Auth, Rate-Limited.
    """
    check_roles = 'none'

    def post(self, receipt_code: str):
        """Anonyme Nachricht an Bearbeiter senden."""
        normalized = normalize_receipt_code(receipt_code)

        if not validate_receipt_code(normalized):
            raise errors.ResourceNotFound

        try:
            body = json.loads(self.request.content.read())
        except (json.JSONDecodeError, Exception):
            raise errors.InputValidationError

        nachricht = body.get('nachricht', '').strip()

        if not nachricht or len(nachricht) < 5:
            raise errors.InputValidationError

        if len(nachricht) > 4000:
            raise errors.InputValidationError

        success = add_anonymous_message(
            receipt_code=normalized,
            nachricht=nachricht,
        )

        if not success:
            raise errors.ResourceNotFound

        return {'success': True, 'message': 'Nachricht gesendet.'}
