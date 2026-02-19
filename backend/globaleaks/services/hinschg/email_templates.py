"""
HinSchG E-Mail Templates for aitema|Hinweis

Professional HTML email templates for all HinSchG-related communications:
- Eingangsbestaetigung (§8 Abs. 1 S. 1)
- Rueckmeldung (§8 Abs. 1 S. 3)
- Fristen-Erinnerungen
- Frist-Eskalationen
- Fallabschluss

All templates include aitema|Hinweis branding, legal references,
and are fully localized in German.
"""
from datetime import datetime
from typing import Optional, List


class HinschgEmailTemplates:
    """Static email template generator for HinSchG communications."""

    # ================================================================
    # Brand Colors & Styling Constants
    # ================================================================
    PRIMARY_COLOR = "#1e3a5f"
    SECONDARY_COLOR = "#4a90d9"
    ACCENT_COLOR = "#e74c3c"
    SUCCESS_COLOR = "#27ae60"
    WARNING_COLOR = "#f39c12"
    BG_COLOR = "#f4f6f8"
    TEXT_COLOR = "#333333"
    MUTED_COLOR = "#666666"

    # ================================================================
    # Base Template Wrapper
    # ================================================================

    @staticmethod
    def base_template(content: str, tenant_name: str = "",
                      kontakt_email: str = "",
                      kontakt_telefon: str = "") -> str:
        """
        Wrap email content in the aitema|Hinweis branded base template.

        :param content: The inner HTML content of the email
        :param tenant_name: Name of the tenant (Kommune/Organisation)
        :param kontakt_email: Contact email for the Meldestelle
        :param kontakt_telefon: Contact phone for the Meldestelle
        :return: Complete HTML email string
        """
        year = datetime.now().year
        kontakt_block = ""
        if kontakt_email or kontakt_telefon:
            kontakt_lines = []
            if kontakt_email:
                kontakt_lines.append(
                    f'E-Mail: <a href="mailto:{kontakt_email}" '
                    f'style="color: {HinschgEmailTemplates.SECONDARY_COLOR};">'
                    f'{kontakt_email}</a>'
                )
            if kontakt_telefon:
                kontakt_lines.append(f"Telefon: {kontakt_telefon}")
            kontakt_block = (
                '<div style="margin-top: 15px; padding-top: 10px; '
                'border-top: 1px solid #dddddd; font-size: 12px; '
                f'color: {HinschgEmailTemplates.MUTED_COLOR};">'
                '<strong>Kontakt Interne Meldestelle:</strong><br>'
                + "<br>".join(kontakt_lines)
                + "</div>"
            )

        tenant_display = tenant_name if tenant_name else "Interne Meldestelle"

        return f"""<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>aitema|Hinweis</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: {HinschgEmailTemplates.BG_COLOR}; color: {HinschgEmailTemplates.TEXT_COLOR};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: {HinschgEmailTemplates.BG_COLOR};">
        <tr>
            <td align="center" style="padding: 30px 15px;">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, {HinschgEmailTemplates.PRIMARY_COLOR}, {HinschgEmailTemplates.SECONDARY_COLOR}); padding: 25px 30px; text-align: center;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="text-align: center;">
                                        <span style="font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: 1px;">aitema</span><span style="font-size: 24px; font-weight: 300; color: rgba(255,255,255,0.85); letter-spacing: 1px;">|Hinweis</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="text-align: center; padding-top: 6px;">
                                        <span style="font-size: 13px; color: rgba(255,255,255,0.7); letter-spacing: 0.5px;">{tenant_display}</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 30px;">
                            {content}
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px 30px; background-color: #f9fafb; border-top: 1px solid #eeeeee;">
                            {kontakt_block}
                            <div style="margin-top: 12px; font-size: 11px; color: {HinschgEmailTemplates.MUTED_COLOR}; text-align: center; line-height: 1.6;">
                                <p style="margin: 0;">Diese Nachricht wurde automatisch von der internen Meldestelle generiert.</p>
                                <p style="margin: 4px 0 0 0;">Ihre Meldung wird gemaess &sect;8 HinSchG vertraulich behandelt.</p>
                                <p style="margin: 8px 0 0 0; font-size: 10px; color: #999999;">&copy; {year} aitema|Hinweis &mdash; Hinweisgebersystem</p>
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""

    # ================================================================
    # Eingangsbestaetigung (§8 Abs. 1 S. 1 HinSchG)
    # ================================================================

    @staticmethod
    def eingangsbestaetigung(aktenzeichen: str, datum: str,
                             zugangs_code: str,
                             tenant_name: str = "",
                             kontakt_email: str = "",
                             kontakt_telefon: str = "") -> str:
        """
        Generate confirmation email for received report.

        Legally required within 7 days of report receipt (§8 Abs. 1 S. 1).

        :param aktenzeichen: Case reference number (e.g. HIN-001-2026-00001)
        :param datum: Date of report receipt (formatted string)
        :param zugangs_code: Personal access code for the whistleblower
        :param tenant_name: Name of the Kommune/Organisation
        :param kontakt_email: Contact email
        :param kontakt_telefon: Contact phone
        :return: Complete HTML email
        """
        pc = HinschgEmailTemplates.PRIMARY_COLOR
        sc = HinschgEmailTemplates.SECONDARY_COLOR
        mc = HinschgEmailTemplates.MUTED_COLOR
        ac = HinschgEmailTemplates.ACCENT_COLOR

        content = f"""
<h2 style="margin: 0 0 20px 0; color: {pc}; font-size: 20px; font-weight: 600;">
    Eingangsbestaetigung Ihrer Meldung
</h2>

<p style="margin: 0 0 15px 0; line-height: 1.6; font-size: 15px;">
    Sehr geehrte/r Hinweisgeber/in,
</p>

<p style="margin: 0 0 15px 0; line-height: 1.6; font-size: 15px;">
    wir bestaetigen den Eingang Ihrer Meldung. Diese wurde ordnungsgemaess erfasst und
    wird von der internen Meldestelle vertraulich bearbeitet.
</p>

<!-- Case Info Box -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; border: 1px solid #e0e6ed; border-radius: 6px; overflow: hidden;">
    <tr>
        <td style="background-color: {pc}; padding: 10px 20px;">
            <span style="color: #ffffff; font-size: 13px; font-weight: 600; letter-spacing: 0.5px;">FALLDATEN</span>
        </td>
    </tr>
    <tr>
        <td style="padding: 15px 20px; background-color: #f8fafc;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding: 6px 0; font-size: 14px; color: {mc}; width: 160px;">Aktenzeichen:</td>
                    <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: {pc};">{aktenzeichen}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; font-size: 14px; color: {mc};">Eingangsdatum:</td>
                    <td style="padding: 6px 0; font-size: 14px;">{datum}</td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<!-- Access Code Box -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; border: 2px solid {sc}; border-radius: 6px; overflow: hidden;">
    <tr>
        <td style="background-color: #eaf2fb; padding: 15px 20px; text-align: center;">
            <p style="margin: 0 0 8px 0; font-size: 13px; color: {mc}; font-weight: 600;">IHR PERSOENLICHER ZUGANGS-CODE</p>
            <p style="margin: 0; font-size: 22px; font-weight: 700; color: {pc}; letter-spacing: 2px; font-family: 'Courier New', monospace;">{zugangs_code}</p>
            <p style="margin: 8px 0 0 0; font-size: 12px; color: {ac};">Bitte bewahren Sie diesen Code sicher auf. Er dient zur Abfrage des Bearbeitungsstands.</p>
        </td>
    </tr>
</table>

<p style="margin: 0 0 15px 0; line-height: 1.6; font-size: 15px;">
    Sie erhalten innerhalb von <strong>7 Tagen</strong> eine Eingangsbestaetigung
    gemaess &sect;8 HinSchG. Innerhalb von <strong>3 Monaten</strong> werden wir Ihnen
    eine Rueckmeldung zu den ergriffenen bzw. geplanten Folgemassnahmen geben.
</p>

<!-- Legal Reference -->
<div style="margin-top: 20px; padding: 12px 16px; background-color: #f8f9fa; border-left: 3px solid {sc}; font-size: 12px; color: {mc}; line-height: 1.5;">
    <strong>Rechtsgrundlage:</strong> Diese Bestaetigung erfolgt gemaess &sect;8 Abs. 1 Satz 1 des
    Hinweisgeberschutzgesetzes (HinSchG). Ihre Identitaet wird gemaess &sect;8 Abs. 1 HinSchG geschuetzt.
</div>

<p style="margin: 20px 0 0 0; line-height: 1.6; font-size: 15px;">
    Mit freundlichen Gruessen<br>
    <strong>Interne Meldestelle{(' ' + tenant_name) if tenant_name else ''}</strong>
</p>"""

        return HinschgEmailTemplates.base_template(
            content, tenant_name, kontakt_email, kontakt_telefon
        )

    # ================================================================
    # Rueckmeldung (§8 Abs. 1 S. 3 HinSchG)
    # ================================================================

    @staticmethod
    def rueckmeldung(aktenzeichen: str, status: str,
                     massnahmen: str,
                     tenant_name: str = "",
                     kontakt_email: str = "",
                     kontakt_telefon: str = "") -> str:
        """
        Generate feedback email about case processing status.

        Legally required within 3 months (§8 Abs. 1 S. 3).

        :param aktenzeichen: Case reference number
        :param status: Current processing status
        :param massnahmen: Description of measures taken
        :param tenant_name: Name of the Kommune/Organisation
        :param kontakt_email: Contact email
        :param kontakt_telefon: Contact phone
        :return: Complete HTML email
        """
        pc = HinschgEmailTemplates.PRIMARY_COLOR
        sc = HinschgEmailTemplates.SECONDARY_COLOR
        mc = HinschgEmailTemplates.MUTED_COLOR
        gc = HinschgEmailTemplates.SUCCESS_COLOR
        tc = HinschgEmailTemplates.TEXT_COLOR

        content = f"""
<h2 style="margin: 0 0 20px 0; color: {pc}; font-size: 20px; font-weight: 600;">
    Rueckmeldung zu Ihrer Meldung
</h2>

<p style="margin: 0 0 15px 0; line-height: 1.6; font-size: 15px;">
    Sehr geehrte/r Hinweisgeber/in,
</p>

<p style="margin: 0 0 15px 0; line-height: 1.6; font-size: 15px;">
    zu Ihrer Meldung mit dem Aktenzeichen <strong>{aktenzeichen}</strong> moechten wir
    Ihnen folgende Rueckmeldung geben:
</p>

<!-- Status Box -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; border: 1px solid #e0e6ed; border-radius: 6px; overflow: hidden;">
    <tr>
        <td style="background-color: {pc}; padding: 10px 20px;">
            <span style="color: #ffffff; font-size: 13px; font-weight: 600; letter-spacing: 0.5px;">AKTUELLER STATUS</span>
        </td>
    </tr>
    <tr>
        <td style="padding: 15px 20px; background-color: #f8fafc;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding: 6px 0; font-size: 14px; color: {mc}; width: 160px;">Aktenzeichen:</td>
                    <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: {pc};">{aktenzeichen}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; font-size: 14px; color: {mc};">Status:</td>
                    <td style="padding: 6px 0; font-size: 14px; font-weight: 600;">{status}</td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<!-- Massnahmen -->
<div style="margin: 20px 0; padding: 15px 20px; background-color: #f0f7f0; border: 1px solid #c8e6c9; border-radius: 6px;">
    <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: {gc}; text-transform: uppercase; letter-spacing: 0.5px;">Ergriffene / Geplante Massnahmen</p>
    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: {tc};">{massnahmen}</p>
</div>

<!-- Legal Reference -->
<div style="margin-top: 20px; padding: 12px 16px; background-color: #f8f9fa; border-left: 3px solid {sc}; font-size: 12px; color: {mc}; line-height: 1.5;">
    <strong>Rechtsgrundlage:</strong> Diese Rueckmeldung erfolgt gemaess &sect;8 Abs. 1 Satz 3 HinSchG.
    Die interne Meldestelle ist verpflichtet, dem Hinweisgeber innerhalb von drei Monaten nach
    Eingangsbestaetigung eine Rueckmeldung ueber die ergriffenen bzw. geplanten Folgemassnahmen zu geben.
</div>

<p style="margin: 20px 0 0 0; line-height: 1.6; font-size: 15px;">
    Mit freundlichen Gruessen<br>
    <strong>Interne Meldestelle{(' ' + tenant_name) if tenant_name else ''}</strong>
</p>"""

        return HinschgEmailTemplates.base_template(
            content, tenant_name, kontakt_email, kontakt_telefon
        )

    # ================================================================
    # Frist-Erinnerung (Internal)
    # ================================================================

    @staticmethod
    def frist_erinnerung(aktenzeichen: str, frist_typ: str,
                         frist_datum: str, tage_verbleibend: int,
                         tenant_name: str = "") -> str:
        """
        Generate deadline reminder email for case handlers.

        Sent internally to Ombudsperson/case handlers before a deadline.

        :param aktenzeichen: Case reference number
        :param frist_typ: Type of deadline (e.g. 'Eingangsbestaetigung 7 Tage')
        :param frist_datum: Deadline date (formatted string)
        :param tage_verbleibend: Days remaining until deadline
        :param tenant_name: Name of the Kommune/Organisation
        :return: Complete HTML email
        """
        wc = HinschgEmailTemplates.WARNING_COLOR
        ac = HinschgEmailTemplates.ACCENT_COLOR
        pc = HinschgEmailTemplates.PRIMARY_COLOR
        mc = HinschgEmailTemplates.MUTED_COLOR

        urgency_color = wc
        if tage_verbleibend <= 1:
            urgency_color = ac

        tage_label = "Tag" if tage_verbleibend == 1 else "Tage"

        content = f"""
<h2 style="margin: 0 0 20px 0; color: {wc}; font-size: 20px; font-weight: 600;">
    &#9888; Frist-Erinnerung
</h2>

<p style="margin: 0 0 15px 0; line-height: 1.6; font-size: 15px;">
    Sehr geehrte Bearbeiterin / Sehr geehrter Bearbeiter,
</p>

<p style="margin: 0 0 15px 0; line-height: 1.6; font-size: 15px;">
    fuer den folgenden Fall laeuft in Kuerze eine gesetzliche Frist ab.
    Bitte stellen Sie die fristgerechte Bearbeitung sicher.
</p>

<!-- Deadline Info Box -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; border: 2px solid {urgency_color}; border-radius: 6px; overflow: hidden;">
    <tr>
        <td style="background-color: {urgency_color}; padding: 10px 20px;">
            <span style="color: #ffffff; font-size: 13px; font-weight: 600; letter-spacing: 0.5px;">FRISTINFORMATION</span>
        </td>
    </tr>
    <tr>
        <td style="padding: 15px 20px; background-color: #fffcf5;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding: 6px 0; font-size: 14px; color: {mc}; width: 170px;">Aktenzeichen:</td>
                    <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: {pc};">{aktenzeichen}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; font-size: 14px; color: {mc};">Frist-Typ:</td>
                    <td style="padding: 6px 0; font-size: 14px; font-weight: 600;">{frist_typ}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; font-size: 14px; color: {mc};">Frist-Datum:</td>
                    <td style="padding: 6px 0; font-size: 14px; font-weight: 600;">{frist_datum}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; font-size: 14px; color: {mc};">Verbleibende Tage:</td>
                    <td style="padding: 6px 0; font-size: 18px; font-weight: 700; color: {urgency_color};">{tage_verbleibend} {tage_label}</td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<p style="margin: 0 0 0 0; line-height: 1.6; font-size: 15px;">
    Bitte nehmen Sie umgehend die notwendigen Bearbeitungsschritte vor,
    um eine fristgerechte Erledigung sicherzustellen.
</p>"""

        return HinschgEmailTemplates.base_template(content, tenant_name)

    # ================================================================
    # Frist-Eskalation (Internal / Critical)
    # ================================================================

    @staticmethod
    def frist_eskalation(aktenzeichen: str, frist_typ: str,
                         tage_ueberfaellig: int,
                         tenant_name: str = "") -> str:
        """
        Generate deadline violation escalation email.

        Sent when a legally mandated deadline has been exceeded.

        :param aktenzeichen: Case reference number
        :param frist_typ: Type of deadline violated
        :param tage_ueberfaellig: Days overdue
        :param tenant_name: Name of the Kommune/Organisation
        :return: Complete HTML email
        """
        ac = HinschgEmailTemplates.ACCENT_COLOR
        pc = HinschgEmailTemplates.PRIMARY_COLOR
        mc = HinschgEmailTemplates.MUTED_COLOR

        tage_label = "Tag" if tage_ueberfaellig == 1 else "Tage"

        content = f"""
<h2 style="margin: 0 0 20px 0; color: {ac}; font-size: 20px; font-weight: 600;">
    &#10071; ACHTUNG: Fristversaeumnis
</h2>

<div style="margin: 0 0 20px 0; padding: 15px 20px; background-color: #fef0f0; border: 2px solid {ac}; border-radius: 6px;">
    <p style="margin: 0; font-size: 15px; font-weight: 600; color: {ac}; line-height: 1.6;">
        ACHTUNG FRISTVERSAEUMNIS: Der Fall <strong>{aktenzeichen}</strong> hat die
        gesetzliche Frist &bdquo;{frist_typ}&ldquo; um <strong>{tage_ueberfaellig} {tage_label}</strong> ueberschritten!
    </p>
</div>

<p style="margin: 0 0 15px 0; line-height: 1.6; font-size: 15px;">
    Sehr geehrte Bearbeiterin / Sehr geehrter Bearbeiter,
</p>

<p style="margin: 0 0 15px 0; line-height: 1.6; font-size: 15px;">
    die gesetzlich vorgeschriebene Frist fuer den oben genannten Fall wurde ueberschritten.
    Dies stellt einen Verstoss gegen das Hinweisgeberschutzgesetz dar und kann
    rechtliche Konsequenzen haben.
</p>

<!-- Escalation Details -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; border: 2px solid {ac}; border-radius: 6px; overflow: hidden;">
    <tr>
        <td style="background-color: {ac}; padding: 10px 20px;">
            <span style="color: #ffffff; font-size: 13px; font-weight: 600; letter-spacing: 0.5px;">ESKALATIONSDETAILS</span>
        </td>
    </tr>
    <tr>
        <td style="padding: 15px 20px; background-color: #fff5f5;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding: 6px 0; font-size: 14px; color: {mc}; width: 170px;">Aktenzeichen:</td>
                    <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: {pc};">{aktenzeichen}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; font-size: 14px; color: {mc};">Versaeumte Frist:</td>
                    <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: {ac};">{frist_typ}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; font-size: 14px; color: {mc};">Ueberfaellig seit:</td>
                    <td style="padding: 6px 0; font-size: 18px; font-weight: 700; color: {ac};">{tage_ueberfaellig} {tage_label}</td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<p style="margin: 0 0 15px 0; line-height: 1.6; font-size: 15px; font-weight: 600; color: {ac};">
    Sofortiges Handeln ist erforderlich!
</p>

<!-- Legal Reference -->
<div style="margin-top: 20px; padding: 12px 16px; background-color: #f8f9fa; border-left: 3px solid {ac}; font-size: 12px; color: {mc}; line-height: 1.5;">
    <strong>Hinweis:</strong> Gemaess &sect;40 HinSchG kann ein Verstoss gegen die Fristen des &sect;8 HinSchG
    als Ordnungswidrigkeit geahndet werden und zu Bussgeldern fuehren.
</div>"""

        return HinschgEmailTemplates.base_template(content, tenant_name)

    # ================================================================
    # Fallabschluss
    # ================================================================

    @staticmethod
    def fallabschluss(aktenzeichen: str, begruendung: str,
                      tenant_name: str = "",
                      kontakt_email: str = "",
                      kontakt_telefon: str = "") -> str:
        """
        Generate case closure notification email.

        Informs the whistleblower that their case has been closed.

        :param aktenzeichen: Case reference number
        :param begruendung: Reason/justification for closure
        :param tenant_name: Name of the Kommune/Organisation
        :param kontakt_email: Contact email
        :param kontakt_telefon: Contact phone
        :return: Complete HTML email
        """
        pc = HinschgEmailTemplates.PRIMARY_COLOR
        sc = HinschgEmailTemplates.SECONDARY_COLOR
        mc = HinschgEmailTemplates.MUTED_COLOR
        gc = HinschgEmailTemplates.SUCCESS_COLOR
        tc = HinschgEmailTemplates.TEXT_COLOR

        content = f"""
<h2 style="margin: 0 0 20px 0; color: {pc}; font-size: 20px; font-weight: 600;">
    Abschluss Ihrer Meldung
</h2>

<p style="margin: 0 0 15px 0; line-height: 1.6; font-size: 15px;">
    Sehr geehrte/r Hinweisgeber/in,
</p>

<p style="margin: 0 0 15px 0; line-height: 1.6; font-size: 15px;">
    wir teilen Ihnen mit, dass die Bearbeitung Ihrer Meldung mit dem Aktenzeichen
    <strong>{aktenzeichen}</strong> abgeschlossen wurde.
</p>

<!-- Closure Details -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; border: 1px solid #e0e6ed; border-radius: 6px; overflow: hidden;">
    <tr>
        <td style="background-color: {pc}; padding: 10px 20px;">
            <span style="color: #ffffff; font-size: 13px; font-weight: 600; letter-spacing: 0.5px;">ABSCHLUSSDETAILS</span>
        </td>
    </tr>
    <tr>
        <td style="padding: 15px 20px; background-color: #f8fafc;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding: 6px 0; font-size: 14px; color: {mc}; width: 160px;">Aktenzeichen:</td>
                    <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: {pc};">{aktenzeichen}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; font-size: 14px; color: {mc};">Status:</td>
                    <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: {gc};">Abgeschlossen</td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<!-- Begruendung -->
<div style="margin: 20px 0; padding: 15px 20px; background-color: #f8fafc; border: 1px solid #e0e6ed; border-radius: 6px;">
    <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: {mc}; text-transform: uppercase; letter-spacing: 0.5px;">Begruendung</p>
    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: {tc};">{begruendung}</p>
</div>

<p style="margin: 0 0 15px 0; line-height: 1.6; font-size: 15px;">
    Gemaess &sect;11 HinSchG werden die Unterlagen zu diesem Verfahren fuer
    die Dauer von drei Jahren nach Abschluss aufbewahrt und anschliessend geloescht.
</p>

<p style="margin: 0 0 15px 0; line-height: 1.6; font-size: 15px;">
    Sollten Sie weitere Informationen zu Ihrem Fall benoetigen oder neue Hinweise
    mitteilen wollen, koennen Sie sich jederzeit erneut an die interne Meldestelle wenden.
</p>

<p style="margin: 20px 0 0 0; line-height: 1.6; font-size: 15px;">
    Mit freundlichen Gruessen<br>
    <strong>Interne Meldestelle{(' ' + tenant_name) if tenant_name else ''}</strong>
</p>"""

        return HinschgEmailTemplates.base_template(
            content, tenant_name, kontakt_email, kontakt_telefon
        )

    # ================================================================
    # Subject Line Generators
    # ================================================================

    @staticmethod
    def subject_eingangsbestaetigung(aktenzeichen: str) -> str:
        """Generate subject line for Eingangsbestaetigung."""
        return f"Eingangsbestaetigung - Meldung {aktenzeichen}"

    @staticmethod
    def subject_rueckmeldung(aktenzeichen: str) -> str:
        """Generate subject line for Rueckmeldung."""
        return f"Rueckmeldung zu Ihrer Meldung {aktenzeichen}"

    @staticmethod
    def subject_frist_erinnerung(aktenzeichen: str, frist_typ: str) -> str:
        """Generate subject line for Frist-Erinnerung."""
        return f"[ERINNERUNG] Frist {frist_typ} - Fall {aktenzeichen}"

    @staticmethod
    def subject_frist_eskalation(aktenzeichen: str, frist_typ: str) -> str:
        """Generate subject line for Frist-Eskalation."""
        return f"[ESKALATION] Fristversaeumnis {frist_typ} - Fall {aktenzeichen}"

    @staticmethod
    def subject_fallabschluss(aktenzeichen: str) -> str:
        """Generate subject line for Fallabschluss."""
        return f"Abschluss Ihrer Meldung {aktenzeichen}"
