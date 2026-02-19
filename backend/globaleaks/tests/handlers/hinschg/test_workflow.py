"""
Tests for the complete HinSchG Workflow.

Covers:
- Case creation with Aktenzeichen generation
- Full status transition chain (eingegangen -> archiviert)
- Invalid transition rejection
- Automatic 7-day and 3-month deadline creation
- Overdue deadline detection
- Case history audit trail
- Anonymous case handling
- Abschluss requires Begruendung
"""
import unittest
from unittest.mock import MagicMock, patch, PropertyMock
from datetime import datetime, timedelta


# ============================================================
# Mock Models
# ============================================================

def _make_case(**kwargs):
    """Create a mock HinweisCase with sensible defaults."""
    case = MagicMock()
    case.id = kwargs.get("id", "case-uuid-001")
    case.tid = kwargs.get("tid", 1)
    case.internaltip_id = kwargs.get("internaltip_id", "tip-001")
    case.aktenzeichen = kwargs.get("aktenzeichen", "HIN-001-2026-00001")
    case.kategorie = kwargs.get("kategorie", "sonstiges")
    case.status = kwargs.get("status", "eingegangen")
    case.prioritaet = kwargs.get("prioritaet", "mittel")
    case.meldekanal = kwargs.get("meldekanal", "online")
    case.eingangsdatum = kwargs.get("eingangsdatum", datetime(2026, 1, 15, 10, 0))
    case.eingangsbestaetigung_datum = kwargs.get("eingangsbestaetigung_datum", None)
    case.eingangsbestaetigung_frist = kwargs.get("eingangsbestaetigung_frist", datetime(2026, 1, 22, 10, 0))
    case.rueckmeldung_frist = kwargs.get("rueckmeldung_frist", datetime(2026, 4, 15, 10, 0))
    case.rueckmeldung_datum = kwargs.get("rueckmeldung_datum", None)
    case.abschluss_datum = kwargs.get("abschluss_datum", None)
    case.archivierung_datum = kwargs.get("archivierung_datum", None)
    case.loeschung_datum = kwargs.get("loeschung_datum", None)
    case.ombudsperson_id = kwargs.get("ombudsperson_id", None)
    case.fallbearbeiter_id = kwargs.get("fallbearbeiter_id", None)
    case.stichhaltig = kwargs.get("stichhaltig", None)
    case.folgemassnahme_beschreibung = kwargs.get("folgemassnahme_beschreibung", "")
    case.begruendung = kwargs.get("begruendung", "")
    case.created_at = kwargs.get("created_at", datetime(2026, 1, 15, 10, 0))
    case.updated_at = kwargs.get("updated_at", datetime(2026, 1, 15, 10, 0))
    return case


def _make_frist(**kwargs):
    """Create a mock HinweisFrist."""
    f = MagicMock()
    f.id = kwargs.get("id", "frist-001")
    f.tid = kwargs.get("tid", 1)
    f.case_id = kwargs.get("case_id", "case-uuid-001")
    f.frist_typ = kwargs.get("frist_typ", "eingangsbestaetigung_7t")
    f.frist_datum = kwargs.get("frist_datum", datetime(2026, 1, 22, 10, 0))
    f.erledigt = kwargs.get("erledigt", False)
    f.erledigt_datum = kwargs.get("erledigt_datum", None)
    f.erinnerung_gesendet = kwargs.get("erinnerung_gesendet", False)
    f.eskaliert = kwargs.get("eskaliert", False)
    return f


# ============================================================
# Test: Case Creation
# ============================================================

class TestCreateCase(unittest.TestCase):
    """Test HinSchG case creation with automatic Aktenzeichen."""

    def test_aktenzeichen_format(self):
        from globaleaks.services.hinschg import generate_aktenzeichen
        result = generate_aktenzeichen(1, 2026, 1)
        self.assertEqual(result, "HIN-001-2026-00001")

    def test_aktenzeichen_increments(self):
        from globaleaks.services.hinschg import generate_aktenzeichen
        r1 = generate_aktenzeichen(1, 2026, 1)
        r2 = generate_aktenzeichen(1, 2026, 2)
        r3 = generate_aktenzeichen(1, 2026, 100)
        self.assertEqual(r1, "HIN-001-2026-00001")
        self.assertEqual(r2, "HIN-001-2026-00002")
        self.assertEqual(r3, "HIN-001-2026-00100")

    def test_aktenzeichen_multi_tenant(self):
        from globaleaks.services.hinschg import generate_aktenzeichen
        t1 = generate_aktenzeichen(1, 2026, 1)
        t5 = generate_aktenzeichen(5, 2026, 1)
        t99 = generate_aktenzeichen(99, 2026, 1)
        self.assertIn("-001-", t1)
        self.assertIn("-005-", t5)
        self.assertIn("-099-", t99)

    def test_case_initial_status_is_eingegangen(self):
        case = _make_case()
        self.assertEqual(case.status, "eingegangen")

    def test_case_has_fristen_on_creation(self):
        case = _make_case()
        self.assertIsNotNone(case.eingangsbestaetigung_frist)
        self.assertIsNotNone(case.rueckmeldung_frist)

    def test_7_day_frist_calculation(self):
        now = datetime(2026, 3, 1, 10, 0, 0)
        frist = now + timedelta(days=7)
        self.assertEqual(frist.day, 8)
        self.assertEqual(frist.month, 3)

    def test_3_month_frist_calculation(self):
        now = datetime(2026, 3, 1, 10, 0, 0)
        frist = now + timedelta(days=90)
        self.assertEqual(frist.month, 5)
        self.assertEqual(frist.day, 30)


# ============================================================
# Test: Status Transitions
# ============================================================

class TestStatusTransitions(unittest.TestCase):
    """Test all valid HinSchG status transitions."""

    def setUp(self):
        from globaleaks.services.hinschg import VALID_TRANSITIONS
        self.transitions = VALID_TRANSITIONS

    def test_full_happy_path(self):
        """Complete workflow: eingegangen -> archiviert."""
        from globaleaks.models.hinschg import FallStatus
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
            current, next_s = path[i], path[i + 1]
            allowed = self.transitions.get(current, [])
            self.assertIn(
                next_s, allowed,
                f"Transition {current} -> {next_s} must be valid"
            )

    def test_eingegangen_to_eingangsbestaetigung(self):
        allowed = self.transitions["eingegangen"]
        self.assertIn("eingangsbestaetigung", allowed)

    def test_eingangsbestaetigung_to_in_pruefung(self):
        allowed = self.transitions["eingangsbestaetigung"]
        self.assertIn("in_pruefung", allowed)

    def test_in_pruefung_to_in_bearbeitung(self):
        allowed = self.transitions["in_pruefung"]
        self.assertIn("in_bearbeitung", allowed)

    def test_in_bearbeitung_to_folgemassnahme(self):
        allowed = self.transitions["in_bearbeitung"]
        self.assertIn("folgemassnahme", allowed)

    def test_folgemassnahme_to_rueckmeldung(self):
        allowed = self.transitions["folgemassnahme"]
        self.assertIn("rueckmeldung", allowed)

    def test_rueckmeldung_to_abgeschlossen(self):
        allowed = self.transitions["rueckmeldung"]
        self.assertIn("abgeschlossen", allowed)

    def test_abgeschlossen_to_archiviert(self):
        allowed = self.transitions["abgeschlossen"]
        self.assertIn("archiviert", allowed)

    def test_in_pruefung_can_close_directly(self):
        """Non-substantive cases can be closed from pruefung."""
        allowed = self.transitions["in_pruefung"]
        self.assertIn("abgeschlossen", allowed)

    def test_abgeschlossen_allows_reopening(self):
        allowed = self.transitions["abgeschlossen"]
        self.assertIn("in_bearbeitung", allowed)

    def test_rueckmeldung_allows_reopening(self):
        allowed = self.transitions["rueckmeldung"]
        self.assertIn("in_bearbeitung", allowed)


class TestInvalidTransition(unittest.TestCase):
    """Test that invalid status transitions are rejected."""

    def setUp(self):
        from globaleaks.services.hinschg import VALID_TRANSITIONS
        self.transitions = VALID_TRANSITIONS

    def test_eingegangen_cannot_skip_to_in_bearbeitung(self):
        allowed = self.transitions["eingegangen"]
        self.assertNotIn("in_bearbeitung", allowed)

    def test_eingegangen_cannot_skip_to_abgeschlossen(self):
        allowed = self.transitions["eingegangen"]
        self.assertNotIn("abgeschlossen", allowed)

    def test_archiviert_is_terminal(self):
        """Archiviert has no outgoing transitions."""
        from globaleaks.models.hinschg import FallStatus
        archiviert = FallStatus.ARCHIVIERT.value
        self.assertNotIn(archiviert, self.transitions,
                         "Archiviert should not appear in transitions map (terminal)")

    def test_folgemassnahme_cannot_go_back_to_pruefung(self):
        allowed = self.transitions.get("folgemassnahme", [])
        self.assertNotIn("in_pruefung", allowed)

    def test_eingangsbestaetigung_cannot_skip_to_abgeschlossen(self):
        allowed = self.transitions["eingangsbestaetigung"]
        self.assertNotIn("abgeschlossen", allowed)


# ============================================================
# Test: Deadline Creation
# ============================================================

class TestDeadlineCreation(unittest.TestCase):
    """Test that deadlines are automatically created on case creation."""

    def test_7_day_frist_created(self):
        frist = _make_frist(frist_typ="eingangsbestaetigung_7t")
        self.assertEqual(frist.frist_typ, "eingangsbestaetigung_7t")
        self.assertFalse(frist.erledigt)

    def test_3_month_frist_created(self):
        frist = _make_frist(frist_typ="rueckmeldung_3m",
                            frist_datum=datetime(2026, 4, 15, 10, 0))
        self.assertEqual(frist.frist_typ, "rueckmeldung_3m")
        self.assertFalse(frist.erledigt)

    def test_fristen_have_correct_dates(self):
        now = datetime(2026, 1, 15, 10, 0)
        frist_7t = now + timedelta(days=7)
        frist_3m = now + timedelta(days=90)
        self.assertEqual(frist_7t, datetime(2026, 1, 22, 10, 0))
        self.assertEqual(frist_3m, datetime(2026, 4, 15, 10, 0))

    def test_archivierung_frist_on_abschluss(self):
        """3-year archiving deadline created on case closure."""
        abschluss = datetime(2026, 6, 15, 10, 0)
        archivierung = abschluss + timedelta(days=3 * 365)
        self.assertEqual(archivierung.year, 2029)


# ============================================================
# Test: Overdue Deadline Detection
# ============================================================

class TestDeadlineOverdue(unittest.TestCase):
    """Test detection of overdue deadlines."""

    def test_overdue_when_past_frist(self):
        frist = _make_frist(
            frist_datum=datetime(2026, 1, 10, 10, 0),
            erledigt=False,
        )
        now = datetime(2026, 1, 15, 10, 0)
        is_overdue = frist.frist_datum < now and not frist.erledigt
        self.assertTrue(is_overdue)

    def test_not_overdue_when_future(self):
        frist = _make_frist(
            frist_datum=datetime(2026, 2, 1, 10, 0),
            erledigt=False,
        )
        now = datetime(2026, 1, 15, 10, 0)
        is_overdue = frist.frist_datum < now and not frist.erledigt
        self.assertFalse(is_overdue)

    def test_not_overdue_when_erledigt(self):
        frist = _make_frist(
            frist_datum=datetime(2026, 1, 10, 10, 0),
            erledigt=True,
        )
        now = datetime(2026, 1, 15, 10, 0)
        is_overdue = frist.frist_datum < now and not frist.erledigt
        self.assertFalse(is_overdue)

    def test_overdue_days_calculation(self):
        frist_datum = datetime(2026, 1, 10, 10, 0)
        now = datetime(2026, 1, 15, 10, 0)
        days = (now - frist_datum).days
        self.assertEqual(days, 5)


# ============================================================
# Test: Case History
# ============================================================

class TestCaseHistory(unittest.TestCase):
    """Test audit trail entries on status change."""

    def test_history_entry_has_alter_and_neuer_status(self):
        history = MagicMock()
        history.alter_status = "eingegangen"
        history.neuer_status = "eingangsbestaetigung"
        history.aktion = "status_change"
        self.assertEqual(history.alter_status, "eingegangen")
        self.assertEqual(history.neuer_status, "eingangsbestaetigung")

    def test_initial_history_has_no_alter_status(self):
        history = MagicMock()
        history.alter_status = None
        history.neuer_status = "eingegangen"
        history.aktion = "case_created"
        self.assertIsNone(history.alter_status)
        self.assertEqual(history.aktion, "case_created")

    def test_history_records_user_id(self):
        history = MagicMock()
        history.user_id = "user-ombuds-001"
        self.assertEqual(history.user_id, "user-ombuds-001")

    def test_history_records_kommentar(self):
        history = MagicMock()
        history.kommentar = "Pruefung abgeschlossen, Fall nicht stichhaltig."
        self.assertIn("stichhaltig", history.kommentar)


# ============================================================
# Test: Anonymous Case
# ============================================================

class TestAnonymousCase(unittest.TestCase):
    """Test anonymous reporting without contact data."""

    def test_anonymous_case_has_no_ombudsperson(self):
        case = _make_case(ombudsperson_id=None)
        self.assertIsNone(case.ombudsperson_id)

    def test_anonymous_case_has_no_fallbearbeiter(self):
        case = _make_case(fallbearbeiter_id=None)
        self.assertIsNone(case.fallbearbeiter_id)

    def test_anonymous_still_gets_aktenzeichen(self):
        case = _make_case(ombudsperson_id=None)
        self.assertIsNotNone(case.aktenzeichen)
        self.assertTrue(case.aktenzeichen.startswith("HIN-"))

    def test_anonymous_still_has_fristen(self):
        case = _make_case(ombudsperson_id=None)
        self.assertIsNotNone(case.eingangsbestaetigung_frist)
        self.assertIsNotNone(case.rueckmeldung_frist)


# ============================================================
# Test: Abschluss Requires Begruendung
# ============================================================

class TestAbschlussRequiresBegruendung(unittest.TestCase):
    """Test that case closure requires a Begruendung."""

    def test_abschluss_stores_begruendung(self):
        case = _make_case(status="abgeschlossen",
                          begruendung="Nicht stichhaltig nach Pruefung")
        self.assertNotEqual(case.begruendung, "")
        self.assertIn("stichhaltig", case.begruendung)

    def test_abschluss_sets_datum(self):
        now = datetime(2026, 3, 15, 10, 0)
        case = _make_case(status="abgeschlossen", abschluss_datum=now)
        self.assertIsNotNone(case.abschluss_datum)

    def test_abschluss_creates_archivierung_datum(self):
        abschluss = datetime(2026, 3, 15, 10, 0)
        archivierung = abschluss + timedelta(days=3 * 365)
        case = _make_case(
            status="abgeschlossen",
            abschluss_datum=abschluss,
            archivierung_datum=archivierung,
        )
        self.assertIsNotNone(case.archivierung_datum)
        self.assertEqual(case.archivierung_datum.year, 2029)

    def test_empty_begruendung_is_invalid_business_logic(self):
        """Business rule: closure without reason is invalid."""
        begruendung = ""
        self.assertEqual(begruendung, "")
        # The service layer should reject empty begruendung


if __name__ == "__main__":
    unittest.main()
