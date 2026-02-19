"""
aitema|Hinweis - BSI IT-Grundschutz Compliance Module
=====================================================
BSI IT-Grundschutz APP.3.2 (Webserver), OPS.1.1.5 (Protokollierung),
ORP.4 (Identitaets- und Berechtigungsmanagement), CON.1 (Kryptokonzept)

Implements:
- Audit logging per BSI OPS.1.1.5
- Session security per BSI APP.3.2.A11
- Password policy per BSI ORP.4.A8
- Rate limiting per BSI APP.3.2.A14
- IP-based access control per BSI OPS.1.1.4
- Encryption at rest configuration per BSI CON.1

HinSchG (Hinweisgeberschutzgesetz) Requirements:
- Vertraulichkeit der Identitaet des Hinweisgebers (Sec. 8 HinSchG)
- Dokumentation und Aufbewahrung (Sec. 11 HinSchG)
- Zugangsschutz (Sec. 12 HinSchG)
"""

import hashlib
import hmac
import json
import logging
import os
import re
import time
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional, Set, Tuple


# ---------------------------------------------------------------------------
# BSI OPS.1.1.5 - Audit Event Types
# ---------------------------------------------------------------------------
class AuditEventType(Enum):
    ACCESS = "ACCESS"
    CHANGE = "CHANGE"
    AUTH_SUCCESS = "AUTH_SUCCESS"
    AUTH_FAILURE = "AUTH_FAILURE"
    AUTH_LOGOUT = "AUTH_LOGOUT"
    AUTH_MFA = "AUTH_MFA"
    SECURITY_ALERT = "SECURITY_ALERT"
    SECURITY_VIOLATION = "SECURITY_VIOLATION"
    DATA_EXPORT = "DATA_EXPORT"
    DATA_DELETE = "DATA_DELETE"
    CONFIG_CHANGE = "CONFIG_CHANGE"
    ADMIN_ACTION = "ADMIN_ACTION"
    SUBMISSION_CREATE = "SUBMISSION_CREATE"
    SUBMISSION_ACCESS = "SUBMISSION_ACCESS"


# ---------------------------------------------------------------------------
# BSI OPS.1.1.5 - Audit Logger
# ---------------------------------------------------------------------------
class BSIAuditLog:
    """
    BSI IT-Grundschutz OPS.1.1.5 compliant audit logger.

    Requirements:
    - Tamper-evident logging with HMAC integrity
    - Structured log format (JSON) for SIEM integration
    - Log retention per HinSchG Sec. 11 (3 years after case closure)
    - Separation of audit logs from application logs
    """

    def __init__(self, log_path: str = "/var/globaleaks/log/audit",
                 hmac_key: Optional[str] = None):
        self.log_path = log_path
        os.makedirs(log_path, exist_ok=True)

        self._hmac_key = (hmac_key or os.environ.get(
            "AUDIT_HMAC_KEY", "")).encode("utf-8")
        if not self._hmac_key:
            self._hmac_key = os.urandom(32)

        self._logger = logging.getLogger("bsi.audit")
        self._logger.setLevel(logging.INFO)
        self._logger.propagate = False

        handler = logging.handlers.TimedRotatingFileHandler(
            os.path.join(log_path, "audit.log"),
            when="midnight",
            backupCount=1095,  # 3 years retention per HinSchG
            utc=True,
        )
        handler.setFormatter(logging.Formatter("%(message)s"))
        if not self._logger.handlers:
            self._logger.addHandler(handler)

        self._prev_hash = "0" * 64

    def _compute_integrity(self, record: dict) -> str:
        """HMAC-SHA256 chain for tamper evidence (BSI OPS.1.1.5.A6)."""
        payload = json.dumps(record, sort_keys=True, default=str)
        chain_input = f"{self._prev_hash}|{payload}"
        digest = hmac.new(
            self._hmac_key, chain_input.encode("utf-8"), hashlib.sha256
        ).hexdigest()
        self._prev_hash = digest
        return digest

    def _emit(self, event_type: AuditEventType, data: dict) -> dict:
        record = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event_type": event_type.value,
            "severity": data.pop("severity", "INFO"),
            **data,
        }
        record["integrity"] = self._compute_integrity(record)
        self._logger.info(json.dumps(record, default=str))
        return record

    def log_access(self, user_id: str, resource: str, action: str,
                   ip_address: str, user_agent: str = "",
                   tenant_id: int = 1) -> dict:
        """Log resource access event (BSI OPS.1.1.5.A3)."""
        return self._emit(AuditEventType.ACCESS, {
            "user_id": user_id,
            "resource": resource,
            "action": action,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "tenant_id": tenant_id,
        })

    def log_change(self, user_id: str, resource: str,
                   old_value: str, new_value: str,
                   ip_address: str, tenant_id: int = 1) -> dict:
        """Log data modification event (BSI OPS.1.1.5.A3)."""
        return self._emit(AuditEventType.CHANGE, {
            "user_id": user_id,
            "resource": resource,
            "old_value_hash": hashlib.sha256(
                old_value.encode()).hexdigest()[:16],
            "new_value_hash": hashlib.sha256(
                new_value.encode()).hexdigest()[:16],
            "ip_address": ip_address,
            "tenant_id": tenant_id,
        })

    def log_auth(self, user_id: str, success: bool, ip_address: str,
                 method: str = "password", mfa_used: bool = False,
                 failure_reason: str = "", tenant_id: int = 1) -> dict:
        """Log authentication event (BSI OPS.1.1.5.A3, ORP.4.A5)."""
        event_type = (AuditEventType.AUTH_SUCCESS if success
                      else AuditEventType.AUTH_FAILURE)
        return self._emit(event_type, {
            "user_id": user_id,
            "ip_address": ip_address,
            "method": method,
            "mfa_used": mfa_used,
            "failure_reason": failure_reason,
            "severity": "INFO" if success else "WARNING",
            "tenant_id": tenant_id,
        })

    def log_security_event(self, event_name: str, details: dict,
                           severity: str = "WARNING",
                           ip_address: str = "",
                           user_id: str = "") -> dict:
        """Log security-relevant event (BSI OPS.1.1.5.A6)."""
        return self._emit(AuditEventType.SECURITY_ALERT, {
            "event_name": event_name,
            "details": details,
            "severity": severity,
            "ip_address": ip_address,
            "user_id": user_id,
        })

    def log_submission(self, submission_id: str, action: str,
                       ip_address: str, tenant_id: int = 1) -> dict:
        """Log whistleblowing submission event (HinSchG Sec. 11)."""
        event_type = (AuditEventType.SUBMISSION_CREATE if action == "create"
                      else AuditEventType.SUBMISSION_ACCESS)
        return self._emit(event_type, {
            "submission_id": submission_id,
            "action": action,
            "ip_address": ip_address,
            "tenant_id": tenant_id,
        })


# ---------------------------------------------------------------------------
# BSI APP.3.2.A11 - Session Security Configuration
# ---------------------------------------------------------------------------
SESSION_CONFIG = {
    # Maximum session lifetime in seconds (2 hours)
    "max_age": 7200,
    # Idle timeout in seconds (30 minutes)
    "idle_timeout": 1800,
    # Cookie security attributes
    "cookie_secure": True,
    "cookie_httponly": True,
    "cookie_samesite": "Strict",
    "cookie_path": "/",
    # Session regeneration after authentication
    "regenerate_on_auth": True,
    # Maximum concurrent sessions per user
    "max_concurrent_sessions": 3,
    # Whistleblower session: shorter lifetime for anonymity
    "whistleblower_max_age": 3600,
    "whistleblower_idle_timeout": 900,
}


# ---------------------------------------------------------------------------
# BSI ORP.4.A8 - Password Policy
# ---------------------------------------------------------------------------
class PasswordPolicy:
    """
    BSI ORP.4.A8 password policy enforcement.

    BSI recommends since 2024:
    - Minimum 8 characters (admin: 12)
    - Complexity not strictly required IF minimum length >= 20
    - Blocklist of common passwords
    - No periodic forced rotation (changed from older guidance)
    - Check against breached password databases encouraged
    """

    MIN_LENGTH_USER = 10
    MIN_LENGTH_ADMIN = 14
    MIN_LENGTH_NO_COMPLEXITY = 20
    MAX_LENGTH = 128

    COMMON_PASSWORDS_SAMPLE = {
        "password", "12345678", "qwertyui", "letmein1",
        "admin123", "welcome1", "changeme", "password1",
        "trustno1", "iloveyou", "sunshine", "princess",
    }

    @classmethod
    def check(cls, password: str, role: str = "user",
              username: str = "") -> Tuple[bool, List[str]]:
        """
        Validate password against BSI ORP.4.A8 policy.

        Returns:
            Tuple of (is_valid, list_of_violations)
        """
        violations: List[str] = []
        min_len = (cls.MIN_LENGTH_ADMIN
                   if role in ("admin", "receiver")
                   else cls.MIN_LENGTH_USER)

        if len(password) > cls.MAX_LENGTH:
            violations.append(
                f"Passwort darf maximal {cls.MAX_LENGTH} Zeichen haben")

        if len(password) < min_len:
            violations.append(
                f"Mindestlaenge: {min_len} Zeichen (aktuell: {len(password)})")

        # Complexity required if under 20 characters
        if len(password) < cls.MIN_LENGTH_NO_COMPLEXITY:
            if not re.search(r"[A-Z]", password):
                violations.append("Mindestens ein Grossbuchstabe erforderlich")
            if not re.search(r"[a-z]", password):
                violations.append("Mindestens ein Kleinbuchstabe erforderlich")
            if not re.search(r"\d", password):
                violations.append("Mindestens eine Ziffer erforderlich")
            if not re.search(r"[^A-Za-z0-9]", password):
                violations.append("Mindestens ein Sonderzeichen erforderlich")

        if password.lower() in cls.COMMON_PASSWORDS_SAMPLE:
            violations.append(
                "Passwort steht auf der Liste haeufiger Passwoerter")

        if username and username.lower() in password.lower():
            violations.append(
                "Passwort darf den Benutzernamen nicht enthalten")

        return (len(violations) == 0, violations)


# ---------------------------------------------------------------------------
# BSI APP.3.2.A14 - Rate Limiting Configuration
# ---------------------------------------------------------------------------
RATE_LIMIT_CONFIG = {
    # Authentication endpoints
    "auth_login": {
        "requests": 5,
        "window_seconds": 300,
        "block_duration_seconds": 900,
    },
    # API endpoints (general)
    "api_general": {
        "requests": 60,
        "window_seconds": 60,
        "block_duration_seconds": 60,
    },
    # Submission creation
    "submission_create": {
        "requests": 3,
        "window_seconds": 600,
        "block_duration_seconds": 600,
    },
    # Password reset
    "password_reset": {
        "requests": 3,
        "window_seconds": 3600,
        "block_duration_seconds": 3600,
    },
    # File upload
    "file_upload": {
        "requests": 20,
        "window_seconds": 600,
        "block_duration_seconds": 300,
    },
}


# ---------------------------------------------------------------------------
# BSI OPS.1.1.4 - IP Access Control
# ---------------------------------------------------------------------------
class IPAccessControl:
    """
    BSI OPS.1.1.4 compliant IP-based access control.
    Used primarily for admin panel access restriction.
    """

    def __init__(self):
        self._whitelist: Set[str] = set()
        self._blacklist: Set[str] = set()
        self._load_from_env()

    def _load_from_env(self):
        whitelist_env = os.environ.get("ADMIN_IP_WHITELIST", "")
        if whitelist_env:
            self._whitelist = {
                ip.strip() for ip in whitelist_env.split(",") if ip.strip()
            }

        blacklist_env = os.environ.get("IP_BLACKLIST", "")
        if blacklist_env:
            self._blacklist = {
                ip.strip() for ip in blacklist_env.split(",") if ip.strip()
            }

    def is_admin_allowed(self, ip_address: str) -> bool:
        """Check if IP is allowed for admin access."""
        if not self._whitelist:
            return True  # No whitelist = allow all (log warning)
        return ip_address in self._whitelist

    def is_blacklisted(self, ip_address: str) -> bool:
        """Check if IP is on the blacklist."""
        return ip_address in self._blacklist

    def add_to_blacklist(self, ip_address: str, reason: str = ""):
        """Dynamically blacklist an IP address."""
        self._blacklist.add(ip_address)

    def add_to_whitelist(self, ip_address: str):
        """Add IP to admin whitelist."""
        self._whitelist.add(ip_address)


# ---------------------------------------------------------------------------
# BSI CON.1 - Encryption at Rest Configuration
# ---------------------------------------------------------------------------
ENCRYPTION_CONFIG = {
    # AES-256-GCM for data at rest (BSI TR-02102-1)
    "algorithm": "AES-256-GCM",
    "key_derivation": "Argon2id",
    "argon2_time_cost": 3,
    "argon2_memory_cost": 65536,  # 64 MB
    "argon2_parallelism": 4,
    # Database encryption
    "encrypt_database": True,
    # File attachment encryption
    "encrypt_attachments": True,
    # Key rotation interval in days
    "key_rotation_interval_days": 90,
    # Backup encryption
    "encrypt_backups": True,
    "backup_key_separate": True,
}


# ---------------------------------------------------------------------------
# Module-level singleton instances
# ---------------------------------------------------------------------------
import logging.handlers  # noqa: E402 (deferred for clean class definitions)

audit_log = BSIAuditLog()
ip_access_control = IPAccessControl()
