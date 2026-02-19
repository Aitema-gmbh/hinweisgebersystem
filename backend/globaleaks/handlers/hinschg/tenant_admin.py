"""
HinSchG Tenant Administration Handlers

Allows tenant admins (Kommune-Admins) to configure their HinSchG settings.
"""
from globaleaks.handlers.base import BaseHandler
from globaleaks.orm import transact
from globaleaks.services.hinschg.tenant_config import TenantHinschgConfig
from globaleaks.services.hinschg.tenant_isolation import validate_tenant_config_update
from globaleaks.utils.log import log


class HinschgTenantConfigHandler(BaseHandler):
    """GET/PUT /api/hinschg/config - Tenant-specific HinSchG configuration."""
    
    check_roles = 'admin'
    
    def get(self):
        return get_tenant_config(self.request.tid)
    
    def put(self):
        return update_tenant_config(
            self.request.tid,
            self.request.content
        )


@transact
def get_tenant_config(session, tid):
    """Get HinSchG configuration for a tenant."""
    from globaleaks.models.hinschg import HinschgTenantSettings
    
    settings = session.query(HinschgTenantSettings).filter(
        HinschgTenantSettings.tid == tid
    ).first()
    
    if settings:
        overrides = settings.config_json or {}
        config = TenantHinschgConfig.get_merged_config(overrides)
    else:
        config = dict(TenantHinschgConfig.DEFAULT_CONFIG)
    
    return {
        'tid': tid,
        'config': config,
        'legal_bounds': {
            'frist_eingangsbestaetigung': {
                'min': TenantHinschgConfig.FRIST_EINGANGSBESTAETIGUNG_MIN,
                'max': TenantHinschgConfig.FRIST_EINGANGSBESTAETIGUNG_MAX,
                'gesetz': '§8 Abs. 1 S. 1 HinSchG',
            },
            'frist_rueckmeldung': {
                'min': TenantHinschgConfig.FRIST_RUECKMELDUNG_MIN,
                'max': TenantHinschgConfig.FRIST_RUECKMELDUNG_MAX,
                'gesetz': '§8 Abs. 1 S. 3 HinSchG',
            },
            'aufbewahrungsfrist': {
                'min': TenantHinschgConfig.AUFBEWAHRUNGSFRIST_MIN,
                'max': TenantHinschgConfig.AUFBEWAHRUNGSFRIST_MAX,
                'gesetz': '§11 Abs. 1 HinSchG',
            },
        }
    }


@transact
def update_tenant_config(session, tid, updates):
    """Update HinSchG configuration for a tenant."""
    from globaleaks.models.hinschg import HinschgTenantSettings
    
    errors = TenantHinschgConfig.validate_config(updates)
    if errors:
        raise Exception(f"Validierungsfehler: {errors}")
    
    settings = session.query(HinschgTenantSettings).filter(
        HinschgTenantSettings.tid == tid
    ).first()
    
    if not settings:
        settings = HinschgTenantSettings()
        settings.tid = tid
        settings.config_json = {}
        session.add(settings)
    
    current = settings.config_json or {}
    current.update(updates)
    settings.config_json = current
    
    log.info("HinSchG config updated for tenant %d: %s", tid, list(updates.keys()))
    
    return {
        'tid': tid,
        'config': TenantHinschgConfig.get_merged_config(current),
        'updated_keys': list(updates.keys()),
    }


class HinschgTenantStatsHandler(BaseHandler):
    """GET /api/hinschg/tenant-stats - Cross-tenant statistics (root admin only)."""
    
    check_roles = 'admin'
    
    def get(self):
        return get_cross_tenant_stats(self.request.tid)


@transact
def get_cross_tenant_stats(session, requesting_tid):
    """Get cross-tenant statistics. Only available to root tenant (tid=1)."""
    if requesting_tid != 1:
        raise Exception("Nur fuer Root-Mandant verfuegbar")
    
    from globaleaks.models.hinschg import HinweisCase, HinweisFrist
    from globaleaks.models import Tenant
    from globaleaks.utils.utility import datetime_now
    from sqlalchemy import func
    
    now = datetime_now()
    
    tenants = session.query(Tenant).all()
    stats = []
    
    for tenant in tenants:
        total = session.query(func.count(HinweisCase.id)).filter(
            HinweisCase.tid == tenant.id
        ).scalar() or 0
        
        active = session.query(func.count(HinweisCase.id)).filter(
            HinweisCase.tid == tenant.id,
            HinweisCase.status.notin_(['abgeschlossen', 'archiviert'])
        ).scalar() or 0
        
        overdue = session.query(func.count(HinweisFrist.id)).filter(
            HinweisFrist.tid == tenant.id,
            HinweisFrist.erledigt == False,
            HinweisFrist.frist_datum < now
        ).scalar() or 0
        
        stats.append({
            'tid': tenant.id,
            'tenant_name': tenant.label if hasattr(tenant, 'label') else f'Tenant {tenant.id}',
            'total_cases': total,
            'active_cases': active,
            'overdue_fristen': overdue,
        })
    
    return {
        'tenants': stats,
        'total_tenants': len(stats),
        'total_cases': sum(s['total_cases'] for s in stats),
        'total_overdue': sum(s['overdue_fristen'] for s in stats),
    }
