"""
aitema|Hinweis - HinSchG Compliance Tests
Tests fuer die Einhaltung der HinSchG-Anforderungen.
"""

import pytest
from datetime import datetime, timezone, timedelta

from app.services.hinschg_compliance import HinSchGComplianceService, FristStatus
from app.services.encryption import EncryptionService


class TestFristenberechnung:
    """Tests fuer die Fristenberechnung gemaess HinSchG."""

    def test_eingangsbestaetigung_frist_7_tage(self):
        """Paragraf 17 Abs. 1: Eingangsbestaetigung innerhalb von 7 Tagen."""
        now = datetime.now(timezone.utc)
        frist = HinSchGComplianceService.berechne_eingangsbestaetigung_frist(now)
        expected = now + timedelta(days=7)
        assert frist == expected

    def test_eingangsbestaetigung_frist_custom(self):
        """Eingangsbestaetigung mit benutzerdefinierter Frist."""
        now = datetime.now(timezone.utc)
        frist = HinSchGComplianceService.berechne_eingangsbestaetigung_frist(now, tage=5)
        expected = now + timedelta(days=5)
        assert frist == expected

    def test_rueckmeldung_frist_3_monate(self):
        """Paragraf 17 Abs. 2: Rueckmeldung innerhalb von 3 Monaten."""
        now = datetime.now(timezone.utc)
        frist = HinSchGComplianceService.berechne_rueckmeldung_frist(now)
        expected = now + timedelta(days=90)
        assert frist == expected

    def test_aufbewahrungsfrist_3_jahre(self):
        """Paragraf 11 Abs. 5: Aufbewahrung 3 Jahre nach Abschluss."""
        abschluss = datetime(2026, 1, 1, tzinfo=timezone.utc)
        frist = HinSchGComplianceService.berechne_aufbewahrungsfrist(abschluss)
        expected = abschluss + timedelta(days=3 * 365)
        assert frist == expected


class TestFristStatus:
    """Tests fuer die Frist-Statuspruefung."""

    def test_frist_ok(self):
        """Frist mit genuegend Zeit ist ok."""
        frist = datetime.now(timezone.utc) + timedelta(days=5)
        status = HinSchGComplianceService.pruefe_frist_status(
            "Test", frist, erledigt=False
        )
        assert status.warnstufe == "ok"
        assert not status.ueberfaellig

    def test_frist_warnung(self):
        """Frist kurz vor Ablauf ist warnung."""
        frist = datetime.now(timezone.utc) + timedelta(days=2)
        status = HinSchGComplianceService.pruefe_frist_status(
            "Test", frist, erledigt=False
        )
        assert status.warnstufe == "warnung"
        assert not status.ueberfaellig

    def test_frist_kritisch(self):
        """Frist sehr kurz vor Ablauf ist kritisch."""
        frist = datetime.now(timezone.utc) + timedelta(hours=12)
        status = HinSchGComplianceService.pruefe_frist_status(
            "Test", frist, erledigt=False
        )
        assert status.warnstufe == "kritisch"
        assert not status.ueberfaellig

    def test_frist_ueberfaellig(self):
        """Abgelaufene Frist ist ueberfaellig."""
        frist = datetime.now(timezone.utc) - timedelta(days=1)
        status = HinSchGComplianceService.pruefe_frist_status(
            "Test", frist, erledigt=False
        )
        assert status.warnstufe == "ueberfaellig"
        assert status.ueberfaellig

    def test_frist_erledigt(self):
        """Erledigte Frist ist immer ok."""
        frist = datetime.now(timezone.utc) - timedelta(days=10)
        erledigt_am = datetime.now(timezone.utc) - timedelta(days=15)
        status = HinSchGComplianceService.pruefe_frist_status(
            "Test", frist, erledigt=True, erledigt_am=erledigt_am
        )
        assert status.warnstufe == "ok"
        assert not status.ueberfaellig
        assert status.erledigt


class TestAnwendungsbereich:
    """Tests fuer die Pruefung des sachlichen Anwendungsbereichs."""

    @pytest.mark.parametrize("kategorie", [
        "korruption", "betrug", "geldwaesche", "datenschutz",
        "umweltverstoss", "arbeitssicherheit", "verbraucherschutz",
    ])
    def test_hinschg_kategorien_im_anwendungsbereich(self, kategorie):
        """HinSchG-Kategorien sind im Anwendungsbereich."""
        assert HinSchGComplianceService.ist_im_anwendungsbereich(kategorie) is True

    def test_sonstiges_nicht_im_anwendungsbereich(self):
        """Kategorie sonstiges muss individuell geprueft werden."""
        assert HinSchGComplianceService.ist_im_anwendungsbereich("sonstiges") is False


class TestEncryption:
    """Tests fuer die Verschluesselungsintegritaet."""

    def test_encrypt_decrypt_roundtrip(self):
        """Verschluesselung und Entschluesselung sind umkehrbar."""
        service = EncryptionService("test-master-key-32-characters-min")
        plaintext = "Vertrauliche Meldung: Verdacht auf Korruption"
        ciphertext = service.encrypt(plaintext)
        decrypted = service.decrypt(ciphertext)
        assert decrypted == plaintext

    def test_different_ciphertext_for_same_plaintext(self):
        """Gleicher Klartext ergibt unterschiedliche Ciphertexte (randomisierte IV)."""
        service = EncryptionService("test-master-key-32-characters-min")
        plaintext = "Test-Nachricht"
        ct1 = service.encrypt(plaintext)
        ct2 = service.encrypt(plaintext)
        assert ct1 \!= ct2

    def test_context_binding(self):
        """Verschluesselung mit unterschiedlichem Kontext ergibt unterschiedliche Ergebnisse."""
        service = EncryptionService("test-master-key-32-characters-min")
        plaintext = "Test-Nachricht"
        ct1 = service.encrypt(plaintext, context="tenant-1")
        ct2 = service.encrypt(plaintext, context="tenant-2")
        assert ct1 \!= ct2

    def test_empty_string_handling(self):
        """Leere Strings werden korrekt behandelt."""
        service = EncryptionService("test-master-key-32-characters-min")
        assert service.encrypt("") == ""
        assert service.decrypt("") == ""

    def test_short_master_key_rejected(self):
        """Zu kurzer Master-Key wird abgelehnt."""
        with pytest.raises(ValueError, match="32 Zeichen"):
            EncryptionService("short")

    def test_unicode_roundtrip(self):
        """Unicode-Texte (Umlaute etc.) werden korrekt verschluesselt."""
        service = EncryptionService("test-master-key-32-characters-min")
        plaintext = "Aeusserst vertraulich: Meldung ueber Vergaberechtsverstoesse"
        ciphertext = service.encrypt(plaintext)
        decrypted = service.decrypt(ciphertext)
        assert decrypted == plaintext
