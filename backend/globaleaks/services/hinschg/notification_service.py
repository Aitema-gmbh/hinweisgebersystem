"""
HinSchG Notification Service for aitema|Hinweis

Bridges HinSchG email templates with the GlobaLeaks notification system.
Handles sending of all HinSchG-related notifications:
- Eingangsbestaetigung (§8 Abs. 1 S. 1)
- Rueckmeldung (§8 Abs. 1 S. 3)
- Fristen-Erinnerungen
- Eskalationen bei Fristversaeumnis
- Fallabschluss

All notifications are logged for compliance documentation.
"""
from datetime import datetime
from typing import Optional, Dict, Any

from globaleaks.orm import transact, tw
from globaleaks.transactions import db_schedule_email
from globaleaks.utils.log import log
from globaleaks.utils.utility import datetime_now

from globaleaks.services.hinschg.email_templates import HinschgEmailTemplates


class HinschgNotificationService:
    """
    Service for sending HinSchG-compliant notifications.

    Uses GlobaLeaks' db_schedule_email to queue emails for delivery.
    All sent notifications are logged for audit purposes.
    """

    @staticmethod
    def _get_tenant_info(case) -> Dict[str, str]:
        """
        Extract tenant display information from a case object.

        :param case: HinweisCase model instance
        :return: Dict with tenant_name, kontakt_email, kontakt_telefon
        """
        return {
            'tenant_name': getattr(case, '_tenant_name', ''),
            'kontakt_email': getattr(case, '_kontakt_email', ''),
            'kontakt_telefon': getattr(case, '_kontakt_telefon', ''),
        }

    @staticmethod
    def _format_datum(dt) -> str:
        """
        Format a datetime object to German date string.

        :param dt: datetime object
        :return: Formatted date string (DD.MM.YYYY)
        """
        if isinstance(dt, datetime):
            return dt.strftime('%d.%m.%Y')
        return str(dt)

    @staticmethod
    def _get_frist_typ_label(frist_typ: str) -> str:
        """
        Get human-readable label for a deadline type.

        :param frist_typ: Internal deadline type identifier
        :return: German label for the deadline type
        """
        labels = {
            'eingangsbestaetigung_7t': 'Eingangsbestaetigung (7 Tage)',
            'rueckmeldung_3m': 'Rueckmeldung (3 Monate)',
        }
        return labels.get(frist_typ, frist_typ)

    # ================================================================
    # Eingangsbestaetigung
    # ================================================================

    @staticmethod
    @transact
    def send_eingangsbestaetigung(session, case, recipient_address: str,
                                   zugangs_code: str = "") -> bool:
        """
        Send Eingangsbestaetigung email for a new report.

        §8 Abs. 1 S. 1 HinSchG: Must be sent within 7 days.

        :param session: Database session (injected by @transact)
        :param case: HinweisCase model instance
        :param recipient_address: Email address of the whistleblower
        :param zugangs_code: Access code for the whistleblower
        :return: True if email was scheduled successfully
        """
        try:
            tenant_info = HinschgNotificationService._get_tenant_info(case)
            datum = HinschgNotificationService._format_datum(case.eingangsdatum)

            subject = HinschgEmailTemplates.subject_eingangsbestaetigung(
                case.aktenzeichen
            )
            body = HinschgEmailTemplates.eingangsbestaetigung(
                aktenzeichen=case.aktenzeichen,
                datum=datum,
                zugangs_code=zugangs_code,
                tenant_name=tenant_info['tenant_name'],
                kontakt_email=tenant_info['kontakt_email'],
                kontakt_telefon=tenant_info['kontakt_telefon'],
            )

            db_schedule_email(session, case.tid, recipient_address, subject, body)

            log.info(
                "HinSchG Notification: Eingangsbestaetigung gesendet fuer %s an %s",
                case.aktenzeichen, recipient_address, tid=case.tid
            )
            return True

        except Exception as e:
            log.err(
                "HinSchG Notification: Fehler beim Senden der Eingangsbestaetigung "
                "fuer %s: %s", case.aktenzeichen, str(e), tid=case.tid
            )
            return False

    # ================================================================
    # Rueckmeldung
    # ================================================================

    @staticmethod
    @transact
    def send_rueckmeldung(session, case, recipient_address: str,
                           status_text: str = "",
                           massnahmen_text: str = "") -> bool:
        """
        Send Rueckmeldung email with case status update.

        §8 Abs. 1 S. 3 HinSchG: Must be sent within 3 months.

        :param session: Database session (injected by @transact)
        :param case: HinweisCase model instance
        :param recipient_address: Email address of the whistleblower
        :param status_text: Human-readable status description
        :param massnahmen_text: Description of measures taken
        :return: True if email was scheduled successfully
        """
        try:
            tenant_info = HinschgNotificationService._get_tenant_info(case)

            if not status_text:
                status_text = case.status or 'In Bearbeitung'
            if not massnahmen_text:
                massnahmen_text = (
                    case.folgemassnahme_beschreibung
                    or 'Keine spezifischen Massnahmen dokumentiert.'
                )

            subject = HinschgEmailTemplates.subject_rueckmeldung(
                case.aktenzeichen
            )
            body = HinschgEmailTemplates.rueckmeldung(
                aktenzeichen=case.aktenzeichen,
                status=status_text,
                massnahmen=massnahmen_text,
                tenant_name=tenant_info['tenant_name'],
                kontakt_email=tenant_info['kontakt_email'],
                kontakt_telefon=tenant_info['kontakt_telefon'],
            )

            db_schedule_email(session, case.tid, recipient_address, subject, body)

            log.info(
                "HinSchG Notification: Rueckmeldung gesendet fuer %s an %s",
                case.aktenzeichen, recipient_address, tid=case.tid
            )
            return True

        except Exception as e:
            log.err(
                "HinSchG Notification: Fehler beim Senden der Rueckmeldung "
                "fuer %s: %s", case.aktenzeichen, str(e), tid=case.tid
            )
            return False

    # ================================================================
    # Frist-Erinnerung
    # ================================================================

    @staticmethod
    @transact
    def send_frist_erinnerung(session, frist, case,
                               recipient_address: str) -> bool:
        """
        Send deadline reminder to case handler/Ombudsperson.

        Internal notification sent before a deadline expires.

        :param session: Database session (injected by @transact)
        :param frist: HinweisFrist model instance
        :param case: HinweisCase model instance
        :param recipient_address: Email of the case handler/Ombudsperson
        :return: True if email was scheduled successfully
        """
        try:
            tenant_info = HinschgNotificationService._get_tenant_info(case)
            frist_datum = HinschgNotificationService._format_datum(frist.frist_datum)
            frist_typ_label = HinschgNotificationService._get_frist_typ_label(
                frist.frist_typ
            )
            now = datetime_now()
            tage_verbleibend = max(0, (frist.frist_datum - now).days)

            subject = HinschgEmailTemplates.subject_frist_erinnerung(
                case.aktenzeichen, frist_typ_label
            )
            body = HinschgEmailTemplates.frist_erinnerung(
                aktenzeichen=case.aktenzeichen,
                frist_typ=frist_typ_label,
                frist_datum=frist_datum,
                tage_verbleibend=tage_verbleibend,
                tenant_name=tenant_info['tenant_name'],
            )

            db_schedule_email(session, case.tid, recipient_address, subject, body)

            log.info(
                "HinSchG Notification: Frist-Erinnerung gesendet fuer %s "
                "(Frist: %s, %d Tage verbleibend) an %s",
                case.aktenzeichen, frist_typ_label, tage_verbleibend,
                recipient_address, tid=case.tid
            )
            return True

        except Exception as e:
            log.err(
                "HinSchG Notification: Fehler beim Senden der Frist-Erinnerung "
                "fuer %s: %s", case.aktenzeichen, str(e), tid=case.tid
            )
            return False

    # ================================================================
    # Eskalation
    # ================================================================

    @staticmethod
    @transact
    def send_eskalation(session, frist, case,
                         recipient_address: str) -> bool:
        """
        Send deadline violation escalation to responsible parties.

        Critical notification when a legally mandated deadline has been missed.

        :param session: Database session (injected by @transact)
        :param frist: HinweisFrist model instance
        :param case: HinweisCase model instance
        :param recipient_address: Email of the escalation recipient
        :return: True if email was scheduled successfully
        """
        try:
            tenant_info = HinschgNotificationService._get_tenant_info(case)
            frist_typ_label = HinschgNotificationService._get_frist_typ_label(
                frist.frist_typ
            )
            now = datetime_now()
            tage_ueberfaellig = max(1, (now - frist.frist_datum).days)

            subject = HinschgEmailTemplates.subject_frist_eskalation(
                case.aktenzeichen, frist_typ_label
            )
            body = HinschgEmailTemplates.frist_eskalation(
                aktenzeichen=case.aktenzeichen,
                frist_typ=frist_typ_label,
                tage_ueberfaellig=tage_ueberfaellig,
                tenant_name=tenant_info['tenant_name'],
            )

            db_schedule_email(session, case.tid, recipient_address, subject, body)

            log.err(
                "HinSchG ESKALATION: Fristversaeumnis fuer %s "
                "(Frist: %s, %d Tage ueberfaellig) - Eskalation an %s",
                case.aktenzeichen, frist_typ_label, tage_ueberfaellig,
                recipient_address, tid=case.tid
            )
            return True

        except Exception as e:
            log.err(
                "HinSchG Notification: Fehler beim Senden der Eskalation "
                "fuer %s: %s", case.aktenzeichen, str(e), tid=case.tid
            )
            return False

    # ================================================================
    # Fallabschluss
    # ================================================================

    @staticmethod
    @transact
    def send_abschluss(session, case, recipient_address: str,
                        begruendung: str = "") -> bool:
        """
        Send case closure notification to the whistleblower.

        :param session: Database session (injected by @transact)
        :param case: HinweisCase model instance
        :param recipient_address: Email address of the whistleblower
        :param begruendung: Reason for case closure
        :return: True if email was scheduled successfully
        """
        try:
            tenant_info = HinschgNotificationService._get_tenant_info(case)

            if not begruendung:
                begruendung = (
                    case.begruendung
                    or 'Das Verfahren wurde ordnungsgemaess abgeschlossen.'
                )

            subject = HinschgEmailTemplates.subject_fallabschluss(
                case.aktenzeichen
            )
            body = HinschgEmailTemplates.fallabschluss(
                aktenzeichen=case.aktenzeichen,
                begruendung=begruendung,
                tenant_name=tenant_info['tenant_name'],
                kontakt_email=tenant_info['kontakt_email'],
                kontakt_telefon=tenant_info['kontakt_telefon'],
            )

            db_schedule_email(session, case.tid, recipient_address, subject, body)

            log.info(
                "HinSchG Notification: Fallabschluss gesendet fuer %s an %s",
                case.aktenzeichen, recipient_address, tid=case.tid
            )
            return True

        except Exception as e:
            log.err(
                "HinSchG Notification: Fehler beim Senden des Fallabschlusses "
                "fuer %s: %s", case.aktenzeichen, str(e), tid=case.tid
            )
            return False
