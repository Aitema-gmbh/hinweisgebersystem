"""
aitema|Hinweis - Multi-Factor Authentication (MFA) Module
=========================================================
BSI ORP.4.A9: Zwei-Faktor-Authentisierung fuer privilegierte Zugaenge
BSI APP.3.2.A11: Sichere Authentisierung

Implements TOTP (Time-based One-Time Password) per RFC 6238
with recovery codes for admin and receiver accounts.

HinSchG Sec. 12: Only authorized persons may access the system.
MFA is mandatory for admin and receiver roles.
"""

import base64
import hashlib
import hmac
import os
import secrets
import struct
import time
from typing import Dict, List, Optional, Tuple
from urllib.parse import quote


# ---------------------------------------------------------------------------
# TOTP Implementation (RFC 6238 / RFC 4226)
# ---------------------------------------------------------------------------
class TOTPService:
    """
    TOTP Multi-Factor Authentication per BSI ORP.4.A9.

    Parameters follow BSI TR-02102-1 recommendations:
    - SHA-1 for HOTP compatibility (per RFC 6238)
    - 6-digit codes
    - 30-second time step
    - 1-step tolerance window for clock drift
    """

    DIGITS = 6
    TIME_STEP = 30
    TOLERANCE = 1  # Allow +/- 1 time step
    SECRET_LENGTH = 20  # 160 bits per RFC 4226
    ISSUER = "aitema|Hinweis"

    @classmethod
    def generate_secret(cls) -> str:
        """
        Generate a new TOTP secret key.

        Returns:
            Base32-encoded secret string for QR code generation.
        """
        secret_bytes = os.urandom(cls.SECRET_LENGTH)
        return base64.b32encode(secret_bytes).decode("ascii").rstrip("=")

    @classmethod
    def _compute_hotp(cls, secret: str, counter: int) -> str:
        """Compute HOTP value per RFC 4226."""
        # Decode base32 secret (add padding if needed)
        padded = secret + "=" * (-len(secret) % 8)
        key = base64.b32decode(padded.upper())

        # Counter as 8-byte big-endian
        counter_bytes = struct.pack(">Q", counter)

        # HMAC-SHA1
        hmac_digest = hmac.new(key, counter_bytes, hashlib.sha1).digest()

        # Dynamic truncation per RFC 4226 Section 5.3
        offset = hmac_digest[-1] & 0x0F
        code_int = struct.unpack(">I", hmac_digest[offset:offset + 4])[0]
        code_int &= 0x7FFFFFFF
        code = code_int % (10 ** cls.DIGITS)

        return str(code).zfill(cls.DIGITS)

    @classmethod
    def _get_counter(cls, timestamp: Optional[float] = None) -> int:
        """Get current TOTP counter from Unix timestamp."""
        t = timestamp if timestamp is not None else time.time()
        return int(t) // cls.TIME_STEP

    @classmethod
    def generate_totp(cls, secret: str,
                      timestamp: Optional[float] = None) -> str:
        """
        Generate current TOTP code.

        Args:
            secret: Base32-encoded secret
            timestamp: Optional Unix timestamp (default: current time)

        Returns:
            6-digit TOTP code string
        """
        counter = cls._get_counter(timestamp)
        return cls._compute_hotp(secret, counter)

    @classmethod
    def verify_totp(cls, secret: str, code: str,
                    timestamp: Optional[float] = None) -> bool:
        """
        Verify a TOTP code with tolerance window.

        Args:
            secret: Base32-encoded secret
            code: User-provided TOTP code
            timestamp: Optional Unix timestamp (default: current time)

        Returns:
            True if code is valid within tolerance window
        """
        if not code or len(code) != cls.DIGITS or not code.isdigit():
            return False

        counter = cls._get_counter(timestamp)

        # Check current step and +/- tolerance
        for offset in range(-cls.TOLERANCE, cls.TOLERANCE + 1):
            expected = cls._compute_hotp(secret, counter + offset)
            if hmac.compare_digest(expected, code):
                return True

        return False

    @classmethod
    def generate_qr_uri(cls, secret: str, account_name: str,
                        issuer: Optional[str] = None) -> str:
        """
        Generate otpauth:// URI for QR code generation.

        Args:
            secret: Base32-encoded secret
            account_name: User identifier (e.g., email or username)
            issuer: Service name (default: aitema|Hinweis)

        Returns:
            otpauth:// URI string for QR code apps
        """
        issuer = issuer or cls.ISSUER
        label = f"{quote(issuer)}:{quote(account_name)}"
        params = (
            f"secret={secret}"
            f"&issuer={quote(issuer)}"
            f"&algorithm=SHA1"
            f"&digits={cls.DIGITS}"
            f"&period={cls.TIME_STEP}"
        )
        return f"otpauth://totp/{label}?{params}"


# ---------------------------------------------------------------------------
# Recovery Codes
# ---------------------------------------------------------------------------
class RecoveryCodeService:
    """
    Recovery codes for MFA fallback per BSI ORP.4.A9.

    Each code is single-use. Users receive a set of codes during
    MFA enrollment for account recovery if the TOTP device is lost.
    """

    CODE_COUNT = 10
    CODE_LENGTH = 8  # 8 alphanumeric characters per code

    @classmethod
    def generate_codes(cls) -> List[str]:
        """
        Generate a set of single-use recovery codes.

        Returns:
            List of recovery code strings (plaintext, shown once to user)
        """
        codes = []
        for _ in range(cls.CODE_COUNT):
            # Generate cryptographically secure random code
            code = secrets.token_hex(cls.CODE_LENGTH // 2).upper()
            # Format as XXXX-XXXX for readability
            formatted = f"{code[:4]}-{code[4:]}"
            codes.append(formatted)
        return codes

    @classmethod
    def hash_code(cls, code: str) -> str:
        """
        Hash a recovery code for secure storage.

        Args:
            code: Plaintext recovery code

        Returns:
            SHA-256 hash of normalized code
        """
        normalized = code.replace("-", "").strip().upper()
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

    @classmethod
    def hash_codes(cls, codes: List[str]) -> List[str]:
        """Hash a list of recovery codes for database storage."""
        return [cls.hash_code(c) for c in codes]

    @classmethod
    def verify_code(cls, provided_code: str,
                    stored_hashes: List[str]) -> Tuple[bool, int]:
        """
        Verify a recovery code against stored hashes.

        Args:
            provided_code: User-provided recovery code
            stored_hashes: List of hashed recovery codes from database

        Returns:
            Tuple of (is_valid, index_of_matched_code)
            index is -1 if not found
        """
        provided_hash = cls.hash_code(provided_code)

        for idx, stored_hash in enumerate(stored_hashes):
            if hmac.compare_digest(provided_hash, stored_hash):
                return True, idx

        return False, -1


# ---------------------------------------------------------------------------
# MFA Enrollment Workflow
# ---------------------------------------------------------------------------
class MFAManager:
    """
    MFA lifecycle management for aitema|Hinweis.

    Workflow:
    1. Admin/Receiver initiates enrollment -> generate_enrollment()
    2. User scans QR code with authenticator app
    3. User provides verification code -> confirm_enrollment()
    4. User stores recovery codes securely
    5. MFA is active for subsequent logins

    BSI ORP.4.A9: MFA mandatory for admin and receiver roles.
    """

    # Roles that require MFA (BSI ORP.4.A9)
    MFA_REQUIRED_ROLES = {"admin", "receiver"}

    @classmethod
    def is_mfa_required(cls, role: str) -> bool:
        """Check if MFA is required for a given role."""
        return role.lower() in cls.MFA_REQUIRED_ROLES

    @classmethod
    def generate_enrollment(cls, account_name: str) -> Dict:
        """
        Start MFA enrollment for a user.

        Args:
            account_name: Username or email for QR code label

        Returns:
            Dict with secret, qr_uri, and recovery_codes
        """
        secret = TOTPService.generate_secret()
        qr_uri = TOTPService.generate_qr_uri(secret, account_name)
        recovery_codes = RecoveryCodeService.generate_codes()
        recovery_hashes = RecoveryCodeService.hash_codes(recovery_codes)

        return {
            "secret": secret,
            "qr_uri": qr_uri,
            "recovery_codes": recovery_codes,       # Show to user ONCE
            "recovery_hashes": recovery_hashes,      # Store in database
            "enrolled_at": None,                     # Set on confirmation
            "is_confirmed": False,
        }

    @classmethod
    def confirm_enrollment(cls, secret: str, verification_code: str) -> bool:
        """
        Confirm MFA enrollment by verifying user can generate valid codes.

        Args:
            secret: The TOTP secret from enrollment
            verification_code: Code from user's authenticator app

        Returns:
            True if verification succeeds
        """
        return TOTPService.verify_totp(secret, verification_code)

    @classmethod
    def generate_reset(cls, account_name: str) -> Dict:
        """
        Reset MFA for a user (generates new secret and recovery codes).

        This should only be callable by an admin after identity verification.
        The old secret and recovery codes are invalidated.

        Args:
            account_name: Username or email

        Returns:
            New enrollment data (same structure as generate_enrollment)
        """
        return cls.generate_enrollment(account_name)

    @classmethod
    def authenticate(cls, secret: str, code: str,
                     recovery_hashes: List[str]) -> Dict:
        """
        Authenticate MFA during login.

        Tries TOTP first, then falls back to recovery code.

        Args:
            secret: Stored TOTP secret
            code: User-provided code (TOTP or recovery)
            recovery_hashes: Stored hashed recovery codes

        Returns:
            Dict with success status, method used, and updated recovery hashes
        """
        # Try TOTP verification first
        if TOTPService.verify_totp(secret, code):
            return {
                "success": True,
                "method": "totp",
                "recovery_hashes": recovery_hashes,
                "used_recovery_index": -1,
            }

        # Try recovery code
        valid, index = RecoveryCodeService.verify_code(
            code, recovery_hashes)
        if valid:
            # Remove used recovery code (single-use)
            updated_hashes = recovery_hashes.copy()
            updated_hashes.pop(index)
            return {
                "success": True,
                "method": "recovery",
                "recovery_hashes": updated_hashes,
                "used_recovery_index": index,
                "remaining_recovery_codes": len(updated_hashes),
            }

        return {
            "success": False,
            "method": "none",
            "recovery_hashes": recovery_hashes,
            "used_recovery_index": -1,
        }
