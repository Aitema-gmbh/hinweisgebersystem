"""
HinSchG Compliance Service for aitema|Hinweis

Implements all legal requirements from the German Whistleblower Protection Act:
- §8: Deadline management (7 days confirmation, 3 months feedback)
- §11: Documentation and retention (3 years after case closure)
- §15: Ombudsperson management
- §16: Multi-channel reporting
- §17: Case processing workflow  
- §27: Compliance reporting
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any

from globaleaks.models.hinschg import (
    HinweisCase, HinweisCaseHistory, HinweisFrist,
    OmbudspersonConfig, HinschgReport,
    FallStatus, HinweisKategorie, FallPrioritaet
)
from globaleaks.orm import transact, db_get, db_del, tw
from globaleaks.utils.utility import datetime_now
from globaleaks.utils.log import log


# ============================================================
# Aktenzeichen Generator
# ============================================================

def generate_aktenzeichen(tid: int, year: int, sequence: int) -> str:
    """
    Generate a German-standard case reference number.
    Format: HIN-{TenantID}-{Year}-{Sequence:05d}
    Example: HIN-001-2026-00042
    """
    return f"HIN-{tid:03d}-{year}-{sequence:05d}"


@transact
def get_next_aktenzeichen(session, tid: int) -> str:
    """Get next sequential Aktenzeichen for a tenant."""
    year = datetime.now().year
    count = session.query(HinweisCase).filter(
        HinweisCase.tid == tid,
        HinweisCase.aktenzeichen.like(f"HIN-{tid:03d}-{year}-%")
    ).count()
    return generate_aktenzeichen(tid, year, count + 1)


# ============================================================
# Case Creation with Automatic Deadline Setup
# ============================================================

@transact
def create_hinweis_case(session, tid: int, internaltip_id: str,
                        kategorie: str = 'sonstiges',
                        meldekanal: str = 'online',
                        ombudsperson_id: Optional[str] = None) -> Dict:
    """
    Create a new HinSchG case with automatic deadline calculation.
    
    Automatically sets:
    - 7-day confirmation deadline (§8 Abs. 1 S. 1)
    - 3-month feedback deadline (§8 Abs. 1 S. 3)
    - Assigns default Ombudsperson if configured
    """
    now = datetime_now()
    year = now.year
    
    # Get next Aktenzeichen
    count = session.query(HinweisCase).filter(
        HinweisCase.tid == tid,
        HinweisCase.aktenzeichen.like(f"HIN-{tid:03d}-{year}-%")
    ).count()
    aktenzeichen = generate_aktenzeichen(tid, year, count + 1)
    
    # Calculate deadlines
    frist_7_tage = now + timedelta(days=7)
    frist_3_monate = now + timedelta(days=90)  # ~3 months
    
    # Auto-assign Ombudsperson if not specified
    if ombudsperson_id is None:
        default_ombuds = session.query(OmbudspersonConfig).filter(
            OmbudspersonConfig.tid == tid,
            OmbudspersonConfig.aktiv == True
        ).first()
        if default_ombuds:
            ombudsperson_id = default_ombuds.user_id
    
    # Create the case
    case = HinweisCase({
        'tid': tid,
        'internaltip_id': internaltip_id,
        'aktenzeichen': aktenzeichen,
        'kategorie': kategorie,
        'status': FallStatus.EINGEGANGEN.value,
        'prioritaet': FallPrioritaet.MITTEL.value,
        'meldekanal': meldekanal,
        'eingangsdatum': now,
        'eingangsbestaetigung_frist': frist_7_tage,
        'rueckmeldung_frist': frist_3_monate,
        'ombudsperson_id': ombudsperson_id,
        'created_at': now,
        'updated_at': now,
    })
    session.add(case)
    session.flush()
    
    # Create deadline tracking entries
    fristen = [
        HinweisFrist({
            'tid': tid,
            'case_id': case.id,
            'frist_typ': 'eingangsbestaetigung_7t',
            'frist_datum': frist_7_tage,
            'created_at': now,
        }),
        HinweisFrist({
            'tid': tid,
            'case_id': case.id,
            'frist_typ': 'rueckmeldung_3m',
            'frist_datum': frist_3_monate,
            'created_at': now,
        }),
    ]
    for f in fristen:
        session.add(f)
    
    # Create initial history entry
    history = HinweisCaseHistory({
        'tid': tid,
        'case_id': case.id,
        'neuer_status': FallStatus.EINGEGANGEN.value,
        'aktion': 'case_created',
        'kommentar': f'Meldung eingegangen via {meldekanal}. Aktenzeichen: {aktenzeichen}',
        'created_at': now,
    })
    session.add(history)
    
    log.info("HinSchG case created: %s (Tenant %d)", aktenzeichen, tid)
    
    return serialize_hinweis_case(case)


# ============================================================
# Status Transitions
# ============================================================

VALID_TRANSITIONS = {
    FallStatus.EINGEGANGEN.value: [
        FallStatus.EINGANGSBESTAETIGUNG.value,
    ],
    FallStatus.EINGANGSBESTAETIGUNG.value: [
        FallStatus.IN_PRUEFUNG.value,
    ],
    FallStatus.IN_PRUEFUNG.value: [
        FallStatus.IN_BEARBEITUNG.value,
        FallStatus.ABGESCHLOSSEN.value,  # Nicht stichhaltig
    ],
    FallStatus.IN_BEARBEITUNG.value: [
        FallStatus.FOLGEMANAHME.value,
        FallStatus.RUECKMELDUNG.value,
    ],
    FallStatus.FOLGEMANAHME.value: [
        FallStatus.RUECKMELDUNG.value,
        FallStatus.ABGESCHLOSSEN.value,
    ],
    FallStatus.RUECKMELDUNG.value: [
        FallStatus.ABGESCHLOSSEN.value,
        FallStatus.IN_BEARBEITUNG.value,  # Wiederaufnahme
    ],
    FallStatus.ABGESCHLOSSEN.value: [
        FallStatus.ARCHIVIERT.value,
        FallStatus.IN_BEARBEITUNG.value,  # Wiederaufnahme
    ],
}


@transact
def update_case_status(session, tid: int, case_id: str,
                       neuer_status: str, user_id: str,
                       kommentar: str = '',
                       begruendung: str = '') -> Dict:
    """
    Update case status with validation and audit trail.
    Enforces valid status transitions per HinSchG workflow.
    """
    case = session.query(HinweisCase).filter(
        HinweisCase.tid == tid,
        HinweisCase.id == case_id
    ).one()
    
    alter_status = case.status
    now = datetime_now()
    
    # Validate transition
    allowed = VALID_TRANSITIONS.get(alter_status, [])
    if neuer_status not in allowed:
        raise ValueError(
            f"Ungueltiger Statusuebergang: {alter_status} -> {neuer_status}. "
            f"Erlaubt: {allowed}"
        )
    
    # Update case
    case.status = neuer_status
    case.updated_at = now
    
    # Handle specific transitions
    if neuer_status == FallStatus.EINGANGSBESTAETIGUNG.value:
        case.eingangsbestaetigung_datum = now
        # Mark 7-day deadline as completed
        _mark_frist_erledigt(session, tid, case_id, 'eingangsbestaetigung_7t', now)
    
    elif neuer_status == FallStatus.RUECKMELDUNG.value:
        case.rueckmeldung_datum = now
        # Mark 3-month deadline as completed
        _mark_frist_erledigt(session, tid, case_id, 'rueckmeldung_3m', now)
    
    elif neuer_status == FallStatus.ABGESCHLOSSEN.value:
        case.abschluss_datum = now
        case.begruendung = begruendung
        # Set archiving deadline: 3 years after closure (§11 Abs. 1)
        archivierung = now + timedelta(days=3*365)
        case.archivierung_datum = archivierung
        case.loeschung_datum = archivierung
        
        # Create archiving deadline
        frist = HinweisFrist({
            'tid': tid,
            'case_id': case_id,
            'frist_typ': 'archivierung_3j',
            'frist_datum': archivierung,
            'created_at': now,
        })
        session.add(frist)
    
    elif neuer_status == FallStatus.ARCHIVIERT.value:
        # Create deletion deadline
        loeschung = now + timedelta(days=30)  # 30 days grace period
        case.loeschung_datum = loeschung
        frist = HinweisFrist({
            'tid': tid,
            'case_id': case_id,
            'frist_typ': 'loeschung',
            'frist_datum': loeschung,
            'created_at': now,
        })
        session.add(frist)
    
    # Audit trail
    history = HinweisCaseHistory({
        'tid': tid,
        'case_id': case_id,
        'user_id': user_id,
        'alter_status': alter_status,
        'neuer_status': neuer_status,
        'kommentar': kommentar,
        'aktion': 'status_change',
        'created_at': now,
    })
    session.add(history)
    
    log.info("HinSchG case %s: %s -> %s (User %s)",
             case.aktenzeichen, alter_status, neuer_status, user_id)
    
    return serialize_hinweis_case(case)


def _mark_frist_erledigt(session, tid, case_id, frist_typ, now):
    """Mark a deadline as completed."""
    frist = session.query(HinweisFrist).filter(
        HinweisFrist.tid == tid,
        HinweisFrist.case_id == case_id,
        HinweisFrist.frist_typ == frist_typ,
        HinweisFrist.erledigt == False
    ).first()
    if frist:
        frist.erledigt = True
        frist.erledigt_datum = now


# ============================================================
# Deadline Monitoring (Cron Job)
# ============================================================

@transact
def check_deadlines(session) -> List[Dict]:
    """
    Check all open deadlines across all tenants.
    Called periodically by the scheduler.
    
    Returns list of overdue/upcoming deadlines for notification.
    """
    now = datetime_now()
    warnings = []
    
    # Find overdue deadlines
    overdue = session.query(HinweisFrist).filter(
        HinweisFrist.erledigt == False,
        HinweisFrist.frist_datum < now,
        HinweisFrist.eskaliert == False
    ).all()
    
    for frist in overdue:
        case = session.query(HinweisCase).filter(
            HinweisCase.id == frist.case_id
        ).first()
        
        if case:
            frist.eskaliert = True
            warnings.append({
                'type': 'overdue',
                'tid': frist.tid,
                'case_id': frist.case_id,
                'aktenzeichen': case.aktenzeichen,
                'frist_typ': frist.frist_typ,
                'frist_datum': frist.frist_datum.isoformat(),
                'tage_ueberfaellig': (now - frist.frist_datum).days,
                'ombudsperson_id': case.ombudsperson_id,
            })
            
            log.warning(
                "HinSchG FRISTVERSAEUMNIS: %s - %s (%d Tage ueberfaellig)",
                case.aktenzeichen, frist.frist_typ,
                (now - frist.frist_datum).days
            )
    
    # Find upcoming deadlines (within 2 days)
    upcoming = session.query(HinweisFrist).filter(
        HinweisFrist.erledigt == False,
        HinweisFrist.frist_datum > now,
        HinweisFrist.frist_datum < now + timedelta(days=2),
        HinweisFrist.erinnerung_gesendet == False
    ).all()
    
    for frist in upcoming:
        case = session.query(HinweisCase).filter(
            HinweisCase.id == frist.case_id
        ).first()
        
        if case:
            frist.erinnerung_gesendet = True
            warnings.append({
                'type': 'upcoming',
                'tid': frist.tid,
                'case_id': frist.case_id,
                'aktenzeichen': case.aktenzeichen,
                'frist_typ': frist.frist_typ,
                'frist_datum': frist.frist_datum.isoformat(),
                'tage_verbleibend': (frist.frist_datum - now).days,
                'ombudsperson_id': case.ombudsperson_id,
            })
    
    return warnings


# ============================================================
# Compliance Reporting (§27)
# ============================================================

@transact
def generate_compliance_report(session, tid: int,
                               von: datetime, bis: datetime,
                               erstellt_von: str) -> Dict:
    """
    Generate a HinSchG compliance report for a given period.
    §27 Abs. 1: Required for annual reporting to management.
    """
    cases = session.query(HinweisCase).filter(
        HinweisCase.tid == tid,
        HinweisCase.eingangsdatum >= von,
        HinweisCase.eingangsdatum <= bis
    ).all()
    
    gesamt = len(cases)
    stichhaltig = sum(1 for c in cases if c.stichhaltig is True)
    nicht_stichhaltig = sum(1 for c in cases if c.stichhaltig is False)
    offen = sum(1 for c in cases if c.status not in [
        FallStatus.ABGESCHLOSSEN.value, FallStatus.ARCHIVIERT.value
    ])
    abgeschlossen = sum(1 for c in cases if c.status in [
        FallStatus.ABGESCHLOSSEN.value, FallStatus.ARCHIVIERT.value
    ])
    
    # Calculate average processing time
    bearbeitungszeiten = []
    for c in cases:
        if c.abschluss_datum and c.eingangsdatum:
            delta = (c.abschluss_datum - c.eingangsdatum).days
            bearbeitungszeiten.append(delta)
    
    avg_days = sum(bearbeitungszeiten) / len(bearbeitungszeiten) if bearbeitungszeiten else 0
    
    # Count deadline violations
    fristen_7t = session.query(HinweisFrist).join(
        HinweisCase, HinweisCase.id == HinweisFrist.case_id
    ).filter(
        HinweisCase.tid == tid,
        HinweisCase.eingangsdatum >= von,
        HinweisCase.eingangsdatum <= bis,
        HinweisFrist.frist_typ == 'eingangsbestaetigung_7t',
        HinweisFrist.eskaliert == True
    ).count()
    
    fristen_3m = session.query(HinweisFrist).join(
        HinweisCase, HinweisCase.id == HinweisFrist.case_id
    ).filter(
        HinweisCase.tid == tid,
        HinweisCase.eingangsdatum >= von,
        HinweisCase.eingangsdatum <= bis,
        HinweisFrist.frist_typ == 'rueckmeldung_3m',
        HinweisFrist.eskaliert == True
    ).count()
    
    # Category distribution
    kategorien = {}
    for c in cases:
        kat = c.kategorie or 'sonstiges'
        kategorien[kat] = kategorien.get(kat, 0) + 1
    
    # Create report
    report = HinschgReport({
        'tid': tid,
        'berichtszeitraum_von': von,
        'berichtszeitraum_bis': bis,
        'gesamt_meldungen': gesamt,
        'stichhaltige_meldungen': stichhaltig,
        'nicht_stichhaltige_meldungen': nicht_stichhaltig,
        'offene_faelle': offen,
        'abgeschlossene_faelle': abgeschlossen,
        'durchschnittliche_bearbeitungszeit_tage': avg_days,
        'fristverstoesse_7t': fristen_7t,
        'fristverstoesse_3m': fristen_3m,
        'kategorien_verteilung': kategorien,
        'erstellt_von': erstellt_von,
    })
    session.add(report)
    
    log.info("HinSchG Compliance Report generated for Tenant %d (%s - %s)",
             tid, von.isoformat(), bis.isoformat())
    
    return serialize_hinschg_report(report)


# ============================================================
# Data Retention (§11)
# ============================================================

@transact
def cleanup_expired_cases(session) -> int:
    """
    Delete cases past their retention period.
    §11 Abs. 1 HinSchG: Documentation must be deleted 3 years 
    after case closure, unless ongoing proceedings require retention.
    """
    now = datetime_now()
    deleted = 0
    
    expired = session.query(HinweisCase).filter(
        HinweisCase.status == FallStatus.ARCHIVIERT.value,
        HinweisCase.loeschung_datum <= now
    ).all()
    
    for case in expired:
        # Delete all related records
        session.query(HinweisCaseHistory).filter(
            HinweisCaseHistory.case_id == case.id
        ).delete()
        session.query(HinweisFrist).filter(
            HinweisFrist.case_id == case.id
        ).delete()
        
        log.info("HinSchG case %s: Geloescht nach Ablauf der Aufbewahrungsfrist",
                 case.aktenzeichen)
        
        session.delete(case)
        deleted += 1
    
    if deleted > 0:
        log.info("HinSchG cleanup: %d Faelle nach §11 Abs. 1 geloescht", deleted)
    
    return deleted


# ============================================================
# Serializers
# ============================================================

def serialize_hinweis_case(case) -> Dict:
    """Serialize a HinweisCase to dict."""
    return {
        'id': case.id,
        'tid': case.tid,
        'internaltip_id': case.internaltip_id,
        'aktenzeichen': case.aktenzeichen,
        'kategorie': case.kategorie,
        'status': case.status,
        'prioritaet': case.prioritaet,
        'meldekanal': case.meldekanal,
        'eingangsdatum': case.eingangsdatum.isoformat() if case.eingangsdatum else None,
        'eingangsbestaetigung_datum': case.eingangsbestaetigung_datum.isoformat() if case.eingangsbestaetigung_datum else None,
        'eingangsbestaetigung_frist': case.eingangsbestaetigung_frist.isoformat() if case.eingangsbestaetigung_frist else None,
        'rueckmeldung_frist': case.rueckmeldung_frist.isoformat() if case.rueckmeldung_frist else None,
        'rueckmeldung_datum': case.rueckmeldung_datum.isoformat() if case.rueckmeldung_datum else None,
        'abschluss_datum': case.abschluss_datum.isoformat() if case.abschluss_datum else None,
        'ombudsperson_id': case.ombudsperson_id,
        'fallbearbeiter_id': case.fallbearbeiter_id,
        'stichhaltig': case.stichhaltig,
        'folgemassnahme_beschreibung': case.folgemassnahme_beschreibung,
        'begruendung': case.begruendung,
        'created_at': case.created_at.isoformat() if case.created_at else None,
        'updated_at': case.updated_at.isoformat() if case.updated_at else None,
    }


def serialize_hinschg_report(report) -> Dict:
    """Serialize a HinschgReport to dict."""
    return {
        'id': report.id,
        'tid': report.tid,
        'berichtszeitraum_von': report.berichtszeitraum_von.isoformat(),
        'berichtszeitraum_bis': report.berichtszeitraum_bis.isoformat(),
        'gesamt_meldungen': report.gesamt_meldungen,
        'stichhaltige_meldungen': report.stichhaltige_meldungen,
        'nicht_stichhaltige_meldungen': report.nicht_stichhaltige_meldungen,
        'offene_faelle': report.offene_faelle,
        'abgeschlossene_faelle': report.abgeschlossene_faelle,
        'durchschnittliche_bearbeitungszeit_tage': report.durchschnittliche_bearbeitungszeit_tage,
        'fristverstoesse_7t': report.fristverstoesse_7t,
        'fristverstoesse_3m': report.fristverstoesse_3m,
        'kategorien_verteilung': report.kategorien_verteilung,
        'erstellt_von': report.erstellt_von,
        'created_at': report.created_at.isoformat() if report.created_at else None,
    }
