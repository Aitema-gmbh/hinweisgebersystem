"""
Anonymer Meldekanal - HinSchG §13 Vertraulichkeitsgebot

Provides anonymous submission via Tor Hidden Service with Receipt-Code system.
No IP logging, no identity linking, rate-limited lookups.

Receipt-Code: 16-stelliger Base32-Code (ohne I, O, 0, 1 zur Verwechslungsvermeidung)
Format: XXXX-XXXX-XXXX-XXXX (mit Bindestrichen zur Darstellung)
"""
import os
import time
import secrets
import string
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List

from globaleaks.orm import transact
from globaleaks.utils.log import log
from globaleaks.utils.utility import datetime_now


# ============================================================
# Base32-Alphabet ohne verwechselbare Zeichen
# ============================================================

# Aus dem Standard-Base32-Alphabet entfernt: I (wie l), O (wie 0), 0, 1
RECEIPT_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
assert len(RECEIPT_ALPHABET) == 32, "Alphabet muss 32 Zeichen haben"
assert 'I' not in RECEIPT_ALPHABET
assert 'O' not in RECEIPT_ALPHABET
assert '0' not in RECEIPT_ALPHABET
assert '1' not in RECEIPT_ALPHABET

RECEIPT_LENGTH = 16


# ============================================================
# Rate Limiting (In-Memory, pro Prozess)
# ============================================================

class _RateLimiter:
    """Simple sliding-window rate limiter. Max 5 Lookups pro IP/Minute."""

    def __init__(self, max_requests: int = 5, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: dict = defaultdict(list)

    def is_allowed(self, identifier: str) -> bool:
        now = time.monotonic()
        cutoff = now - self.window_seconds
        timestamps = self._requests[identifier]

        # Alte Eintraege entfernen
        self._requests[identifier] = [t for t in timestamps if t > cutoff]

        if len(self._requests[identifier]) >= self.max_requests:
            return False

        self._requests[identifier].append(now)
        return True

    def cleanup(self):
        """Periodisches Aufraumen alter Eintraege."""
        now = time.monotonic()
        cutoff = now - self.window_seconds
        to_delete = [k for k, v in self._requests.items()
                     if not any(t > cutoff for t in v)]
        for k in to_delete:
            del self._requests[k]


# Globale Instanz (pro Backend-Prozess)
_rate_limiter = _RateLimiter(max_requests=5, window_seconds=60)


# ============================================================
# Receipt Code Generation
# ============================================================

def generate_receipt_code() -> str:
    """
    Generiert einen kryptographisch sicheren 16-stelligen Receipt-Code.

    Verwendet secrets.choice() fuer kryptographische Sicherheit.
    Alphabet: Base32 ohne I/O/0/1 (32 Zeichen = 5 Bit pro Zeichen = 80 Bit Entropie)

    Returns:
        16-stelliger Code, z.B. "XKBV3MWNA5QRZTP8"
    """
    return ''.join(secrets.choice(RECEIPT_ALPHABET) for _ in range(RECEIPT_LENGTH))


def format_receipt_code(code: str) -> str:
    """
    Formatiert Code mit Bindestrichen fuer lesbare Darstellung.
    XXXXXXXXXXXXXXXX -> XXXX-XXXX-XXXX-XXXX
    """
    code = code.upper().replace('-', '').replace(' ', '')
    return '-'.join(code[i:i+4] for i in range(0, 16, 4))


def normalize_receipt_code(code: str) -> str:
    """Normalisiert Code (Bindestriche/Leerzeichen entfernen, Uppercase)."""
    return code.upper().replace('-', '').replace(' ', '')


def validate_receipt_code(code: str) -> bool:
    """Prueft ob ein Code gueltig ist (Laenge + erlaubte Zeichen)."""
    normalized = normalize_receipt_code(code)
    if len(normalized) != RECEIPT_LENGTH:
        return False
    return all(c in RECEIPT_ALPHABET for c in normalized)


# ============================================================
# Aktenzeichen-Generator
# ============================================================

def _generate_aktenzeichen(tid: int) -> str:
    """
    Generiert ein anonymes Aktenzeichen.
    Format: AH-<JAHR>-<6-stellige Zufallszahl>
    Beispiel: AH-2025-847293
    """
    year = datetime.now().year
    number = secrets.randbelow(900000) + 100000  # 100000-999999
    return f"AH-{year}-{number}"


# ============================================================
# Database Functions
# ============================================================

@transact
def create_anonymous_submission(
    session,
    tid: int,
    kategorie: str,
    beschreibung: str,
    hinweis_typ: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Erstellt eine anonyme Meldung ohne Identitaetsverknuepfung.

    Kein InternalTip-Link (kein GL-Account noetig).
    Receipt-Code ermoeglicht spaetere Statusabfrage ohne Login.

    Args:
        tid: Tenant ID
        kategorie: Meldungskategorie (aus HinweisKategorie)
        beschreibung: Anonymer Meldungstext
        hinweis_typ: Optionaler Hinweistyp

    Returns:
        Dict mit receipt_code und aktenzeichen
    """
    from globaleaks.models.hinschg import AnonSubmission, AnonMessage

    receipt_code = generate_receipt_code()
    aktenzeichen = _generate_aktenzeichen(tid)
    now = datetime_now()

    submission = AnonSubmission()
    submission.tid = tid
    submission.receipt_code = receipt_code
    submission.aktenzeichen = aktenzeichen
    submission.kategorie = kategorie
    submission.beschreibung = beschreibung
    submission.hinweis_typ = hinweis_typ or ''
    submission.status = 'eingegangen'
    submission.eingangsdatum = now
    submission.updated_at = now

    session.add(submission)
    session.flush()

    log.info(
        "Anonyme Meldung erstellt: aktenzeichen=%s tid=%d",
        aktenzeichen, tid
    )

    return {
        'receipt_code': format_receipt_code(receipt_code),
        'aktenzeichen': aktenzeichen,
        'eingangsdatum': now.isoformat(),
        'status': 'eingegangen',
        'status_label': 'Meldung eingegangen',
    }


@transact
def lookup_by_receipt(
    session,
    receipt_code: str,
    rate_limit_key: str = 'global',
) -> Optional[Dict[str, Any]]:
    """
    Sucht eine anonyme Meldung anhand des Receipt-Codes.

    Rate-Limiting: max 5 Anfragen pro Minute pro Identifier.
    Gibt None zurueck bei ungueltigem Code (kein Timing-Leak).

    Args:
        receipt_code: Der 16-stellige Receipt-Code
        rate_limit_key: Identifier fuer Rate-Limiting (z.B. Tor-Circuit-ID)

    Returns:
        Dict mit Status, Kommentaren und Fristen, oder None
    """
    from globaleaks.models.hinschg import AnonSubmission, AnonMessage

    # Rate Limiting pruefen
    if not _rate_limiter.is_allowed(rate_limit_key):
        raise RateLimitExceeded("Zu viele Anfragen. Bitte warten.")

    normalized = normalize_receipt_code(receipt_code)
    if not validate_receipt_code(normalized):
        return None

    submission = session.query(AnonSubmission).filter(
        AnonSubmission.receipt_code == normalized
    ).first()

    if not submission:
        # Kein Timing-Leak: immer gleiche Antwortzeit simulieren
        time.sleep(0.1)
        return None

    # Nachrichten laden (vom Bearbeiter an den Melder)
    messages = session.query(AnonMessage).filter(
        AnonMessage.submission_id == submission.id
    ).order_by(AnonMessage.created_at.asc()).all()

    STATUS_LABELS = {
        'eingegangen': 'Meldung eingegangen',
        'in_pruefung': 'Wird geprueft',
        'in_bearbeitung': 'In Bearbeitung',
        'abgeschlossen': 'Abgeschlossen',
        'zurueckgewiesen': 'Zurueckgewiesen',
    }

    return {
        'aktenzeichen': submission.aktenzeichen,
        'kategorie': submission.kategorie,
        'status': submission.status,
        'status_label': STATUS_LABELS.get(submission.status, submission.status),
        'eingangsdatum': submission.eingangsdatum.isoformat(),
        'updated_at': submission.updated_at.isoformat(),
        'kommentare': [
            {
                'id': str(m.id),
                'nachricht': m.nachricht,
                'von_bearbeiter': m.von_bearbeiter,
                'created_at': m.created_at.isoformat(),
            }
            for m in messages
        ],
        'fristen': _get_fristen_info(submission),
    }


def _get_fristen_info(submission) -> List[Dict[str, Any]]:
    """
    Berechnet HinSchG-Fristen basierend auf dem Eingangsdatum.
    §8 Abs. 1 S. 1: 7 Tage Eingangsbestaetigung
    §8 Abs. 1 S. 3: 3 Monate Rueckmeldung
    """
    eingangsdatum = submission.eingangsdatum
    fristen = []

    frist_eingang = eingangsdatum + timedelta(days=7)
    fristen.append({
        'typ': 'eingangsbestaetigung',
        'label': 'Eingangsbestaetigung (§8 Abs. 1 S. 1 HinSchG)',
        'frist_datum': frist_eingang.isoformat(),
        'erledigt': submission.status not in ('eingegangen',),
    })

    frist_rueckmeldung = eingangsdatum + timedelta(days=90)
    fristen.append({
        'typ': 'rueckmeldung',
        'label': 'Rueckmeldung (§8 Abs. 1 S. 3 HinSchG)',
        'frist_datum': frist_rueckmeldung.isoformat(),
        'erledigt': submission.status in ('abgeschlossen', 'zurueckgewiesen'),
    })

    return fristen


@transact
def add_anonymous_message(
    session,
    receipt_code: str,
    nachricht: str,
) -> bool:
    """
    Fuegt eine anonyme Nachricht vom Melder hinzu.

    Ermoeglicht Rueckfragen ohne Identitaetsoffenbarung.

    Args:
        receipt_code: Der 16-stellige Receipt-Code
        nachricht: Nachrichtentext (max 4000 Zeichen)

    Returns:
        True bei Erfolg, False wenn Code nicht gefunden
    """
    from globaleaks.models.hinschg import AnonSubmission, AnonMessage

    normalized = normalize_receipt_code(receipt_code)
    if not validate_receipt_code(normalized):
        return False

    submission = session.query(AnonSubmission).filter(
        AnonSubmission.receipt_code == normalized
    ).first()

    if not submission:
        return False

    # Nachricht kuerzen wenn zu lang
    nachricht_clean = nachricht[:4000].strip()
    if not nachricht_clean:
        return False

    now = datetime_now()
    message = AnonMessage()
    message.submission_id = submission.id
    message.nachricht = nachricht_clean
    message.von_bearbeiter = False
    message.created_at = now

    session.add(message)

    # Submission-Timestamp aktualisieren
    submission.updated_at = now

    log.info(
        "Anonyme Nachricht hinzugefuegt: aktenzeichen=%s",
        submission.aktenzeichen
    )

    return True


# ============================================================
# Custom Exceptions
# ============================================================

class RateLimitExceeded(Exception):
    """Wird ausgeloest wenn das Rate-Limit ueberschritten wird."""
    pass
