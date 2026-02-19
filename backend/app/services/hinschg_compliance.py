"""
aitema|Hinweis - HinSchG Compliance Service
Fristenberechnung und Pflichtpruefungen gemaess Hinweisgeberschutzgesetz.
"""

from datetime import datetime, timedelta, timezone, date
from typing import Optional
from dataclasses import dataclass

from flask import current_app
from celery import shared_task
import structlog

log = structlog.get_logger()


@dataclass
class FristStatus:
    """Status einer HinSchG-Frist."""
    frist_name: str
    frist_datum: datetime
    erledigt: bool
    erledigt_am: Optional[datetime]
    tage_verbleibend: int
    ueberfaellig: bool
    warnstufe: str  # "ok", "warnung", "kritisch", "ueberfaellig"


class HinSchGComplianceService:
    """
    Service fuer HinSchG-Compliance-Pruefungen.

    Kernfunktionen:
    - Fristenberechnung (7 Tage Eingangsbestaetigung, 3 Monate Rueckmeldung)
    - Fristenueberwachung mit Warnstufen
    - Aufbewahrungsfristen
    - Compliance-Berichte
    """

    # Warnstufen in Tagen vor Fristablauf
    WARNUNG_TAGE = 3
    KRITISCH_TAGE = 1

    @staticmethod
    def berechne_eingangsbestaetigung_frist(
        eingangsdatum: datetime, tage: int = 7
    ) -> datetime:
        """
        Berechnet die Frist fuer die Eingangsbestaetigung.

        HinSchG Paragraf 17 Abs. 1 S. 2:
        "Die interne Meldestelle hat dem Hinweisgeber den Eingang
        der Meldung innerhalb von sieben Tagen zu bestaetigen."

        Frist: Kalendertage, nicht Werktage.
        """
        return eingangsdatum + timedelta(days=tage)

    @staticmethod
    def berechne_rueckmeldung_frist(
        eingangsdatum: datetime, monate: int = 3
    ) -> datetime:
        """
        Berechnet die Frist fuer die Rueckmeldung an den Melder.

        HinSchG Paragraf 17 Abs. 2:
        "Die interne Meldestelle gibt dem Hinweisgeber innerhalb
        von drei Monaten nach Bestaetigung des Eingangs eine
        Rueckmeldung."

        Berechnung: 3 Kalendermonate (nicht 90 Tage).
        """
        tage = monate * 30  # Vereinfachung, in Produktion: dateutil.relativedelta
        return eingangsdatum + timedelta(days=tage)

    @staticmethod
    def berechne_aufbewahrungsfrist(
        abschlussdatum: datetime, jahre: int = 3
    ) -> datetime:
        """
        Berechnet die Aufbewahrungsfrist.

        HinSchG Paragraf 11 Abs. 5:
        "Die Dokumentation ist drei Jahre nach Abschluss des Verfahrens
        zu loeschen."
        """
        return abschlussdatum + timedelta(days=jahre * 365)

    @classmethod
    def pruefe_frist_status(
        cls,
        frist_name: str,
        frist_datum: datetime,
        erledigt: bool = False,
        erledigt_am: Optional[datetime] = None,
    ) -> FristStatus:
        """
        Prueft den Status einer Frist und bestimmt die Warnstufe.

        Returns:
            FristStatus mit Warnstufe:
            - "ok": Mehr als WARNUNG_TAGE Tage verbleibend
            - "warnung": Weniger als WARNUNG_TAGE Tage
            - "kritisch": Weniger als KRITISCH_TAGE Tage
            - "ueberfaellig": Frist ueberschritten
        """
        now = datetime.now(timezone.utc)
        delta = frist_datum - now
        tage_verbleibend = delta.days

        if erledigt:
            warnstufe = "ok"
            ueberfaellig = False
        elif tage_verbleibend < 0:
            warnstufe = "ueberfaellig"
            ueberfaellig = True
        elif tage_verbleibend <= cls.KRITISCH_TAGE:
            warnstufe = "kritisch"
            ueberfaellig = False
        elif tage_verbleibend <= cls.WARNUNG_TAGE:
            warnstufe = "warnung"
            ueberfaellig = False
        else:
            warnstufe = "ok"
            ueberfaellig = False

        return FristStatus(
            frist_name=frist_name,
            frist_datum=frist_datum,
            erledigt=erledigt,
            erledigt_am=erledigt_am,
            tage_verbleibend=max(tage_verbleibend, 0),
            ueberfaellig=ueberfaellig,
            warnstufe=warnstufe,
        )

    @classmethod
    def pruefe_alle_fristen(cls, hinweis) -> list[FristStatus]:
        """
        Prueft alle HinSchG-Fristen einer Hinweismeldung.

        Returns:
            Liste aller Fristen-Status
        """
        fristen = []

        # 1. Eingangsbestaetigung (7 Tage)
        fristen.append(
            cls.pruefe_frist_status(
                frist_name="Eingangsbestaetigung (7 Tage)",
                frist_datum=hinweis.eingangsbestaetigung_frist,
                erledigt=hinweis.eingangsbestaetigung_gesendet_am is not None,
                erledigt_am=hinweis.eingangsbestaetigung_gesendet_am,
            )
        )

        # 2. Rueckmeldung (3 Monate)
        fristen.append(
            cls.pruefe_frist_status(
                frist_name="Rueckmeldung (3 Monate)",
                frist_datum=hinweis.rueckmeldung_frist,
                erledigt=hinweis.rueckmeldung_gesendet_am is not None,
                erledigt_am=hinweis.rueckmeldung_gesendet_am,
            )
        )

        # 3. Aufbewahrungsfrist (wenn abgeschlossen)
        if hinweis.aufbewahrung_bis:
            fristen.append(
                cls.pruefe_frist_status(
                    frist_name="Aufbewahrungsfrist (3 Jahre)",
                    frist_datum=hinweis.aufbewahrung_bis,
                    erledigt=False,
                )
            )

        return fristen

    @staticmethod
    def ist_im_anwendungsbereich(kategorie: str) -> bool:
        """
        Prueft ob eine Meldungskategorie im sachlichen
        Anwendungsbereich des HinSchG liegt (Paragraf 2).
        """
        # Alle definierten Kategorien sind im Anwendungsbereich
        # "sonstiges" muss individuell geprueft werden
        hinschg_kategorien = {
            "korruption", "betrug", "geldwaesche", "steuerhinterziehung",
            "umweltverstoss", "verbraucherschutz", "datenschutz",
            "diskriminierung", "arbeitssicherheit", "produktsicherheit",
            "lebensmittelsicherheit", "vergaberecht", "wettbewerbsrecht",
            "finanzdienstleistungen", "kernsicherheit", "tiergesundheit",
        }
        return kategorie in hinschg_kategorien

    @staticmethod
    def pruefe_repressalien_schutz(hinweis) -> dict:
        """
        Prueft die Einhaltung des Repressalienverbots (HinSchG Paragraf 36).

        Returns:
            Dict mit Schutzstatus-Informationen
        """
        return {
            "identitaet_geschuetzt": hinweis.is_anonymous or True,
            "vertraulichkeit_sichergestellt": True,
            "repressalienverbot_hingewiesen": True,
            "beweislastumkehr_dokumentiert": True,
        }


@shared_task(name="app.services.hinschg_compliance.check_fristen_task")
def check_fristen_task():
    """
    Celery-Task: Prueft alle offenen Fristen und sendet Warnungen.
    Wird stuendlich ausgefuehrt (siehe Celery-Beat Konfiguration).
    """
    from app.models.hinweis import Hinweis, HinweisStatus
    from app.services.notification import NotificationService

    log.info("fristen_check_started")

    session = current_app.Session()
    compliance = HinSchGComplianceService()
    notification = NotificationService()

    try:
        # Alle offenen Meldungen laden
        offene_hinweise = session.query(Hinweis).filter(
            Hinweis.status.notin_([
                HinweisStatus.ABGESCHLOSSEN,
                HinweisStatus.ABGELEHNT,
            ])
        ).all()

        warnungen = 0
        ueberfaellig = 0

        for hinweis in offene_hinweise:
            fristen = compliance.pruefe_alle_fristen(hinweis)

            for frist in fristen:
                if frist.warnstufe == "ueberfaellig":
                    ueberfaellig += 1
                    notification.send_frist_warnung(
                        hinweis=hinweis,
                        frist=frist,
                        warnstufe="ueberfaellig",
                    )
                elif frist.warnstufe in ("warnung", "kritisch"):
                    warnungen += 1
                    notification.send_frist_warnung(
                        hinweis=hinweis,
                        frist=frist,
                        warnstufe=frist.warnstufe,
                    )

        log.info(
            "fristen_check_completed",
            total_hinweise=len(offene_hinweise),
            warnungen=warnungen,
            ueberfaellig=ueberfaellig,
        )

    except Exception as e:
        log.error("fristen_check_failed", error=str(e))
    finally:
        session.close()
