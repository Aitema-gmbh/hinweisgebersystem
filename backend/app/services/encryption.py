"""
aitema|Hinweis - Encryption Service
AES-256-GCM Verschluesselung mit Zero-Knowledge-Architektur.
"""

import os
import base64
import hashlib
import secrets
from typing import Optional

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
import structlog

log = structlog.get_logger()

# Konstanten
AES_KEY_SIZE = 32  # 256 Bit
NONCE_SIZE = 12    # 96 Bit (GCM Standard)
TAG_SIZE = 16      # 128 Bit
SALT_SIZE = 16     # 128 Bit


class EncryptionService:
    """
    Verschluesselungs-Service mit AES-256-GCM.

    Architektur:
    - Master Key: Aus Umgebungsvariable, nie in der DB
    - Derived Keys: Per-Tenant / Per-Record Keys via HKDF
    - Zero-Knowledge: Server speichert nur Ciphertext
    - Nonce: Zufaellig, pro Verschluesselungsvorgang eindeutig
    """

    def __init__(self, master_key: str):
        """
        Initialisiert den Encryption-Service.

        Args:
            master_key: Hex-kodierter Master-Key (min. 32 Zeichen)
        """
        if len(master_key) < 32:
            raise ValueError("Master-Key muss mindestens 32 Zeichen lang sein")

        # Master-Key aus String ableiten
        self._master_key = hashlib.sha256(master_key.encode()).digest()

    def _derive_key(self, context: str = "", salt: Optional[bytes] = None) -> tuple[bytes, bytes]:
        """
        Leitet einen Schluessel vom Master-Key ab (HKDF).

        Args:
            context: Kontext-String (z.B. Tenant-ID, Record-ID)
            salt: Optional Salt (wird generiert wenn nicht angegeben)

        Returns:
            Tuple aus (abgeleiteter Schluessel, Salt)
        """
        if salt is None:
            salt = os.urandom(SALT_SIZE)

        hkdf = HKDF(
            algorithm=hashes.SHA256(),
            length=AES_KEY_SIZE,
            salt=salt,
            info=context.encode() if context else b"aitema-hinweis-encryption",
        )
        derived_key = hkdf.derive(self._master_key)
        return derived_key, salt

    def encrypt(self, plaintext: str, context: str = "") -> str:
        """
        Verschluesselt einen Klartext mit AES-256-GCM.

        Args:
            plaintext: Zu verschluesselnder Text
            context: Optionaler Kontext fuer Key-Derivation

        Returns:
            Base64-kodierter Ciphertext im Format:
            base64(salt || nonce || ciphertext_with_tag)
        """
        if not plaintext:
            return ""

        try:
            # Key ableiten
            key, salt = self._derive_key(context)

            # Nonce generieren
            nonce = os.urandom(NONCE_SIZE)

            # Verschluesseln
            aesgcm = AESGCM(key)
            ciphertext = aesgcm.encrypt(
                nonce,
                plaintext.encode("utf-8"),
                context.encode("utf-8") if context else None,  # AAD
            )

            # Format: salt || nonce || ciphertext_with_tag
            combined = salt + nonce + ciphertext
            return base64.b64encode(combined).decode("ascii")

        except Exception as e:
            log.error("encryption_failed", error=str(e))
            raise ValueError(f"Verschluesselung fehlgeschlagen: {e}")

    def decrypt(self, ciphertext_b64: str, context: str = "") -> str:
        """
        Entschluesselt einen Base64-kodierten Ciphertext.

        Args:
            ciphertext_b64: Base64-kodierter Ciphertext
            context: Gleicher Kontext wie bei der Verschluesselung

        Returns:
            Entschluesselter Klartext
        """
        if not ciphertext_b64:
            return ""

        try:
            # Dekodieren
            combined = base64.b64decode(ciphertext_b64)

            # Aufteilen: salt || nonce || ciphertext_with_tag
            salt = combined[:SALT_SIZE]
            nonce = combined[SALT_SIZE : SALT_SIZE + NONCE_SIZE]
            ciphertext = combined[SALT_SIZE + NONCE_SIZE :]

            # Key ableiten (gleicher Salt)
            key, _ = self._derive_key(context, salt=salt)

            # Entschluesseln
            aesgcm = AESGCM(key)
            plaintext = aesgcm.decrypt(
                nonce,
                ciphertext,
                context.encode("utf-8") if context else None,  # AAD
            )

            return plaintext.decode("utf-8")

        except Exception as e:
            log.error("decryption_failed", error=str(e))
            raise ValueError(f"Entschluesselung fehlgeschlagen: {e}")

    def encrypt_field(self, value: str, record_id: str, field_name: str) -> str:
        """
        Verschluesselt ein einzelnes Datenbankfeld.

        Nutzt Record-ID + Feldname als Kontext fuer Key-Derivation,
        sodass jedes Feld seinen eigenen abgeleiteten Schluessel hat.
        """
        context = f"{record_id}:{field_name}"
        return self.encrypt(value, context)

    def decrypt_field(self, ciphertext: str, record_id: str, field_name: str) -> str:
        """Entschluesselt ein einzelnes Datenbankfeld."""
        context = f"{record_id}:{field_name}"
        return self.decrypt(ciphertext, context)

    @staticmethod
    def generate_key() -> str:
        """Generiert einen neuen zufaelligen Schluessel (fuer Konfiguration)."""
        return secrets.token_hex(32)

    @staticmethod
    def hash_for_search(value: str, salt: str = "") -> str:
        """
        Erstellt einen deterministischen Hash fuer verschluesselte Suche.

        ACHTUNG: Nicht fuer Passwoerter verwenden! Nur fuer
        gleichheitsbasierte Suche auf verschluesselten Feldern.
        """
        combined = f"{salt}:{value}".encode()
        return hashlib.sha256(combined).hexdigest()
