"""
aitema|Hinweis - Analytics API
Aggregierte Compliance-Daten fuer das Dashboard.
Keine personenbezogenen Daten - nur anonymisierte Statistiken.
HinSchG-konform: Schwellenwert min. 3 Meldungen pro Kategorie.
"""

from flask import Blueprint, jsonify, current_app
from sqlalchemy import func, extract, text
from datetime import datetime, timedelta

from app.models.hinweis import Hinweis, HinweisStatus, HinweisKategorie
from app.models.case import Case, CaseStatus

analytics_bp = Blueprint("analytics", __name__)


def get_session():
    """Gibt die aktuelle Datenbanksession zurueck."""
    return current_app.Session()


@analytics_bp.route("/dashboard", methods=["GET"])
def get_dashboard_analytics():
    """
    Aggregierte Compliance-Daten fuer das Dashboard.
    Vollstaendig anonymisiert - keine personenbezogenen Daten.
    Schwellenwert: min. 3 Meldungen pro Kategorie (Anonymisierungsschutz).
    """
    session = get_session()

    try:
        now = datetime.utcnow()
        twelve_months_ago = now - timedelta(days=365)

        # === Meldungsvolumen letzte 12 Monate ===
        monthly_rows = session.query(
            extract("year", Hinweis.eingegangen_am).label("year"),
            extract("month", Hinweis.eingegangen_am).label("month"),
            func.count(Hinweis.id).label("count"),
        ).filter(
            Hinweis.eingegangen_am >= twelve_months_ago
        ).group_by(
            extract("year", Hinweis.eingegangen_am),
            extract("month", Hinweis.eingegangen_am),
        ).order_by(
            extract("year", Hinweis.eingegangen_am),
            extract("month", Hinweis.eingegangen_am),
        ).all()

        monthly_volume = [
            {"year": int(r.year), "month": int(r.month), "count": r.count}
            for r in monthly_rows
        ]

        # === Kategorie-Verteilung (Schwellenwert: min. 3 Meldungen) ===
        kategorie_rows = session.query(
            Hinweis.kategorie,
            func.count(Hinweis.id).label("count"),
        ).group_by(
            Hinweis.kategorie
        ).having(
            func.count(Hinweis.id) >= 3
        ).order_by(
            func.count(Hinweis.id).desc()
        ).all()

        # Lesbare Kategorienamen (DE)
        kategorie_labels = {
            "korruption": "Korruption",
            "betrug": "Betrug",
            "geldwaesche": "Geldwaesche",
            "steuerhinterziehung": "Steuerhinterziehung",
            "umweltverstoss": "Umweltverstoss",
            "verbraucherschutz": "Verbraucherschutz",
            "datenschutz": "Datenschutz",
            "diskriminierung": "Diskriminierung",
            "arbeitssicherheit": "Arbeitssicherheit",
            "produktsicherheit": "Produktsicherheit",
            "lebensmittelsicherheit": "Lebensmittelsicherheit",
            "vergaberecht": "Vergaberecht",
            "wettbewerbsrecht": "Wettbewerbsrecht",
            "finanzdienstleistungen": "Finanzdienstleistungen",
            "kernsicherheit": "Kernsicherheit",
            "tiergesundheit": "Tiergesundheit",
            "sonstiges": "Sonstiges",
        }

        categories = [
            {
                "name": kategorie_labels.get(
                    r.kategorie.value if hasattr(r.kategorie, "value") else r.kategorie,
                    r.kategorie.value if hasattr(r.kategorie, "value") else r.kategorie,
                ),
                "count": r.count,
            }
            for r in kategorie_rows
        ]

        # === HinweisStatus-Verteilung ===
        status_rows = session.query(
            Hinweis.status,
            func.count(Hinweis.id).label("count"),
        ).group_by(Hinweis.status).all()

        status_labels = {
            "eingegangen": "Eingegangen",
            "eingangsbestaetigung": "Best. versendet",
            "in_pruefung": "In Pruefung",
            "in_bearbeitung": "In Bearbeitung",
            "rueckmeldung": "Rueckmeldung",
            "abgeschlossen": "Abgeschlossen",
            "abgelehnt": "Abgelehnt",
            "weitergeleitet": "Weitergeleitet",
        }

        statuses = [
            {
                "status": status_labels.get(
                    r.status.value if hasattr(r.status, "value") else r.status,
                    r.status.value if hasattr(r.status, "value") else r.status,
                ),
                "count": r.count,
            }
            for r in status_rows
        ]

        # === HinSchG-Fristeneinhaltung ===
        # Zaehlt Meldungen, bei denen die Fristen eingehalten wurden
        total_hinweise = session.query(func.count(Hinweis.id)).scalar() or 0

        # Fristgerecht: Eingangsbestaetigung gesendet ODER noch innerhalb der Frist
        fristgerecht = session.query(func.count(Hinweis.id)).filter(
            (Hinweis.eingangsbestaetigung_gesendet_am.isnot(None)) |
            (Hinweis.eingangsbestaetigung_frist > now)
        ).scalar() or 0

        compliance_rate = round((fristgerecht / total_hinweise) * 100, 1) if total_hinweise > 0 else 100.0

        # === Ueberfaellige Fristen (fuer KPI) ===
        ueberfaellige_eingangsbestaetigung = session.query(func.count(Hinweis.id)).filter(
            Hinweis.eingangsbestaetigung_gesendet_am.is_(None),
            Hinweis.eingangsbestaetigung_frist < now,
        ).scalar() or 0

        ueberfaellige_rueckmeldung = session.query(func.count(Hinweis.id)).filter(
            Hinweis.rueckmeldung_gesendet_am.is_(None),
            Hinweis.rueckmeldung_frist < now,
            ~Hinweis.status.in_([HinweisStatus.ABGESCHLOSSEN, HinweisStatus.ABGELEHNT]),
        ).scalar() or 0

        return jsonify(
            {
                "monthly_volume": monthly_volume,
                "categories": categories,
                "statuses": statuses,
                "compliance_rate": compliance_rate,
                "total_cases": total_hinweise,
                "ueberfaellige_fristen": {
                    "eingangsbestaetigung": ueberfaellige_eingangsbestaetigung,
                    "rueckmeldung": ueberfaellige_rueckmeldung,
                },
                "generated_at": now.isoformat() + "Z",
            }
        )

    except Exception as exc:
        current_app.logger.error(f"Analytics-Fehler: {exc}")
        # Bei Datenbankfehler: leere Struktur zurueckgeben (kein 500er)
        return jsonify(
            {
                "monthly_volume": [],
                "categories": [],
                "statuses": [],
                "compliance_rate": 0.0,
                "total_cases": 0,
                "ueberfaellige_fristen": {
                    "eingangsbestaetigung": 0,
                    "rueckmeldung": 0,
                },
                "generated_at": datetime.utcnow().isoformat() + "Z",
                "error": "Daten konnten nicht geladen werden",
            }
        ), 200  # 200 damit Frontend nicht abstuerzt
    finally:
        session.close()
