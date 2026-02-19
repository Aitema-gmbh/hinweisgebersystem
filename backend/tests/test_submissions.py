"""
aitema|Hinweis - Submission Tests
Tests fuer die Meldungs-API.
"""

import pytest
from app.models.hinweis import HinweisStatus


class TestSubmissionCreation:
    """Tests fuer das Einreichen von Meldungen."""

    def test_create_anonymous_submission(self, client):
        """Anonyme Meldung kann ohne Login eingereicht werden."""
        response = client.post("/api/v1/submissions/", json={
            "titel": "Verdacht auf Bestechung in der Einkaufsabteilung",
            "beschreibung": (
                "Ich habe beobachtet, dass der Leiter der Einkaufsabteilung "
                "regelmaessig Geschenke von Lieferanten annimmt und diese "
                "Lieferanten bevorzugt bei Vergaben behandelt."
            ),
            "kategorie": "korruption",
            "is_anonymous": True,
        })
        assert response.status_code == 201
        data = response.get_json()
        assert "reference_code" in data
        assert "access_code" in data
        assert data["reference_code"].startswith("HW-")

    def test_create_submission_with_contact(self, client):
        """Meldung mit Kontaktdaten einreichen."""
        response = client.post("/api/v1/submissions/", json={
            "titel": "Umweltverstoss bei der Abfallentsorgung festgestellt",
            "beschreibung": (
                "Bei der Entsorgung von Chemikalien werden die vorgeschriebenen "
                "Sicherheitsmassnahmen nicht eingehalten. Giftige Abfaelle werden "
                "unsachgemaess in normalen Containern entsorgt."
            ),
            "kategorie": "umweltverstoss",
            "is_anonymous": False,
            "melder_name": "Max Mustermann",
            "melder_email": "max@example.de",
            "preferred_channel": "email",
        })
        assert response.status_code == 201

    def test_create_submission_title_too_short(self, client):
        """Zu kurzer Titel wird abgelehnt."""
        response = client.post("/api/v1/submissions/", json={
            "titel": "Kurz",
            "beschreibung": "A" * 60,
            "kategorie": "sonstiges",
        })
        assert response.status_code == 400
        assert "10 Zeichen" in response.get_json()["error"]

    def test_create_submission_description_too_short(self, client):
        """Zu kurze Beschreibung wird abgelehnt."""
        response = client.post("/api/v1/submissions/", json={
            "titel": "Ein ausreichend langer Titel",
            "beschreibung": "Zu kurz",
            "kategorie": "sonstiges",
        })
        assert response.status_code == 400
        assert "50 Zeichen" in response.get_json()["error"]

    def test_create_submission_invalid_category(self, client):
        """Ungueltige Kategorie wird abgelehnt."""
        response = client.post("/api/v1/submissions/", json={
            "titel": "Ein ausreichend langer Titel",
            "beschreibung": "A" * 60,
            "kategorie": "nicht_existierend",
        })
        assert response.status_code == 400
        assert "valid_categories" in response.get_json()


class TestStatusCheck:
    """Tests fuer die Status-Abfrage."""

    def test_check_status_with_valid_code(self, client):
        """Status mit gueltigem Zugangscode abfragen."""
        # Erst eine Meldung erstellen
        create_resp = client.post("/api/v1/submissions/", json={
            "titel": "Verdacht auf Datenschutzverstoesse in der IT",
            "beschreibung": (
                "Die IT-Abteilung speichert personenbezogene Daten ohne "
                "Einwilligung und gibt diese an Dritte weiter."
            ),
            "kategorie": "datenschutz",
            "is_anonymous": True,
        })
        assert create_resp.status_code == 201
        access_code = create_resp.get_json()["access_code"]

        # Status abfragen
        status_resp = client.get(f"/api/v1/submissions/status/{access_code}")
        assert status_resp.status_code == 200
        data = status_resp.get_json()
        assert data["status"] == "eingegangen"
        assert "reference_code" in data

    def test_check_status_invalid_code(self, client):
        """Ungueltiger Zugangscode gibt 400 zurueck."""
        response = client.get("/api/v1/submissions/status/invalid")
        assert response.status_code == 400

    def test_check_status_not_found(self, client):
        """Nicht existierender Zugangscode gibt 404 zurueck."""
        response = client.get(
            "/api/v1/submissions/status/aaaaaabbbbbbccccccddddddeeeeee"
        )
        assert response.status_code == 404


class TestSubmissionListing:
    """Tests fuer die Auflistung von Meldungen (authentifiziert)."""

    def test_list_submissions_requires_auth(self, client):
        """Auflistung erfordert Authentifizierung."""
        response = client.get("/api/v1/submissions/")
        assert response.status_code == 401

    def test_list_submissions_as_admin(self, client, auth_headers):
        """Admin kann alle Meldungen sehen."""
        response = client.get("/api/v1/submissions/", headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert "items" in data
        assert "pagination" in data
