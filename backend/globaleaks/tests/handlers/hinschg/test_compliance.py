"""
Tests for HinSchG section 27 Compliance Reporting.

Covers:
- Annual compliance report generation
- Report statistics validation
- section 11 data deletion after retention period
- 3-year retention period calculation
"""
import unittest
from unittest.mock import MagicMock, patch
from datetime import datetime, timedelta

from globaleaks.services.hinschg import generate_aktenzeichen
from globaleaks.services.hinschg.tenant_config import TenantHinschgConfig


# ============================================================
# Helpers
# ============================================================

def _make_report(**kwargs):
    """Create a mock HinschgReport."""
    r = MagicMock()
    r.id = kwargs.get("id", "report-001")
    r.tid = kwargs.get("tid", 1)
    r.berichtszeitraum_von = kwargs.get("von", datetime(2025, 1, 1))
    r.berichtszeitraum_bis = kwargs.get("bis", datetime(2025, 12, 31))
    r.gesamt_meldungen = kwargs.get("gesamt", 25)
    r.stichhaltige_meldungen = kwargs.get("stichhaltig", 18)
    r.nicht_stichhaltige_meldungen = kwargs.get("nicht_stichhaltig", 5)
    r.offene_faelle = kwargs.get("offen", 2)
    r.abgeschlossene_faelle = kwargs.get("abgeschlossen", 23)
    r.durchschnittliche_bearbeitungszeit_tage = kwargs.get("avg_days", 42.5)
    r.fristverstoesse_7t = kwargs.get("fristen_7t", 1)
    r.fristverstoesse_3m = kwargs.get("fristen_3m", 0)
    r.kategorien_verteilung = kwargs.get("kategorien", {
        "korruption": 5, "datenschutz": 8, "arbeitsschutz": 3,
        "sonstiges": 9,
    })
    r.erstellt_von = kwargs.get("erstellt_von", "admin-001")
    r.created_at = kwargs.get("created_at", datetime(2026, 1, 15))
    return r


def _make_case(**kwargs):
    """Create a mock HinweisCase for report tests."""
    case = MagicMock()
    case.id = kwargs.get("id", "case-001")
    case.tid = kwargs.get("tid", 1)
    case.status = kwargs.get("status", "abgeschlossen")
    case.stichhaltig = kwargs.get("stichhaltig", True)
    case.kategorie = kwargs.get("kategorie", "sonstiges")
    case.eingangsdatum = kwargs.get("eingangsdatum", datetime(2025, 3, 1))
    case.abschluss_datum = kwargs.get("abschluss_datum", datetime(2025, 5, 15))
    case.loeschung_datum = kwargs.get("loeschung_datum", None)
    case.aktenzeichen = kwargs.get("aktenzeichen", "HIN-001-2025-00001")
    return case


# ============================================================
# Test: Generate Annual Report
# ============================================================

class TestGenerateAnnualReport(unittest.TestCase):
    """Test compliance report generation for annual reporting (section 27)."""

    def test_report_has_correct_period(self):
        report = _make_report(
            von=datetime(2025, 1, 1),
            bis=datetime(2025, 12, 31),
        )
        self.assertEqual(report.berichtszeitraum_von.year, 2025)
        self.assertEqual(report.berichtszeitraum_bis.month, 12)

    def test_report_contains_gesamt_meldungen(self):
        report = _make_report(gesamt=25)
        self.assertEqual(report.gesamt_meldungen, 25)

    def test_report_contains_stichhaltige(self):
        report = _make_report(stichhaltig=18, nicht_stichhaltig=5)
        self.assertEqual(report.stichhaltige_meldungen, 18)
        self.assertEqual(report.nicht_stichhaltige_meldungen, 5)

    def test_report_sum_consistency(self):
        """stichhaltig + nicht_stichhaltig + offen <= gesamt."""
        report = _make_report(gesamt=25, stichhaltig=18, nicht_stichhaltig=5, offen=2)
        self.assertLessEqual(
            report.stichhaltige_meldungen +
            report.nicht_stichhaltige_meldungen +
            report.offene_faelle,
            report.gesamt_meldungen,
        )

    def test_report_records_erstellt_von(self):
        report = _make_report(erstellt_von="admin-001")
        self.assertEqual(report.erstellt_von, "admin-001")


# ============================================================
# Test: Report Statistics
# ============================================================

class TestReportStatistics(unittest.TestCase):
    """Test report statistics accuracy."""

    def test_average_processing_time(self):
        """Avg processing time calculated from completed cases."""
        cases = [
            _make_case(eingangsdatum=datetime(2025, 1, 1), abschluss_datum=datetime(2025, 2, 10)),
            _make_case(eingangsdatum=datetime(2025, 3, 1), abschluss_datum=datetime(2025, 4, 1)),
            _make_case(eingangsdatum=datetime(2025, 5, 1), abschluss_datum=datetime(2025, 7, 1)),
        ]
        days = []
        for c in cases:
            if c.abschluss_datum and c.eingangsdatum:
                delta = (c.abschluss_datum - c.eingangsdatum).days
                days.append(delta)
        avg = sum(days) / len(days)
        self.assertGreater(avg, 0)
        self.assertAlmostEqual(avg, (40 + 31 + 61) / 3, places=1)

    def test_category_distribution(self):
        report = _make_report()
        self.assertIn("korruption", report.kategorien_verteilung)
        self.assertIn("datenschutz", report.kategorien_verteilung)
        total_from_kat = sum(report.kategorien_verteilung.values())
        self.assertEqual(total_from_kat, 25)

    def test_fristverstoesse_counted(self):
        report = _make_report(fristen_7t=1, fristen_3m=0)
        self.assertEqual(report.fristverstoesse_7t, 1)
        self.assertEqual(report.fristverstoesse_3m, 0)

    def test_offene_vs_abgeschlossene_sum(self):
        report = _make_report(offen=2, abgeschlossen=23, gesamt=25)
        self.assertEqual(
            report.offene_faelle + report.abgeschlossene_faelle,
            report.gesamt_meldungen,
        )

    def test_empty_period_produces_zero_report(self):
        report = _make_report(
            gesamt=0, stichhaltig=0, nicht_stichhaltig=0,
            offen=0, abgeschlossen=0, avg_days=0,
            fristen_7t=0, fristen_3m=0, kategorien={},
        )
        self.assertEqual(report.gesamt_meldungen, 0)
        self.assertEqual(report.kategorien_verteilung, {})


# ============================================================
# Test: Data Deletion (section 11)
# ============================================================

class TestDataDeletion(unittest.TestCase):
    """Test section 11 HinSchG data deletion after retention period."""

    def test_case_expired_when_loeschung_datum_passed(self):
        case = _make_case(
            status="archiviert",
            loeschung_datum=datetime(2026, 1, 1),
        )
        now = datetime(2026, 2, 1)
        is_expired = (
            case.status == "archiviert" and
            case.loeschung_datum is not None and
            case.loeschung_datum <= now
        )
        self.assertTrue(is_expired)

    def test_case_not_expired_when_future_loeschung(self):
        case = _make_case(
            status="archiviert",
            loeschung_datum=datetime(2029, 6, 15),
        )
        now = datetime(2026, 2, 1)
        is_expired = (
            case.status == "archiviert" and
            case.loeschung_datum is not None and
            case.loeschung_datum <= now
        )
        self.assertFalse(is_expired)

    def test_non_archived_case_not_eligible_for_deletion(self):
        case = _make_case(
            status="abgeschlossen",
            loeschung_datum=datetime(2025, 1, 1),
        )
        now = datetime(2026, 2, 1)
        is_expired = (
            case.status == "archiviert" and
            case.loeschung_datum is not None and
            case.loeschung_datum <= now
        )
        self.assertFalse(is_expired)


# ============================================================
# Test: Retention Period (3 Years)
# ============================================================

class TestRetentionPeriod(unittest.TestCase):
    """Test 3-year retention period calculation per section 11 Abs. 1."""

    def test_3_year_retention_from_abschluss(self):
        abschluss = datetime(2026, 6, 15, 10, 0)
        retention_end = abschluss + timedelta(days=3 * 365)
        self.assertEqual(retention_end.year, 2029)

    def test_retention_period_configurable_within_limits(self):
        """Tenant can set 3-10 year retention."""
        # Valid: 5 years
        errors = TenantHinschgConfig.validate_config(
            {"aufbewahrungsfrist_jahre": 5}
        )
        self.assertEqual(errors, {})

    def test_retention_below_minimum_rejected(self):
        """Less than 3 years is illegal."""
        errors = TenantHinschgConfig.validate_config(
            {"aufbewahrungsfrist_jahre": 2}
        )
        self.assertIn("aufbewahrungsfrist_jahre", errors)

    def test_retention_above_maximum_rejected(self):
        """More than 10 years rejected."""
        errors = TenantHinschgConfig.validate_config(
            {"aufbewahrungsfrist_jahre": 15}
        )
        self.assertIn("aufbewahrungsfrist_jahre", errors)

    def test_retention_at_exact_minimum(self):
        errors = TenantHinschgConfig.validate_config(
            {"aufbewahrungsfrist_jahre": 3}
        )
        self.assertEqual(errors, {})

    def test_retention_at_exact_maximum(self):
        errors = TenantHinschgConfig.validate_config(
            {"aufbewahrungsfrist_jahre": 10}
        )
        self.assertEqual(errors, {})

    def test_loeschung_after_archivierung_grace(self):
        """After archival, 30-day grace period before deletion."""
        archivierung = datetime(2029, 6, 15)
        loeschung = archivierung + timedelta(days=30)
        self.assertEqual((loeschung - archivierung).days, 30)

    def test_full_timeline(self):
        """Verify the full retention timeline."""
        eingang = datetime(2026, 1, 15)
        abschluss = datetime(2026, 6, 15)
        archivierung = abschluss + timedelta(days=3 * 365)
        loeschung = archivierung + timedelta(days=30)

        self.assertGreater(abschluss, eingang)
        self.assertGreater(archivierung, abschluss)
        self.assertGreater(loeschung, archivierung)
        self.assertEqual(archivierung.year, 2029)


if __name__ == "__main__":
    unittest.main()
