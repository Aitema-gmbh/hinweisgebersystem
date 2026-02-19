"""
aitema|Hinweis - Multi-Tenant Tests
Tests fuer die Mandantenisolierung.
"""

import pytest
import uuid
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.models.hinweis import Hinweis, HinweisKategorie, HinweisPrioritaet, HinweisStatus
from datetime import datetime, timezone, timedelta


class TestTenantIsolation:
    """Tests fuer die Datenisolierung zwischen Mandanten."""

    def test_tenant_creation(self, db_session):
        """Mandant kann erstellt werden."""
        tenant = Tenant(
            slug="iso-test",
            name="Isolationstest GmbH",
            organization_type="unternehmen",
            organization_size="medium",
        )
        db_session.add(tenant)
        db_session.flush()
        assert tenant.id is not None
        assert tenant.slug == "iso-test"

    def test_tenant_slug_unique(self, db_session, sample_tenant):
        """Tenant-Slugs muessen eindeutig sein."""
        duplicate = Tenant(slug=sample_tenant.slug, name="Duplikat")
        db_session.add(duplicate)
        with pytest.raises(Exception):
            db_session.flush()

    def test_user_belongs_to_tenant(self, db_session, sample_tenant):
        """Benutzer gehoert einem Mandanten."""
        from argon2 import PasswordHasher
        ph = PasswordHasher()
        user = User(
            tenant_id=sample_tenant.id,
            email="tenant-user@test.de",
            password_hash=ph.hash("test"),
            first_name="Tenant",
            last_name="User",
            role=UserRole.FALLBEARBEITER,
        )
        db_session.add(user)
        db_session.flush()
        assert user.tenant_id == sample_tenant.id

    def test_email_unique_per_tenant(self, db_session, sample_admin):
        """E-Mail muss pro Tenant eindeutig sein."""
        from argon2 import PasswordHasher
        ph = PasswordHasher()
        duplicate = User(
            tenant_id=sample_admin.tenant_id,
            email=sample_admin.email,
            password_hash=ph.hash("test"),
            first_name="Dup",
            last_name="User",
            role=UserRole.FALLBEARBEITER,
        )
        db_session.add(duplicate)
        with pytest.raises(Exception):
            db_session.flush()

    def test_hinweis_belongs_to_tenant(self, db_session, sample_hinweis, sample_tenant):
        """Hinweis gehoert einem Mandanten."""
        assert sample_hinweis.tenant_id == sample_tenant.id

    def test_hinschg_pflichtig_large(self, db_session):
        """Grosses Unternehmen (>250 MA) ist HinSchG-pflichtig."""
        tenant = Tenant(
            slug="gross-firma",
            name="Grosse Firma AG",
            organization_size="large",
        )
        assert tenant.is_hinschg_pflichtig is True

    def test_hinschg_pflichtig_medium(self, db_session):
        """Mittleres Unternehmen (50-249 MA) ist HinSchG-pflichtig."""
        tenant = Tenant(
            slug="mittel-firma",
            name="Mittlere Firma GmbH",
            organization_size="medium",
        )
        assert tenant.is_hinschg_pflichtig is True

    def test_hinschg_nicht_pflichtig_small(self, db_session):
        """Kleines Unternehmen (<50 MA) ist nicht HinSchG-pflichtig."""
        tenant = Tenant(
            slug="klein-firma",
            name="Kleine Firma GbR",
            organization_size="small",
        )
        assert tenant.is_hinschg_pflichtig is False


class TestCaseWorkflow:
    """Tests fuer den Fall-Workflow."""

    def test_case_status_transitions(self, sample_case):
        """Erlaubte Statusuebergaenge werden akzeptiert."""
        from app.models.case import CaseStatus

        assert sample_case.can_transition_to(CaseStatus.ZUGEWIESEN) is True
        assert sample_case.can_transition_to(CaseStatus.EINGESTELLT) is True
        assert sample_case.can_transition_to(CaseStatus.ABGESCHLOSSEN) is False

    def test_case_invalid_transition(self, sample_case):
        """Ungueltige Statusuebergaenge werden abgelehnt."""
        from app.models.case import CaseStatus

        assert sample_case.can_transition_to(CaseStatus.MASSNAHMEN) is False
        assert sample_case.can_transition_to(CaseStatus.UMSETZUNG) is False


class TestUserPermissions:
    """Tests fuer das Berechtigungssystem."""

    def test_admin_permissions(self, sample_admin):
        """Admin hat Verwaltungsrechte."""
        assert sample_admin.has_permission("manage_tenants") is True
        assert sample_admin.has_permission("manage_users") is True
        assert sample_admin.has_permission("view_all_cases") is True

    def test_ombudsperson_permissions(self, sample_ombudsperson):
        """Ombudsperson hat Fallverwaltungsrechte."""
        assert sample_ombudsperson.has_permission("view_submissions") is True
        assert sample_ombudsperson.has_permission("manage_cases") is True
        assert sample_ombudsperson.has_permission("manage_tenants") is False

    def test_melder_limited_permissions(self, db_session, sample_tenant):
        """Melder hat eingeschraenkte Rechte."""
        from argon2 import PasswordHasher
        ph = PasswordHasher()
        melder = User(
            tenant_id=sample_tenant.id,
            email="melder@test.de",
            password_hash=ph.hash("test"),
            first_name="Melder",
            last_name="User",
            role=UserRole.MELDER,
        )
        assert melder.has_permission("create_submission") is True
        assert melder.has_permission("view_own_submissions") is True
        assert melder.has_permission("manage_cases") is False
        assert melder.has_permission("manage_tenants") is False
