"""
HinSchG Tenant Configuration Service

Each tenant (Kommune) can customize:
- Custom deadlines (within legal limits)
- Ombudsperson assignments
- Notification settings
- Branding/theme
- Meldekanal configuration
- Compliance reporting schedule
"""
from globaleaks.orm import transact
from globaleaks.utils.log import log


class TenantHinschgConfig:
    """Configuration model for per-tenant HinSchG settings."""
    
    # Legal minimum/maximum bounds
    FRIST_EINGANGSBESTAETIGUNG_MIN = 1  # days
    FRIST_EINGANGSBESTAETIGUNG_MAX = 7  # §8 Abs. 1: max 7 days
    FRIST_RUECKMELDUNG_MIN = 30  # days
    FRIST_RUECKMELDUNG_MAX = 90  # §8 Abs. 1: max ~3 months
    AUFBEWAHRUNGSFRIST_MIN = 3  # years, §11 Abs. 1
    AUFBEWAHRUNGSFRIST_MAX = 10  # years, extended with justification
    
    DEFAULT_CONFIG = {
        'frist_eingangsbestaetigung_tage': 7,
        'frist_rueckmeldung_tage': 90,
        'aufbewahrungsfrist_jahre': 3,
        'erinnerung_vor_frist_tage': 2,
        'eskalation_email': '',
        'melde_kanale': ['online', 'telefon', 'persoenlich', 'post'],
        'auto_aktenzeichen': True,
        'aktenzeichen_prefix': 'HIN',
        'compliance_report_auto': True,
        'compliance_report_schedule': 'yearly',  # yearly, quarterly
        'ombudsperson_rotation': False,
        'ombudsperson_rotation_interval_days': 90,
        'anonyme_meldungen': True,
        'vertraulichkeitshinweis_text': (
            'Ihre Meldung wird gemaess §8 HinSchG vertraulich behandelt. '
            'Die Identitaet des Hinweisgebers wird geschuetzt (§8 Abs. 1). '
        ),
        'datenschutz_text': (
            'Die Verarbeitung Ihrer Daten erfolgt auf Grundlage von §10 HinSchG '
            'i.V.m. Art. 6 Abs. 1 lit. c DSGVO. Daten werden nach §11 HinSchG '
            'fuer maximal 3 Jahre nach Abschluss des Verfahrens aufbewahrt.'
        ),
        'eingangsbestaetigung_template': (
            'Sehr geehrte/r Hinweisgeber/in,\n\n'
            'Ihre Meldung wurde unter dem Aktenzeichen {aktenzeichen} erfasst.\n'
            'Gemaess §8 Abs. 1 HinSchG bestaetigen wir den Eingang Ihrer Meldung.\n\n'
            'Wir werden Ihre Meldung sorgfaeltig pruefen und Ihnen innerhalb von '
            '3 Monaten eine Rueckmeldung zu den ergriffenen Massnahmen geben.\n\n'
            'Mit freundlichen Gruessen\n'
            'Interne Meldestelle {tenant_name}'
        ),
        'rueckmeldung_template': (
            'Sehr geehrte/r Hinweisgeber/in,\n\n'
            'zu Ihrer Meldung (Aktenzeichen: {aktenzeichen}) moechten wir Ihnen '
            'gemaess §8 Abs. 1 S. 3 HinSchG folgende Rueckmeldung geben:\n\n'
            '{rueckmeldung_text}\n\n'
            'Mit freundlichen Gruessen\n'
            'Interne Meldestelle {tenant_name}'
        ),
        'theme_primary_color': '#1e3a5f',
        'theme_secondary_color': '#4a90d9',
        'kommune_name': '',
        'kommune_logo_url': '',
        'kommune_website': '',
        'impressum_url': '',
        'datenschutz_url': '',
    }

    @staticmethod
    def validate_config(config: dict) -> dict:
        """Validate tenant configuration against legal bounds."""
        errors = {}
        
        if 'frist_eingangsbestaetigung_tage' in config:
            val = config['frist_eingangsbestaetigung_tage']
            if not (TenantHinschgConfig.FRIST_EINGANGSBESTAETIGUNG_MIN <= val <= TenantHinschgConfig.FRIST_EINGANGSBESTAETIGUNG_MAX):
                errors['frist_eingangsbestaetigung_tage'] = (
                    f'Muss zwischen {TenantHinschgConfig.FRIST_EINGANGSBESTAETIGUNG_MIN} und '
                    f'{TenantHinschgConfig.FRIST_EINGANGSBESTAETIGUNG_MAX} Tagen liegen (§8 HinSchG)'
                )
        
        if 'frist_rueckmeldung_tage' in config:
            val = config['frist_rueckmeldung_tage']
            if not (TenantHinschgConfig.FRIST_RUECKMELDUNG_MIN <= val <= TenantHinschgConfig.FRIST_RUECKMELDUNG_MAX):
                errors['frist_rueckmeldung_tage'] = (
                    f'Muss zwischen {TenantHinschgConfig.FRIST_RUECKMELDUNG_MIN} und '
                    f'{TenantHinschgConfig.FRIST_RUECKMELDUNG_MAX} Tagen liegen (§8 HinSchG)'
                )
        
        if 'aufbewahrungsfrist_jahre' in config:
            val = config['aufbewahrungsfrist_jahre']
            if not (TenantHinschgConfig.AUFBEWAHRUNGSFRIST_MIN <= val <= TenantHinschgConfig.AUFBEWAHRUNGSFRIST_MAX):
                errors['aufbewahrungsfrist_jahre'] = (
                    f'Muss zwischen {TenantHinschgConfig.AUFBEWAHRUNGSFRIST_MIN} und '
                    f'{TenantHinschgConfig.AUFBEWAHRUNGSFRIST_MAX} Jahren liegen (§11 HinSchG)'
                )
        
        if 'melde_kanale' in config:
            valid_kanale = {'online', 'telefon', 'persoenlich', 'post', 'email', 'fax'}
            invalid = set(config['melde_kanale']) - valid_kanale
            if invalid:
                errors['melde_kanale'] = f'Ungueltige Kanaele: {invalid}'
        
        return errors

    @staticmethod
    def get_merged_config(tenant_overrides: dict) -> dict:
        """Merge tenant overrides with defaults."""
        config = dict(TenantHinschgConfig.DEFAULT_CONFIG)
        for key, value in tenant_overrides.items():
            if key in config:
                config[key] = value
        return config
