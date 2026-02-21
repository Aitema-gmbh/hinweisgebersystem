"""
aitema|Hinweis - D3: Celery-Task fuer HinSchG-Fristenalarme
Taeglich um 08:00 Uhr: E-Mail an Sachbearbeiter bei gelben/roten Fristen.

Celery-Beat Konfiguration (in config oder celeryconfig.py):
    beat_schedule = {
        'daily-deadline-alerts': {
            'task': 'app.tasks.deadline_alerts.send_deadline_alerts',
            'schedule': crontab(hour=8, minute=0),
        },
    }
"""

from datetime import datetime, timezone

from celery import shared_task
import structlog

log = structlog.get_logger()


@shared_task(
    name="app.tasks.deadline_alerts.send_deadline_alerts",
    bind=True,
    max_retries=3,
    default_retry_delay=300,  # 5 Minuten Retry-Delay
)
def send_deadline_alerts(self):
    """
    Taeglich 08:00 Uhr: Sendet Fristenalarme fuer gelbe und rote Faelle.

    Verarbeitet alle nicht-abgeschlossenen Faelle des Systems
    und sendet E-Mails an die zugewiesenen Sachbearbeiter.
    """
    from flask import current_app
    from app.models.case import Case, CaseStatus
    from app.services.deadline_service import get_urgent_cases
    from app.services.notification import NotificationService

    log.info("deadline_alerts_task_started", timestamp=datetime.now(timezone.utc).isoformat())

    session = current_app.Session()
    notification = NotificationService()

    try:
        # Alle offenen Faelle laden (nicht ABGESCHLOSSEN, nicht EINGESTELLT)
        offene_cases = session.query(Case).filter(
            Case.status.notin_([CaseStatus.ABGESCHLOSSEN, CaseStatus.EINGESTELLT]),
            Case.resolved_at.is_(None),
        ).all()

        urgent_items = get_urgent_cases(offene_cases)

        sent_count = 0
        error_count = 0

        for item in urgent_items:
            case = item["case"]
            ds = item["deadline_info"]

            # Empfaenger bestimmen: Sachbearbeiter oder erstellt-von
            recipient_email = None
            recipient_name = "Sachbearbeiter/in"
            if case.assignee:
                recipient_email = case.assignee.email
                recipient_name = case.assignee.full_name
            elif case.created_by:
                recipient_email = case.created_by.email
                recipient_name = case.created_by.full_name

            if not recipient_email:
                log.warning(
                    "deadline_alert_no_recipient",
                    case_number=case.case_number,
                )
                continue

            # Betreff und Body
            if ds.status == "red":
                subject = f"[AITEMA HINWEIS] UEBERFAELLIG: Fall #{case.case_number}"
                urgency = "DRINGEND - SOFORTIGER HANDLUNGSBEDARF"
            else:
                subject = f"[AITEMA HINWEIS] Fristenwarnung: Fall #{case.case_number}"
                urgency = "Warnung"

            body = f"""Guten Morgen {recipient_name},

{urgency}

Fall #{case.case_number}: {case.titel}
Frist: {ds.label}
Status: {ds.status.upper()}
Verbleibende Tage: {ds.days_remaining if ds.days_remaining is not None else 'N/A'}

Eingangsbestaetigung erledigt: {'Ja' if ds.ack_done else 'Nein'}
  -> Frist: {ds.ack_deadline}

Abschluss-Rueckmeldung erledigt: {'Ja' if ds.resolve_done else 'Nein'}
  -> Frist: {ds.resolve_deadline}

Bitte handeln Sie umgehend, um die Einhaltung des HinSchG §17 sicherzustellen.

Direktlink: /faelle/{case.id}

--
aitema|Hinweis - HinSchG-konformes Meldesystem
Diese Nachricht wurde automatisch generiert.
"""

            result = notification.send_email(
                to=recipient_email,
                subject=subject,
                body_text=body,
            )

            if result.success:
                sent_count += 1
                log.info(
                    "deadline_alert_sent",
                    case_number=case.case_number,
                    status=ds.status,
                    recipient=recipient_email,
                    days_remaining=ds.days_remaining,
                )
            else:
                error_count += 1
                log.error(
                    "deadline_alert_failed",
                    case_number=case.case_number,
                    recipient=recipient_email,
                    error=result.error,
                )

        log.info(
            "deadline_alerts_task_completed",
            total_urgent=len(urgent_items),
            sent=sent_count,
            errors=error_count,
        )

        return {
            "total_open_cases": len(offene_cases),
            "urgent_cases": len(urgent_items),
            "emails_sent": sent_count,
            "errors": error_count,
        }

    except Exception as exc:
        log.error("deadline_alerts_task_failed", error=str(exc))
        raise self.retry(exc=exc)
    finally:
        session.close()
