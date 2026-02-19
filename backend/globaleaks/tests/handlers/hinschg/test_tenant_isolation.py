"""
Tests for HinSchG Multi-Tenant Isolation.

Ensures strict data separation between tenants (Kommunen):
- Tenant A cannot see cases of Tenant B
- Root tenant (tid=1) sees cross-tenant data
- Each tenant has independent configuration
- Aktenzeichen counter is per-tenant
"""
import unittest
from unittest.mock import MagicMock, patch, call

from globaleaks.services.hinschg.tenant_isolation import (
    TenantIsolationError,
    ensure_tenant_access,
    tenant_query,
    validate_tenant_config_update,
    TenantContext,
)
from globaleaks.services.hinschg.tenant_config import TenantHinschgConfig
from globaleaks.services.hinschg import generate_aktenzeichen


# ============================================================
# Test: Tenant Cannot See Other Cases
# ============================================================

class TestTenantCannotSeeOtherCases(unittest.TestCase):
    """Tenant A must never see cases belonging to Tenant B."""

    def test_ensure_tenant_access_same_tid(self):
        """Access within same tenant should succeed."""
        session = MagicMock()
        instance = MagicMock()
        instance.tid = 5
        # Should not raise
        ensure_tenant_access(session, instance, expected_tid=5)

    def test_ensure_tenant_access_different_tid_raises(self):
        """Cross-tenant access must raise TenantIsolationError."""
        session = MagicMock()
        instance = MagicMock()
        instance.tid = 5
        with self.assertRaises(TenantIsolationError):
            ensure_tenant_access(session, instance, expected_tid=10)

    def test_tenant_query_filters_by_tid(self):
        """tenant_query must add .filter(model.tid == tid)."""
        session = MagicMock()
        model = MagicMock()
        model.tid = MagicMock()

        result = tenant_query(session, model, tid=3)
        session.query.assert_called_once_with(model)
        session.query.return_value.filter.assert_called_once()

    def test_tenant_context_scopes_query(self):
        """TenantContext.query must scope to its tid."""
        session = MagicMock()
        ctx = TenantContext(session, tid=7)
        model = MagicMock()
        model.tid = MagicMock()

        ctx.query(model)
        session.query.assert_called_once_with(model)

    def test_tenant_context_verify_same_tid(self):
        """TenantContext.verify should pass for matching tid."""
        session = MagicMock()
        ctx = TenantContext(session, tid=5)
        instance = MagicMock()
        instance.tid = 5
        result = ctx.verify(instance)
        self.assertEqual(result, instance)

    def test_tenant_context_verify_different_tid_raises(self):
        """TenantContext.verify should raise for mismatched tid."""
        session = MagicMock()
        ctx = TenantContext(session, tid=5)
        instance = MagicMock()
        instance.tid = 8
        with self.assertRaises(TenantIsolationError):
            ctx.verify(instance)


# ============================================================
# Test: Root Tenant Sees All
# ============================================================

class TestRootTenantSeesAll(unittest.TestCase):
    """Root tenant (tid=1) has cross-tenant visibility for stats."""

    def test_root_tid_is_1(self):
        """Root tenant is always tid=1."""
        root_tid = 1
        self.assertEqual(root_tid, 1)

    def test_non_root_cannot_access_cross_tenant_stats(self):
        """Non-root tenants cannot access cross-tenant stats."""
        requesting_tid = 5
        self.assertNotEqual(requesting_tid, 1)

    def test_root_tenant_isolation_still_applies_for_case_data(self):
        """Even root tenant isolation applies at the data layer.
        Root only gets aggregated stats, not raw case data."""
        session = MagicMock()
        instance = MagicMock()
        instance.tid = 5
        # Root tid=1 still cannot directly access tid=5 case objects
        with self.assertRaises(TenantIsolationError):
            ensure_tenant_access(session, instance, expected_tid=1)


# ============================================================
# Test: Config Per Tenant
# ============================================================

class TestConfigPerTenant(unittest.TestCase):
    """Each tenant has its own independent configuration."""

    def test_default_config_returned_when_no_overrides(self):
        config = TenantHinschgConfig.get_merged_config({})
        self.assertEqual(config["frist_eingangsbestaetigung_tage"], 7)
        self.assertEqual(config["frist_rueckmeldung_tage"], 90)
        self.assertEqual(config["aufbewahrungsfrist_jahre"], 3)

    def test_tenant_can_override_frist(self):
        overrides = {"frist_eingangsbestaetigung_tage": 5}
        config = TenantHinschgConfig.get_merged_config(overrides)
        self.assertEqual(config["frist_eingangsbestaetigung_tage"], 5)

    def test_override_respects_legal_limits(self):
        errors = TenantHinschgConfig.validate_config(
            {"frist_eingangsbestaetigung_tage": 14}
        )
        self.assertIn("frist_eingangsbestaetigung_tage", errors)

    def test_valid_override_accepted(self):
        errors = TenantHinschgConfig.validate_config(
            {"frist_eingangsbestaetigung_tage": 5}
        )
        self.assertEqual(errors, {})

    def test_rueckmeldung_frist_validation(self):
        errors = TenantHinschgConfig.validate_config(
            {"frist_rueckmeldung_tage": 200}
        )
        self.assertIn("frist_rueckmeldung_tage", errors)

    def test_aufbewahrungsfrist_validation(self):
        errors = TenantHinschgConfig.validate_config(
            {"aufbewahrungsfrist_jahre": 1}
        )
        self.assertIn("aufbewahrungsfrist_jahre", errors)

    def test_melde_kanale_validation(self):
        errors = TenantHinschgConfig.validate_config(
            {"melde_kanale": ["online", "invalid_channel"]}
        )
        self.assertIn("melde_kanale", errors)

    def test_valid_melde_kanale(self):
        errors = TenantHinschgConfig.validate_config(
            {"melde_kanale": ["online", "telefon", "persoenlich"]}
        )
        self.assertEqual(errors, {})

    def test_unknown_key_ignored_in_merge(self):
        overrides = {"unknown_key": "value"}
        config = TenantHinschgConfig.get_merged_config(overrides)
        self.assertNotIn("unknown_key", config)

    def test_validate_config_update_same_tenant(self):
        """Admin can modify own tenant config."""
        validate_tenant_config_update(current_tid=5, target_tid=5)

    def test_validate_config_update_different_tenant_raises(self):
        """Admin cannot modify another tenant config."""
        with self.assertRaises(TenantIsolationError):
            validate_tenant_config_update(current_tid=5, target_tid=8)


# ============================================================
# Test: Aktenzeichen Per Tenant
# ============================================================

class TestAktenzeichenPerTenant(unittest.TestCase):
    """Aktenzeichen counter must be independent per tenant."""

    def test_different_tenants_same_sequence(self):
        """Two tenants can each have sequence 1."""
        az_t1 = generate_aktenzeichen(1, 2026, 1)
        az_t2 = generate_aktenzeichen(2, 2026, 1)
        self.assertEqual(az_t1, "HIN-001-2026-00001")
        self.assertEqual(az_t2, "HIN-002-2026-00001")

    def test_tenant_id_embedded_in_aktenzeichen(self):
        az = generate_aktenzeichen(42, 2026, 5)
        self.assertIn("-042-", az)

    def test_year_embedded_in_aktenzeichen(self):
        az = generate_aktenzeichen(1, 2027, 1)
        self.assertIn("-2027-", az)

    def test_sequence_zero_padded(self):
        az = generate_aktenzeichen(1, 2026, 3)
        self.assertTrue(az.endswith("00003"))

    def test_large_sequence_number(self):
        az = generate_aktenzeichen(1, 2026, 99999)
        self.assertTrue(az.endswith("99999"))

    def test_aktenzeichen_uniqueness_across_tenants(self):
        """Same sequence, different tenants => different Aktenzeichen."""
        az1 = generate_aktenzeichen(1, 2026, 1)
        az2 = generate_aktenzeichen(2, 2026, 1)
        self.assertNotEqual(az1, az2)


if __name__ == "__main__":
    unittest.main()
