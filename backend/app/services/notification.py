"""
aitema|Hinweis - Notification Service
E-Mail und Secure-Messenger Benachrichtigungen.
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from dataclasses import dataclass

from flask import current_app
import structlog

log = structlog.get_logger()


@dataclass
class NotificationResult:
    """Ergebnis einer Benachrichtigung."""
    success: bool
    channel: str
    recipient: str
    error: Optional[str] = None


class NotificationService:
    """
    Benachrichtigungs-Service fuer verschiedene Kanaele.

    Kanaele:
    - E-Mail (SMTP/TLS)
    - Portal-Nachrichten (fuer anonyme Melder)
    - Webhook (fuer SIEM/Ticketsysteme)
    """

    def __init__(self):
        self.smtp_host = os.environ.get("SMTP_HOST", "")
        self.smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        self.smtp_user = os.environ.get("SMTP_USER", "")
        self.smtp_password = os.environ.get("SMTP_PASSWORD", "")
        self.smtp_from = os.environ.get("SMTP_FROM", "noreply@hinweis.aitema.de")
        self.smtp_tls = os.environ.get("SMTP_TLS", "true").lower() == "true"

    def send_email(
        self,
        to: str,
        subject: str,
        body_text: str,
        body_html: Optional[str] = None,
    ) -> NotificationResult:
        """
        Sendet eine E-Mail ueber SMTP.

        Args:
            to: Empfaenger-Adresse
            subject: Betreff
            body_text: Klartext-Inhalt
            body_html: Optional HTML-Inhalt
        """
        if not self.smtp_host:
            log.warning("smtp_not_configured", to=to)
            return NotificationResult(
                success=False, channel="email", recipient=to,
                error="SMTP nicht konfiguriert",
            )

        try:
            msg = MIMEMultipart("alternative")
            msg["From"] = self.smtp_from
            msg["To"] = to
            msg["Subject"] = subject
            msg["X-Mailer"] = "aitema|Hinweis"

            msg.attach(MIMEText(body_text, "plain", "utf-8"))
            if body_html:
                msg.attach(MIMEText(body_html, "html", "utf-8"))

            if self.smtp_tls:
                server = smtplib.SMTP(self.smtp_host, self.smtp_port)
                server.starttls()
            else:
                server = smtplib.SMTP_SSL(self.smtp_host, self.smtp_port)

            if self.smtp_user and self.smtp_password:
                server.login(self.smtp_user, self.smtp_password)

            server.sendmail(self.smtp_from, [to], msg.as_string())
            server.quit()

            log.info("email_sent", to=to, subject=subject)
            return NotificationResult(success=True, channel="email", recipient=to)

        except Exception as e:
            log.error("email_send_failed", to=to, error=str(e))
            return NotificationResult(
                success=False, channel="email", recipient=to, error=str(e)
            )

    def send_eingangsbestaetigung(self, hinweis, tenant) -> NotificationResult:
        """
        Sendet die Eingangsbestaetigung an den Melder.
        HinSchG Paragraf 17 Abs. 1 S. 2.
        """
        subject = f"Eingangsbestaetigung - Meldung {hinweis.reference_code}"

        body_text = f"""Sehr geehrte/r Hinweisgeber/in,

hiermit bestaetigen wir den Eingang Ihrer Meldung.

Referenznummer: {hinweis.reference_code}
Eingangsdatum: {hinweis.eingegangen_am.strftime("%d.%m.%Y")}

Sie erhalten innerhalb von 3 Monaten eine Rueckmeldung zu den ergriffenen
oder geplanten Folgemaßnahmen.

Den aktuellen Status Ihrer Meldung koennen Sie jederzeit ueber das
Meldeportal mit Ihrem persoenlichen Zugangscode pruefen.

Ihre Identitaet wird gemaess Paragraf 8 HinSchG vertraulich behandelt.
Sie sind durch das Repressalienverbot (Paragraf 36 HinSchG) geschuetzt.

Mit freundlichen Gruessen
{tenant.ombudsperson_name or Die Ombudsstelle}
{tenant.name}

---
Diese Nachricht wurde automatisch generiert.
aitema|Hinweis - Hinweisgebersystem
"""

        if hinweis.is_anonymous:
            log.info(
                "eingangsbestaetigung_portal",
                reference_code=hinweis.reference_code,
            )
            return NotificationResult(
                success=True,
                channel="portal",
                recipient="anonym",
            )

        # TODO: E-Mail-Adresse entschluesseln
        return NotificationResult(
            success=True,
            channel="portal",
            recipient="melder",
        )

    def send_rueckmeldung(self, hinweis, tenant, rueckmeldung_text: str) -> NotificationResult:
        """
        Sendet die Rueckmeldung an den Melder.
        HinSchG Paragraf 17 Abs. 2.
        """
        subject = f"Rueckmeldung - Meldung {hinweis.reference_code}"

        body_text = f"""Sehr geehrte/r Hinweisgeber/in,

zu Ihrer Meldung (Referenz: {hinweis.reference_code}) moechten wir
Ihnen folgende Rueckmeldung geben:

{rueckmeldung_text}

Bei Fragen koennen Sie sich jederzeit ueber das Meldeportal an uns wenden.

Ihre Identitaet bleibt weiterhin gemaess Paragraf 8 HinSchG geschuetzt.

Mit freundlichen Gruessen
{tenant.ombudsperson_name or Die Ombudsstelle}
{tenant.name}
"""

        if hinweis.is_anonymous:
            return NotificationResult(
                success=True, channel="portal", recipient="anonym",
            )

        return NotificationResult(
            success=True, channel="portal", recipient="melder",
        )

    def send_frist_warnung(self, hinweis, frist, warnstufe: str) -> None:
        """Sendet eine interne Warnung bei drohender Fristueberschreitung."""
        severity_map = {
            "warnung": "WARNUNG",
            "kritisch": "KRITISCH",
            "ueberfaellig": "UEBERFAELLIG",
        }

        log.warning(
            "frist_warnung",
            reference_code=hinweis.reference_code,
            frist_name=frist.frist_name,
            warnstufe=severity_map.get(warnstufe, warnstufe),
            tage_verbleibend=frist.tage_verbleibend,
            frist_datum=frist.frist_datum.isoformat(),
        )

        # TODO: Ombudsperson per E-Mail benachrichtigen
        # TODO: Dashboard-Alert erstellen
