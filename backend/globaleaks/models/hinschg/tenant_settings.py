"""HinSchG Tenant Settings Model"""
from sqlalchemy import Column, Integer, JSON, Unicode, DateTime, Boolean
from globaleaks.models import Model
from globaleaks.utils.utility import datetime_now


class HinschgTenantSettings(Model):
    """Per-tenant HinSchG configuration stored as JSON."""
    __tablename__ = 'hinschg_tenant_settings'
    
    id = Column(Integer, primary_key=True)
    tid = Column(Integer, nullable=False, unique=True)
    config_json = Column(JSON, default=dict)
    kommune_name = Column(Unicode(256), default='')
    kommune_ags = Column(Unicode(12), default='')  # Amtlicher Gemeindeschluessel
    kommune_typ = Column(Unicode(64), default='')  # stadt, gemeinde, kreis, verband
    meldestelle_typ = Column(Unicode(32), default='intern')  # intern, extern, gemeinsam
    meldestelle_name = Column(Unicode(256), default='Interne Meldestelle')
    
    # Branding
    logo_data = Column(Unicode, default='')  # Base64 encoded logo
    primary_color = Column(Unicode(7), default='#1e3a5f')
    secondary_color = Column(Unicode(7), default='#4a90d9')
    
    # Feature Flags
    anonyme_meldungen_aktiv = Column(Boolean, default=True)
    telefon_kanal_aktiv = Column(Boolean, default=True)
    post_kanal_aktiv = Column(Boolean, default=True)
    persoenlich_kanal_aktiv = Column(Boolean, default=True)
    
    # Audit
    created_at = Column(DateTime, default=datetime_now)
    updated_at = Column(DateTime, default=datetime_now, onupdate=datetime_now)
