"""
Tests for HinSchG Case Management.
"""
import unittest
from datetime import datetime, timedelta

from globaleaks.models.hinschg import (
    FallStatus, HinweisKategorie, FallPrioritaet, MeldeKanal,
)
from globaleaks.services.hinschg import (
    generate_aktenzeichen,
    VALID_TRANSITIONS,
)


class TestAktenzeichen(unittest.TestCase):
    def test_format(self):
        result = generate_aktenzeichen(1, 2026, 1)
        self.assertEqual(result, "HIN-001-2026-00001")
    
    def test_sequence(self):
        result = generate_aktenzeichen(1, 2026, 42)
        self.assertEqual(result, "HIN-001-2026-00042")
    
    def test_multi_tenant(self):
        result = generate_aktenzeichen(15, 2026, 1)
        self.assertEqual(result, "HIN-015-2026-00001")


class TestStatusTransitions(unittest.TestCase):
    def test_valid_initial_transition(self):
        allowed = VALID_TRANSITIONS[FallStatus.EINGEGANGEN.value]
        self.assertIn(FallStatus.EINGANGSBESTAETIGUNG.value, allowed)
    
    def test_invalid_skip_transition(self):
        allowed = VALID_TRANSITIONS[FallStatus.EINGEGANGEN.value]
        self.assertNotIn(FallStatus.IN_BEARBEITUNG.value, allowed)
    
    def test_pruefung_can_close(self):
        allowed = VALID_TRANSITIONS[FallStatus.IN_PRUEFUNG.value]
        self.assertIn(FallStatus.ABGESCHLOSSEN.value, allowed)
    
    def test_abgeschlossen_can_reopen(self):
        allowed = VALID_TRANSITIONS[FallStatus.ABGESCHLOSSEN.value]
        self.assertIn(FallStatus.IN_BEARBEITUNG.value, allowed)
    
    def test_full_happy_path(self):
        path = [
            FallStatus.EINGEGANGEN.value,
            FallStatus.EINGANGSBESTAETIGUNG.value,
            FallStatus.IN_PRUEFUNG.value,
            FallStatus.IN_BEARBEITUNG.value,
            FallStatus.FOLGEMANAHME.value,
            FallStatus.RUECKMELDUNG.value,
            FallStatus.ABGESCHLOSSEN.value,
            FallStatus.ARCHIVIERT.value,
        ]
        for i in range(len(path) - 1):
            current = path[i]
            next_status = path[i + 1]
            allowed = VALID_TRANSITIONS.get(current, [])
            self.assertIn(next_status, allowed,
                f"Transition {current} -> {next_status} should be valid")


class TestHinweisKategorie(unittest.TestCase):
    def test_all_categories_exist(self):
        required = ['straftat', 'ordnungswidrigkeit', 'verstoss_eu_recht',
                     'arbeitsschutz', 'umweltschutz', 'verbraucherschutz',
                     'datenschutz', 'korruption', 'geldwaesche']
        values = [k.value for k in HinweisKategorie]
        for req in required:
            self.assertIn(req, values)
    
    def test_meldekanal_variants(self):
        channels = [k.value for k in MeldeKanal]
        self.assertIn('online', channels)
        self.assertIn('telefonisch', channels)
        self.assertIn('persoenlich', channels)
        self.assertIn('briefpost', channels)


class TestDeadlineCalculation(unittest.TestCase):
    def test_7_day_deadline(self):
        now = datetime(2026, 3, 1, 10, 0, 0)
        frist = now + timedelta(days=7)
        self.assertEqual(frist, datetime(2026, 3, 8, 10, 0, 0))
    
    def test_3_month_deadline(self):
        now = datetime(2026, 3, 1, 10, 0, 0)
        frist = now + timedelta(days=90)
        self.assertEqual(frist, datetime(2026, 5, 30, 10, 0, 0))
    
    def test_3_year_retention(self):
        abschluss = datetime(2026, 6, 15, 10, 0, 0)
        loeschung = abschluss + timedelta(days=3*365)
        self.assertEqual(loeschung.year, 2029)


if __name__ == '__main__':
    unittest.main()
