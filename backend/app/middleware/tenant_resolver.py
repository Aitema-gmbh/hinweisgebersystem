"""
aitema|Hinweis - Tenant Resolver Middleware
Erkennt den aktuellen Tenant aus Request-Headern, Subdomain oder URL.
"""

from werkzeug.wrappers import Request


class TenantResolverMiddleware:
    """
    WSGI-Middleware zur Tenant-Erkennung.

    Erkennung in folgender Reihenfolge:
    1. X-Tenant-ID Header
    2. Subdomain (z.B. firma.hinweis.aitema.de)
    3. URL-Pfad (z.B. /t/firma/...)
    4. Default-Tenant aus Konfiguration
    """

    def __init__(self, wsgi_app, flask_app):
        self.wsgi_app = wsgi_app
        self.flask_app = flask_app

    def __call__(self, environ, start_response):
        request = Request(environ)

        # 1. Header
        tenant_id = request.headers.get("X-Tenant-ID")

        # 2. Subdomain
        if not tenant_id:
            host = request.host.split(":")[0]
            parts = host.split(".")
            if len(parts) > 2:
                tenant_id = parts[0]

        # 3. URL-Pfad
        if not tenant_id:
            path = request.path
            if path.startswith("/t/"):
                segments = path.split("/")
                if len(segments) >= 3:
                    tenant_id = segments[2]

        # 4. Default
        if not tenant_id:
            tenant_id = "default"

        environ["TENANT_ID"] = tenant_id
        return self.wsgi_app(environ, start_response)
