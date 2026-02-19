"""
HinSchG PDF Report Generator for aitema|Hinweis

Generates HTML-based compliance reports that can be rendered as PDF
using wkhtmltopdf. Implements §27 HinSchG reporting requirements.

Usage:
    report_data = {
        'kommune_name': 'Stadt Musterstadt',
        'zeitraum_von': '01.01.2025',
        'zeitraum_bis': '31.12.2025',
        'erstellungsdatum': '15.01.2026',
        'erstellt_von': 'Max Mustermann',
        'gesamt_meldungen': 42,
        'abgeschlossene_faelle': 35,
        'offene_faelle': 7,
        'stichhaltige_meldungen': 28,
        'nicht_stichhaltige_meldungen': 7,
        'kategorien': {'korruption': 5, 'betrug': 12, ...},
        'status_verteilung': {'eingegangen': 3, 'in_bearbeitung': 4, ...},
        'fristen_eingehalten': 38,
        'fristen_versaeumt': 4,
        'fristverstoesse_7t': 1,
        'fristverstoesse_3m': 3,
        'durchschnittliche_bearbeitungszeit_tage': 45,
        'massnahmen': ['Disziplinarverfahren eingeleitet', ...],
    }
    html = HinschgPDFReport.generate_compliance_report(report_data)
    # Then render to PDF via: wkhtmltopdf --encoding utf-8 input.html output.pdf
"""
import subprocess
import tempfile
import os
from datetime import datetime
from typing import Dict, List, Optional, Any


class HinschgPDFReport:
    """
    PDF report generator for HinSchG §27 compliance reports.

    Generates HTML that can be converted to PDF via wkhtmltopdf.
    """

    # Brand colors matching email templates
    PRIMARY_COLOR = "#1e3a5f"
    SECONDARY_COLOR = "#4a90d9"
    ACCENT_COLOR = "#e74c3c"
    SUCCESS_COLOR = "#27ae60"
    WARNING_COLOR = "#f39c12"
    TEXT_COLOR = "#333333"
    MUTED_COLOR = "#666666"
    BORDER_COLOR = "#dee2e6"

    # German labels for Kategorie enum values
    KATEGORIE_LABELS = {
        'korruption': 'Korruption',
        'betrug': 'Betrug',
        'interessenkonflikt': 'Interessenkonflikt',
        'datenschutz': 'Datenschutzverstoss',
        'umwelt': 'Umweltverstoss',
        'arbeitsschutz': 'Arbeitsschutzverstoss',
        'diskriminierung': 'Diskriminierung',
        'unterschlagung': 'Unterschlagung',
        'steuerhinterziehung': 'Steuerhinterziehung',
        'geldwaesche': 'Geldwaesche',
        'wettbewerbsrecht': 'Wettbewerbsverstoss',
        'produktsicherheit': 'Produktsicherheitsverstoss',
        'verbraucherschutz': 'Verbraucherschutzverstoss',
        'vergaberecht': 'Vergaberechtsverstoss',
        'sonstiges': 'Sonstiges',
    }

    # German labels for Status enum values
    STATUS_LABELS = {
        'eingegangen': 'Eingegangen',
        'bestaetigt': 'Bestaetigt',
        'in_bearbeitung': 'In Bearbeitung',
        'stichhaltigkeitspruefung': 'Stichhaltigkeitspruefung',
        'ermittlung': 'Ermittlung',
        'folgemassnahme': 'Folgemassnahme',
        'abgeschlossen': 'Abgeschlossen',
        'archiviert': 'Archiviert',
    }

    @staticmethod
    def _get_styles() -> str:
        """Return CSS styles for the PDF report."""
        pc = HinschgPDFReport.PRIMARY_COLOR
        sc = HinschgPDFReport.SECONDARY_COLOR
        tc = HinschgPDFReport.TEXT_COLOR
        mc = HinschgPDFReport.MUTED_COLOR
        bc = HinschgPDFReport.BORDER_COLOR

        return f"""
        @page {{
            size: A4;
            margin: 20mm 15mm 25mm 15mm;
        }}

        body {{
            font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
            font-size: 11pt;
            color: {tc};
            line-height: 1.5;
            margin: 0;
            padding: 0;
        }}

        /* Title Page */
        .title-page {{
            page-break-after: always;
            text-align: center;
            padding-top: 120px;
        }}

        .title-page .brand {{
            font-size: 32pt;
            margin-bottom: 10px;
        }}

        .title-page .brand-name {{
            font-weight: 700;
            color: {pc};
        }}

        .title-page .brand-suffix {{
            font-weight: 300;
            color: {sc};
        }}

        .title-page h1 {{
            font-size: 22pt;
            color: {pc};
            margin: 40px 0 10px 0;
            font-weight: 600;
            line-height: 1.3;
        }}

        .title-page .subtitle {{
            font-size: 14pt;
            color: {mc};
            margin-bottom: 60px;
        }}

        .title-page .meta-table {{
            margin: 0 auto;
            border-collapse: collapse;
            font-size: 11pt;
        }}

        .title-page .meta-table td {{
            padding: 6px 15px;
            text-align: left;
        }}

        .title-page .meta-table td:first-child {{
            color: {mc};
            font-weight: 600;
        }}

        /* Chapter headings */
        h2 {{
            font-size: 16pt;
            color: {pc};
            border-bottom: 2px solid {sc};
            padding-bottom: 6px;
            margin: 30px 0 15px 0;
            page-break-after: avoid;
        }}

        h3 {{
            font-size: 13pt;
            color: {pc};
            margin: 20px 0 10px 0;
        }}

        /* Tables */
        table.data-table {{
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 10pt;
        }}

        table.data-table thead th {{
            background-color: {pc};
            color: #ffffff;
            padding: 8px 12px;
            text-align: left;
            font-weight: 600;
            font-size: 10pt;
        }}

        table.data-table tbody td {{
            padding: 7px 12px;
            border-bottom: 1px solid {bc};
        }}

        table.data-table tbody tr:nth-child(even) {{
            background-color: #f8fafc;
        }}

        table.data-table tbody tr:hover {{
            background-color: #edf2f7;
        }}

        .number-cell {{
            text-align: right;
            font-weight: 600;
            font-variant-numeric: tabular-nums;
        }}

        /* Summary boxes */
        .summary-grid {{
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            margin: 20px 0;
        }}

        .summary-box {{
            flex: 1;
            min-width: 140px;
            border: 1px solid {bc};
            border-radius: 6px;
            padding: 15px;
            text-align: center;
        }}

        .summary-box .number {{
            font-size: 28pt;
            font-weight: 700;
            line-height: 1.2;
        }}

        .summary-box .label {{
            font-size: 9pt;
            color: {mc};
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 4px;
        }}

        /* KPI table for summary as fallback for flex */
        table.kpi-table {{
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }}

        table.kpi-table td {{
            width: 25%;
            text-align: center;
            padding: 15px 10px;
            border: 1px solid {bc};
        }}

        table.kpi-table .kpi-number {{
            font-size: 28pt;
            font-weight: 700;
            line-height: 1.2;
        }}

        table.kpi-table .kpi-label {{
            font-size: 9pt;
            color: {mc};
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 4px;
            display: block;
        }}

        /* Fristen visualization */
        .bar-container {{
            width: 100%;
            height: 24px;
            background-color: #f0f0f0;
            border-radius: 12px;
            overflow: hidden;
            margin: 10px 0;
        }}

        .bar-fill {{
            height: 100%;
            border-radius: 12px;
            display: inline-block;
            float: left;
        }}

        .bar-success {{
            background-color: {HinschgPDFReport.SUCCESS_COLOR};
        }}

        .bar-danger {{
            background-color: {HinschgPDFReport.ACCENT_COLOR};
        }}

        /* Lists */
        ul.massnahmen-list {{
            padding-left: 20px;
        }}

        ul.massnahmen-list li {{
            margin-bottom: 6px;
            line-height: 1.5;
        }}

        /* Footer */
        .report-footer {{
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 8pt;
            color: {mc};
            border-top: 1px solid {bc};
            padding: 8px 0;
        }}

        /* Legal note */
        .legal-note {{
            margin-top: 30px;
            padding: 12px 16px;
            background-color: #f8f9fa;
            border-left: 3px solid {sc};
            font-size: 9pt;
            color: {mc};
            line-height: 1.5;
        }}

        /* Page break helper */
        .page-break {{
            page-break-before: always;
        }}
        """

    @staticmethod
    def generate_compliance_report(report_data: Dict[str, Any]) -> str:
        """
        Generate an HTML compliance report for §27 HinSchG.

        :param report_data: Dictionary with report data fields
        :return: Complete HTML string suitable for wkhtmltopdf conversion
        """
        kommune = report_data.get('kommune_name', 'Interne Meldestelle')
        zeitraum_von = report_data.get('zeitraum_von', '')
        zeitraum_bis = report_data.get('zeitraum_bis', '')
        erstellungsdatum = report_data.get('erstellungsdatum', datetime.now().strftime('%d.%m.%Y'))
        erstellt_von = report_data.get('erstellt_von', '')
        gesamt = report_data.get('gesamt_meldungen', 0)
        abgeschlossen = report_data.get('abgeschlossene_faelle', 0)
        offen = report_data.get('offene_faelle', 0)
        stichhaltig = report_data.get('stichhaltige_meldungen', 0)
        nicht_stichhaltig = report_data.get('nicht_stichhaltige_meldungen', 0)
        kategorien = report_data.get('kategorien', {})
        status_verteilung = report_data.get('status_verteilung', {})
        fristen_eingehalten = report_data.get('fristen_eingehalten', 0)
        fristen_versaeumt = report_data.get('fristen_versaeumt', 0)
        fristverstoesse_7t = report_data.get('fristverstoesse_7t', 0)
        fristverstoesse_3m = report_data.get('fristverstoesse_3m', 0)
        avg_days = report_data.get('durchschnittliche_bearbeitungszeit_tage', 0)
        massnahmen = report_data.get('massnahmen', [])

        pc = HinschgPDFReport.PRIMARY_COLOR
        sc = HinschgPDFReport.SECONDARY_COLOR
        gc = HinschgPDFReport.SUCCESS_COLOR
        ac = HinschgPDFReport.ACCENT_COLOR
        wc = HinschgPDFReport.WARNING_COLOR

        # Build the report sections
        styles = HinschgPDFReport._get_styles()
        title_page = HinschgPDFReport._build_title_page(
            kommune, zeitraum_von, zeitraum_bis, erstellungsdatum, erstellt_von
        )
        chapter1 = HinschgPDFReport._build_chapter_zusammenfassung(
            gesamt, abgeschlossen, offen, stichhaltig, nicht_stichhaltig, avg_days
        )
        chapter2 = HinschgPDFReport._build_chapter_kategorien(kategorien)
        chapter3 = HinschgPDFReport._build_chapter_status(status_verteilung)
        chapter4 = HinschgPDFReport._build_chapter_fristen(
            fristen_eingehalten, fristen_versaeumt, fristverstoesse_7t, fristverstoesse_3m
        )
        chapter5 = HinschgPDFReport._build_chapter_massnahmen(massnahmen)

        footer_text = f"Erstellt mit aitema|Hinweis - {erstellungsdatum}"

        return f"""<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>Taetigkeitsbericht - {kommune}</title>
    <style>{styles}</style>
</head>
<body>
    {title_page}
    {chapter1}
    {chapter2}
    {chapter3}
    <div class="page-break"></div>
    {chapter4}
    {chapter5}

    <div class="legal-note">
        <strong>Rechtsgrundlage:</strong> Dieser Bericht wurde gemaess &sect;27 Abs. 1 HinSchG erstellt.
        Er dient der jaehrlichen Berichterstattung gegenueber der Organisationsleitung ueber die
        Taetigkeit der internen Meldestelle. Personenbezogene Daten wurden anonymisiert.
    </div>

    <div class="report-footer">
        {footer_text}
    </div>
</body>
</html>"""

    @staticmethod
    def _build_title_page(kommune: str, zeitraum_von: str,
                          zeitraum_bis: str, erstellungsdatum: str,
                          erstellt_von: str) -> str:
        """Build the title page section."""
        return f"""
    <div class="title-page">
        <div class="brand">
            <span class="brand-name">aitema</span><span class="brand-suffix">|Hinweis</span>
        </div>
        <p style="font-size: 11pt; color: #999999; margin-top: 0;">Hinweisgebersystem</p>

        <h1>Taetigkeitsbericht<br>der internen Meldestelle<br>gemaess &sect;27 HinSchG</h1>

        <p class="subtitle">{kommune}</p>

        <table class="meta-table">
            <tr><td>Berichtszeitraum:</td><td>{zeitraum_von} &ndash; {zeitraum_bis}</td></tr>
            <tr><td>Erstellt am:</td><td>{erstellungsdatum}</td></tr>
            <tr><td>Erstellt von:</td><td>{erstellt_von}</td></tr>
        </table>
    </div>"""

    @staticmethod
    def _build_chapter_zusammenfassung(gesamt: int, abgeschlossen: int,
                                        offen: int, stichhaltig: int,
                                        nicht_stichhaltig: int,
                                        avg_days: float) -> str:
        """Build Chapter 1: Summary."""
        pc = HinschgPDFReport.PRIMARY_COLOR
        gc = HinschgPDFReport.SUCCESS_COLOR
        wc = HinschgPDFReport.WARNING_COLOR
        sc = HinschgPDFReport.SECONDARY_COLOR

        avg_display = f"{avg_days:.0f}" if avg_days else "n/a"

        return f"""
    <h2>1. Zusammenfassung</h2>

    <table class="kpi-table">
        <tr>
            <td>
                <span class="kpi-number" style="color: {pc};">{gesamt}</span>
                <span class="kpi-label">Meldungen gesamt</span>
            </td>
            <td>
                <span class="kpi-number" style="color: {gc};">{abgeschlossen}</span>
                <span class="kpi-label">Abgeschlossen</span>
            </td>
            <td>
                <span class="kpi-number" style="color: {wc};">{offen}</span>
                <span class="kpi-label">Offen</span>
            </td>
            <td>
                <span class="kpi-number" style="color: {sc};">{avg_display}</span>
                <span class="kpi-label">&#8960; Bearbeitungstage</span>
            </td>
        </tr>
    </table>

    <table class="data-table">
        <thead>
            <tr>
                <th>Kennzahl</th>
                <th style="text-align: right;">Anzahl</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Gesamtzahl eingegangener Meldungen</td>
                <td class="number-cell">{gesamt}</td>
            </tr>
            <tr>
                <td>Abgeschlossene Faelle</td>
                <td class="number-cell">{abgeschlossen}</td>
            </tr>
            <tr>
                <td>Offene Faelle</td>
                <td class="number-cell">{offen}</td>
            </tr>
            <tr>
                <td>Stichhaltige Meldungen</td>
                <td class="number-cell">{stichhaltig}</td>
            </tr>
            <tr>
                <td>Nicht stichhaltige Meldungen</td>
                <td class="number-cell">{nicht_stichhaltig}</td>
            </tr>
            <tr>
                <td>Durchschnittliche Bearbeitungszeit</td>
                <td class="number-cell">{avg_display} Tage</td>
            </tr>
        </tbody>
    </table>"""

    @staticmethod
    def _build_chapter_kategorien(kategorien: Dict[str, int]) -> str:
        """Build Chapter 2: Reports by Category."""
        if not kategorien:
            return """
    <h2>2. Meldungen nach Kategorie</h2>
    <p>Im Berichtszeitraum wurden keine Meldungen erfasst.</p>"""

        total = sum(kategorien.values()) or 1
        rows = []
        # Sort by count descending
        sorted_kats = sorted(kategorien.items(), key=lambda x: x[1], reverse=True)
        for kat, count in sorted_kats:
            label = HinschgPDFReport.KATEGORIE_LABELS.get(kat, kat.replace('_', ' ').title())
            pct = (count / total) * 100
            rows.append(
                f'<tr><td>{label}</td>'
                f'<td class="number-cell">{count}</td>'
                f'<td class="number-cell">{pct:.1f}%</td></tr>'
            )

        rows_html = "\n            ".join(rows)

        return f"""
    <h2>2. Meldungen nach Kategorie</h2>

    <table class="data-table">
        <thead>
            <tr>
                <th>Kategorie</th>
                <th style="text-align: right;">Anzahl</th>
                <th style="text-align: right;">Anteil</th>
            </tr>
        </thead>
        <tbody>
            {rows_html}
        </tbody>
    </table>"""

    @staticmethod
    def _build_chapter_status(status_verteilung: Dict[str, int]) -> str:
        """Build Chapter 3: Reports by Status."""
        if not status_verteilung:
            return """
    <h2>3. Meldungen nach Status</h2>
    <p>Keine Statusverteilung verfuegbar.</p>"""

        rows = []
        for status, count in status_verteilung.items():
            label = HinschgPDFReport.STATUS_LABELS.get(status, status.replace('_', ' ').title())
            rows.append(
                f'<tr><td>{label}</td>'
                f'<td class="number-cell">{count}</td></tr>'
            )

        rows_html = "\n            ".join(rows)

        return f"""
    <h2>3. Meldungen nach Status</h2>

    <table class="data-table">
        <thead>
            <tr>
                <th>Status</th>
                <th style="text-align: right;">Anzahl</th>
            </tr>
        </thead>
        <tbody>
            {rows_html}
        </tbody>
    </table>"""

    @staticmethod
    def _build_chapter_fristen(eingehalten: int, versaeumt: int,
                                fristverstoesse_7t: int,
                                fristverstoesse_3m: int) -> str:
        """Build Chapter 4: Deadline Overview."""
        total = eingehalten + versaeumt
        if total == 0:
            pct_ok = 100
            pct_fail = 0
        else:
            pct_ok = (eingehalten / total) * 100
            pct_fail = (versaeumt / total) * 100

        gc = HinschgPDFReport.SUCCESS_COLOR
        ac = HinschgPDFReport.ACCENT_COLOR

        return f"""
    <h2>4. Fristenuebersicht</h2>

    <h3>Gesamtuebersicht Fristen</h3>

    <div class="bar-container">
        <div class="bar-fill bar-success" style="width: {pct_ok}%;"></div>
        <div class="bar-fill bar-danger" style="width: {pct_fail}%;"></div>
    </div>
    <p style="font-size: 10pt; color: #666666;">
        <span style="color: {gc};">&#9632;</span> Eingehalten: {eingehalten} ({pct_ok:.1f}%)
        &nbsp;&nbsp;&nbsp;
        <span style="color: {ac};">&#9632;</span> Versaeumt: {versaeumt} ({pct_fail:.1f}%)
    </p>

    <table class="data-table">
        <thead>
            <tr>
                <th>Frist-Typ</th>
                <th style="text-align: right;">Verstoesse</th>
                <th>Gesetzliche Grundlage</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Eingangsbestaetigung (7 Tage)</td>
                <td class="number-cell">{fristverstoesse_7t}</td>
                <td>&sect;8 Abs. 1 S. 1 HinSchG</td>
            </tr>
            <tr>
                <td>Rueckmeldung (3 Monate)</td>
                <td class="number-cell">{fristverstoesse_3m}</td>
                <td>&sect;8 Abs. 1 S. 3 HinSchG</td>
            </tr>
        </tbody>
    </table>

    <p style="font-size: 10pt; margin-top: 10px;">
        Gesamtzahl ueberwachter Fristen: <strong>{total}</strong>
    </p>"""

    @staticmethod
    def _build_chapter_massnahmen(massnahmen: List[str]) -> str:
        """Build Chapter 5: Measures Taken."""
        if not massnahmen:
            return """
    <h2>5. Ergriffene Massnahmen</h2>
    <p>Im Berichtszeitraum wurden keine spezifischen Folgemassnahmen dokumentiert.</p>"""

        items = "\n        ".join(f"<li>{m}</li>" for m in massnahmen)

        return f"""
    <h2>5. Ergriffene Massnahmen</h2>

    <p>Im Berichtszeitraum wurden folgende Folgemassnahmen ergriffen bzw. eingeleitet:</p>

    <ul class="massnahmen-list">
        {items}
    </ul>"""

    @staticmethod
    def render_to_pdf(html_content: str, output_path: Optional[str] = None) -> bytes:
        """
        Render HTML report to PDF using wkhtmltopdf.

        :param html_content: Complete HTML string from generate_compliance_report()
        :param output_path: Optional path to save the PDF file
        :return: PDF content as bytes
        """
        with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False,
                                          encoding='utf-8') as html_file:
            html_file.write(html_content)
            html_path = html_file.name

        if output_path is None:
            pdf_fd, pdf_path = tempfile.mkstemp(suffix='.pdf')
            os.close(pdf_fd)
        else:
            pdf_path = output_path

        try:
            cmd = [
                'wkhtmltopdf',
                '--encoding', 'utf-8',
                '--page-size', 'A4',
                '--margin-top', '20mm',
                '--margin-bottom', '25mm',
                '--margin-left', '15mm',
                '--margin-right', '15mm',
                '--footer-center', 'Seite [page] von [topage]',
                '--footer-font-size', '8',
                '--footer-spacing', '5',
                '--enable-local-file-access',
                '--quiet',
                html_path,
                pdf_path,
            ]

            result = subprocess.run(cmd, capture_output=True, timeout=60)

            if result.returncode != 0:
                error_msg = result.stderr.decode('utf-8', errors='replace')
                raise RuntimeError(
                    f"wkhtmltopdf failed with return code {result.returncode}: {error_msg}"
                )

            with open(pdf_path, 'rb') as f:
                pdf_bytes = f.read()

            return pdf_bytes

        finally:
            # Clean up temp files
            try:
                os.unlink(html_path)
            except OSError:
                pass
            if output_path is None:
                try:
                    os.unlink(pdf_path)
                except OSError:
                    pass
