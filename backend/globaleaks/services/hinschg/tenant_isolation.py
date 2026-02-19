"""
Tenant Isolation for HinSchG

Ensures strict data separation between tenants (Kommunen).
Critical for compliance: one Kommune must never see another's cases.
"""
from globaleaks.utils.log import log


class TenantIsolationError(Exception):
    """Raised when a cross-tenant data access is attempted."""
    pass


def ensure_tenant_access(session, model_instance, expected_tid):
    """Verify that a model instance belongs to the expected tenant."""
    if hasattr(model_instance, 'tid') and model_instance.tid != expected_tid:
        log.err(
            "SECURITY: Cross-tenant access attempt! "
            "Expected tid=%d, got tid=%d on %s(id=%s)",
            expected_tid, model_instance.tid,
            type(model_instance).__name__,
            getattr(model_instance, 'id', 'unknown')
        )
        raise TenantIsolationError(
            f"Zugriffsverletzung: Mandantentrennung (tid={expected_tid})"
        )


def tenant_query(session, model_class, tid):
    """Create a tenant-scoped query. Always use this instead of session.query() directly."""
    return session.query(model_class).filter(model_class.tid == tid)


def validate_tenant_config_update(current_tid, target_tid):
    """Ensure admin can only modify their own tenant config."""
    if current_tid != target_tid:
        raise TenantIsolationError(
            "Konfigurationsaenderung fuer fremden Mandanten nicht erlaubt"
        )


class TenantContext:
    """Context manager for tenant-scoped operations."""
    
    def __init__(self, session, tid):
        self.session = session
        self.tid = tid
    
    def query(self, model_class):
        """Tenant-scoped query."""
        return tenant_query(self.session, model_class, self.tid)
    
    def verify(self, instance):
        """Verify instance belongs to this tenant."""
        ensure_tenant_access(self.session, instance, self.tid)
        return instance
