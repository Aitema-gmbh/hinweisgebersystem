"""
aitema|Hinweis - Test Fixtures
Gemeinsame Test-Konfiguration und Fixtures.
"""

import uuid
import pytest
from datetime import datetime, timezone, timedelta

from app import create_app
from app.models import Base
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.models.hinweis import Hinweis, HinweisStatus, HinweisKategorie, HinweisPrioritaet
from app.models.case import Case, CaseStatus
from argon2 import PasswordHasher

ph = PasswordHasher()


@pytest.fixture(scope="session")
def app():
    """Erstellt die Flask-App mit Test-Konfiguration."""
    test_config = {
        "TESTING": True,
        "DATABASE_URL": "postgresql+psycopg2://hinweis:changeme_dev@localhost:5432/hinweis_test",
        "REDIS_URL": "redis://localhost:6379/15",
        "CELERY_BROKER_URL": "redis://localhost:6379/14",
        "SECRET_KEY": "test-secret-key",
        "JWT_SECRET_KEY": "test-jwt-secret",
        "ENCRYPTION_MASTER_KEY": "test-encryption-master-key-32chars!",
        "RATE_LIMIT_ENABLED": False,
        "HINSCHG_EINGANGSBESTAETIGUNG_TAGE": 7,
        "HINSCHG_RUECKMELDUNG_TAGE": 90,
        "HINSCHG_AUFBEWAHRUNG_JAHRE": 3,
    }
    app = create_app(config_override=test_config)
    yield app


@pytest.fixture(scope="session")
def _db(app):
    """Erstellt die Datenbank-Tabellen."""
    with app.app_context():
        Base.metadata.create_all(app.engine)
    yield
    with app.app_context():
        Base.metadata.drop_all(app.engine)


@pytest.fixture
def client(app, _db):
    """Flask Test-Client."""
    with app.test_client() as client:
        with app.app_context():
            yield client


@pytest.fixture
def db_session(app, _db):
    """Datenbank-Session mit Rollback nach jedem Test."""
    with app.app_context():
        session = app.Session()
        yield session
        session.rollback()
        session.close()


@pytest.fixture
def sample_tenant(db_session) -> Tenant:
    """Erstellt einen Test-Mandanten."""
    tenant = Tenant(
        slug="test-firma",
        name="Test Firma GmbH",
        organization_type="unternehmen",
        organization_size="large",
        contact_email="test@firma.de",
        ombudsperson_name="Dr. Test Ombuds",
        ombudsperson_email="ombuds@firma.de",
    )
    db_session.add(tenant)
    db_session.flush()
    return tenant


@pytest.fixture
def sample_admin(db_session, sample_tenant) -> User:
    """Erstellt einen Test-Admin."""
    user = User(
        tenant_id=sample_tenant.id,
        email="admin@test.de",
        password_hash=ph.hash("TestPasswort123!"),
        first_name="Admin",
        last_name="User",
        role=UserRole.ADMIN,
        is_active=True,
        is_verified=True,
    )
    db_session.add(user)
    db_session.flush()
    return user


@pytest.fixture
def sample_ombudsperson(db_session, sample_tenant) -> User:
    """Erstellt eine Test-Ombudsperson."""
    user = User(
        tenant_id=sample_tenant.id,
        email="ombuds@test.de",
        password_hash=ph.hash("TestPasswort123!"),
        first_name="Ombuds",
        last_name="Person",
        role=UserRole.OMBUDSPERSON,
        is_active=True,
        is_verified=True,
    )
    db_session.add(user)
    db_session.flush()
    return user


@pytest.fixture
def sample_hinweis(db_session, sample_tenant) -> Hinweis:
    """Erstellt eine Test-Hinweismeldung."""
    now = datetime.now(timezone.utc)
    hinweis = Hinweis(
        tenant_id=sample_tenant.id,
        reference_code=Hinweis.generate_reference_code(),
        is_anonymous=True,
        titel="Test-Hinweis: Verdacht auf Korruption",
        beschreibung_encrypted="encrypted_test_data",
        kategorie=HinweisKategorie.KORRUPTION,
        prioritaet=HinweisPrioritaet.HOCH,
        status=HinweisStatus.EINGEGANGEN,
        eingegangen_am=now,
        eingangsbestaetigung_frist=now + timedelta(days=7),
        rueckmeldung_frist=now + timedelta(days=90),
        quelle="web",
        sprache="de",
    )
    db_session.add(hinweis)
    db_session.flush()
    return hinweis


@pytest.fixture
def sample_case(db_session, sample_tenant, sample_hinweis, sample_ombudsperson) -> Case:
    """Erstellt einen Test-Fall."""
    case = Case(
        tenant_id=sample_tenant.id,
        hinweis_id=sample_hinweis.id,
        case_number=Case.generate_case_number("test"),
        titel=sample_hinweis.titel,
        created_by_id=sample_ombudsperson.id,
        status=CaseStatus.OFFEN,
    )
    db_session.add(case)
    db_session.flush()
    return case


@pytest.fixture
def auth_headers(client, sample_admin):
    """Login und Auth-Header fuer API-Tests."""
    response = client.post("/api/v1/auth/login", json={
        "email": "admin@test.de",
        "password": "TestPasswort123!",
    })
    token = response.get_json().get("access_token", "")
    return {"Authorization": f"Bearer {token}"}
