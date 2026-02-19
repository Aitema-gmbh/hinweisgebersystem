"""
HinSchG (Hinweisgeberschutzgesetz) Models for aitema|Hinweis

These models extend GlobaLeaks with German Whistleblower Protection Act
compliance features including:
- Deadline management (§8 HinSchG: 7 days confirmation, 3 months feedback)
- Case management with status workflow
- Ombudsperson role management
- Audit trail for compliance reporting
"""
from datetime import datetime, timedelta
from enum import Enum as PyEnum

from globaleaks.models import Model, Base
from globaleaks.models.properties import *
from globaleaks.utils.utility import datetime_now


# ============================================================
# HinSchG Status Enums
# ============================================================

class HinweisKategorie(PyEnum):
    """§2 HinSchG - Sachlicher Anwendungsbereich"""
    STRAFTAT = "straftat"
    ORDNUNGSWIDRIGKEIT = "ordnungswidrigkeit"  
    VERSTOSS_EU_RECHT = "verstoss_eu_recht"
    VERSTOSS_BUNDESRECHT = "verstoss_bundesrecht"
    VERSTOSS_LANDESRECHT = "verstoss_landesrecht"
    ARBEITSSCHUTZ = "arbeitsschutz"
    UMWELTSCHUTZ = "umweltschutz"
    VERBRAUCHERSCHUTZ = "verbraucherschutz"
    DATENSCHUTZ = "datenschutz"
    KORRUPTION = "korruption"
    GELDWAESCHE = "geldwaesche"
    STEUERBETRUG = "steuerbetrug"
    SONSTIGES = "sonstiges"


class FallStatus(PyEnum):
    """Case status workflow per HinSchG §17"""
    EINGEGANGEN = "eingegangen"          # Meldung eingegangen
    EINGANGSBESTAETIGUNG = "eingangsbestaetigung"  # 7-Tage-Frist: Bestaetigung versendet
    IN_PRUEFUNG = "in_pruefung"          # Stichhaltigkeitspruefung
    IN_BEARBEITUNG = "in_bearbeitung"    # Aktive Untersuchung
    FOLGEMANAHME = "folgemassnahme"     # Folgemassnahmen eingeleitet
    RUECKMELDUNG = "rueckmeldung"        # 3-Monate-Frist: Rueckmeldung an Melder
    ABGESCHLOSSEN = "abgeschlossen"      # Fall abgeschlossen
    ARCHIVIERT = "archiviert"            # Aufbewahrungsfrist (3 Jahre, §11)


class FallPrioritaet(PyEnum):
    NIEDRIG = "niedrig"
    MITTEL = "mittel"
    HOCH = "hoch"
    KRITISCH = "kritisch"


class MeldeKanal(PyEnum):
    """§16 HinSchG - Meldekanal"""
    ONLINE = "online"           # Elektronisches Meldesystem
    TELEFONISCH = "telefonisch" # Telefonische Meldung
    PERSOENLICH = "persoenlich" # Persoenliche Zusammenkunft
    BRIEFPOST = "briefpost"     # Schriftliche Meldung


# ============================================================
# HinSchG Extended Models
# ============================================================

class _HinweisCase(Model):
    """
    Extended case model for HinSchG compliance.
    Links to GlobaLeaks InternalTip but adds German legal requirements.
    """
    __tablename__ = 'hinschg_case'
    
    properties = [
        'id', 'tid', 'internaltip_id', 'aktenzeichen',
        'kategorie', 'status', 'prioritaet', 'meldekanal',
        'eingangsdatum', 'eingangsbestaetigung_datum',
        'eingangsbestaetigung_frist', 'rueckmeldung_frist',
        'rueckmeldung_datum', 'abschluss_datum',
        'archivierung_datum', 'loeschung_datum',
        'ombudsperson_id', 'fallbearbeiter_id',
        'stichhaltig', 'folgemassnahme_beschreibung',
        'begruendung', 'created_at', 'updated_at'
    ]
    
    # Primary key
    id = Column(UnicodeText, primary_key=True, default=uuid4)
    
    # Tenant reference (Multi-Tenant)
    tid = Column(Integer, default=1, nullable=False)
    
    # Link to GlobaLeaks InternalTip
    internaltip_id = Column(UnicodeText, nullable=False)
    
    # German case reference number (Aktenzeichen)
    aktenzeichen = Column(UnicodeText, nullable=False)
    
    # HinSchG classification
    kategorie = Column(UnicodeText, default='sonstiges')
    status = Column(UnicodeText, default='eingegangen')
    prioritaet = Column(UnicodeText, default='mittel')
    meldekanal = Column(UnicodeText, default='online')
    
    # ============================================================
    # HinSchG Deadline Management (CRITICAL)
    # ============================================================
    
    # §8 Abs. 1: Eingang der Meldung
    eingangsdatum = Column(DateTime, default=datetime_now)
    
    # §8 Abs. 1 S. 1: Eingangsbestaetigung innerhalb von 7 Tagen
    eingangsbestaetigung_datum = Column(DateTime, nullable=True)
    eingangsbestaetigung_frist = Column(DateTime, nullable=True)
    
    # §8 Abs. 1 S. 3: Rueckmeldung innerhalb von 3 Monaten
    rueckmeldung_frist = Column(DateTime, nullable=True)
    rueckmeldung_datum = Column(DateTime, nullable=True)
    
    # Abschluss und Archivierung
    abschluss_datum = Column(DateTime, nullable=True)
    
    # §11 Abs. 1: Dokumentation 3 Jahre nach Abschluss loeschen
    archivierung_datum = Column(DateTime, nullable=True)
    loeschung_datum = Column(DateTime, nullable=True)
    
    # ============================================================
    # Case Assignment
    # ============================================================
    
    # §15: Zustaendige Ombudsperson
    ombudsperson_id = Column(UnicodeText, nullable=True)
    
    # Fallbearbeiter (kann auch Ombudsperson sein)
    fallbearbeiter_id = Column(UnicodeText, nullable=True)
    
    # ============================================================
    # Case Processing
    # ============================================================
    
    # §17 Abs. 1: Stichhaltigkeitspruefung
    stichhaltig = Column(Boolean, nullable=True)  # None = noch nicht geprueft
    
    # §18: Folgemassnahmen
    folgemassnahme_beschreibung = Column(UnicodeText, default='')
    
    # Begruendung (bei Abschluss/Ablehnung)
    begruendung = Column(UnicodeText, default='')
    
    # Timestamps
    created_at = Column(DateTime, default=datetime_now)
    updated_at = Column(DateTime, default=datetime_now)
    
    unicode_keys = [
        'aktenzeichen', 'kategorie', 'status', 'prioritaet',
        'meldekanal', 'folgemassnahme_beschreibung', 'begruendung'
    ]
    
    bool_keys = ['stichhaltig']


class HinweisCase(_HinweisCase, Base):
    pass


class _HinweisCaseHistory(Model):
    """
    Audit trail for case status changes.
    Required for §11 HinSchG documentation obligations.
    """
    __tablename__ = 'hinschg_case_history'
    
    properties = [
        'id', 'tid', 'case_id', 'user_id',
        'alter_status', 'neuer_status', 'kommentar',
        'aktion', 'created_at'
    ]
    
    id = Column(UnicodeText, primary_key=True, default=uuid4)
    tid = Column(Integer, default=1, nullable=False)
    case_id = Column(UnicodeText, nullable=False)
    user_id = Column(UnicodeText, nullable=True)
    alter_status = Column(UnicodeText, nullable=True)
    neuer_status = Column(UnicodeText, nullable=False)
    kommentar = Column(UnicodeText, default='')
    aktion = Column(UnicodeText, nullable=False)  # e.g., 'status_change', 'assignment', 'deadline_extension'
    created_at = Column(DateTime, default=datetime_now)
    
    unicode_keys = ['alter_status', 'neuer_status', 'kommentar', 'aktion']


class HinweisCaseHistory(_HinweisCaseHistory, Base):
    pass


class _HinweisFrist(Model):
    """
    Deadline tracking model.
    Manages all HinSchG-mandated deadlines with notifications.
    """
    __tablename__ = 'hinschg_frist'
    
    properties = [
        'id', 'tid', 'case_id', 'frist_typ',
        'frist_datum', 'erledigt', 'erledigt_datum',
        'erinnerung_gesendet', 'eskaliert',
        'created_at'
    ]
    
    id = Column(UnicodeText, primary_key=True, default=uuid4)
    tid = Column(Integer, default=1, nullable=False)
    case_id = Column(UnicodeText, nullable=False)
    
    # Type: 'eingangsbestaetigung_7t', 'rueckmeldung_3m', 'archivierung_3j', 'loeschung'
    frist_typ = Column(UnicodeText, nullable=False)
    frist_datum = Column(DateTime, nullable=False)
    
    erledigt = Column(Boolean, default=False)
    erledigt_datum = Column(DateTime, nullable=True)
    
    # Notification tracking
    erinnerung_gesendet = Column(Boolean, default=False)
    eskaliert = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime_now)
    
    unicode_keys = ['frist_typ']
    bool_keys = ['erledigt', 'erinnerung_gesendet', 'eskaliert']


class HinweisFrist(_HinweisFrist, Base):
    pass


class _OmbudspersonConfig(Model):
    """
    Configuration for the Ombudsperson per tenant.
    §15 HinSchG: Each organization must designate responsible persons.
    """
    __tablename__ = 'hinschg_ombudsperson_config'
    
    properties = [
        'id', 'tid', 'user_id', 'ist_extern',
        'organisation', 'qualifikation',
        'vertretung_user_id', 'aktiv',
        'created_at', 'updated_at'
    ]
    
    id = Column(UnicodeText, primary_key=True, default=uuid4)
    tid = Column(Integer, default=1, nullable=False)
    user_id = Column(UnicodeText, nullable=False)
    
    # §15 Abs. 1: Interne oder externe Meldestelle
    ist_extern = Column(Boolean, default=False)
    organisation = Column(UnicodeText, default='')
    qualifikation = Column(UnicodeText, default='')
    
    # Vertretungsregelung
    vertretung_user_id = Column(UnicodeText, nullable=True)
    
    aktiv = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime_now)
    updated_at = Column(DateTime, default=datetime_now)
    
    unicode_keys = ['organisation', 'qualifikation']
    bool_keys = ['ist_extern', 'aktiv']


class OmbudspersonConfig(_OmbudspersonConfig, Base):
    pass


class _HinschgReport(Model):
    """
    Annual reporting model for HinSchG compliance.
    §27 Abs. 1: Regular reporting to management.
    """
    __tablename__ = 'hinschg_report'
    
    properties = [
        'id', 'tid', 'berichtszeitraum_von', 'berichtszeitraum_bis',
        'gesamt_meldungen', 'stichhaltige_meldungen',
        'nicht_stichhaltige_meldungen', 'offene_faelle',
        'abgeschlossene_faelle', 'durchschnittliche_bearbeitungszeit_tage',
        'fristverstoesse_7t', 'fristverstoesse_3m',
        'kategorien_verteilung', 'erstellt_von',
        'created_at'
    ]
    
    id = Column(UnicodeText, primary_key=True, default=uuid4)
    tid = Column(Integer, default=1, nullable=False)
    
    berichtszeitraum_von = Column(DateTime, nullable=False)
    berichtszeitraum_bis = Column(DateTime, nullable=False)
    
    # Statistics
    gesamt_meldungen = Column(Integer, default=0)
    stichhaltige_meldungen = Column(Integer, default=0)
    nicht_stichhaltige_meldungen = Column(Integer, default=0)
    offene_faelle = Column(Integer, default=0)
    abgeschlossene_faelle = Column(Integer, default=0)
    durchschnittliche_bearbeitungszeit_tage = Column(Float, default=0.0)
    
    # Deadline violations
    fristverstoesse_7t = Column(Integer, default=0)
    fristverstoesse_3m = Column(Integer, default=0)
    
    # JSON: category distribution
    kategorien_verteilung = Column(JSON, default=dict)
    
    erstellt_von = Column(UnicodeText, nullable=True)
    created_at = Column(DateTime, default=datetime_now)
    
    int_keys = [
        'gesamt_meldungen', 'stichhaltige_meldungen',
        'nicht_stichhaltige_meldungen', 'offene_faelle',
        'abgeschlossene_faelle', 'fristverstoesse_7t', 'fristverstoesse_3m'
    ]


class HinschgReport(_HinschgReport, Base):
    pass
