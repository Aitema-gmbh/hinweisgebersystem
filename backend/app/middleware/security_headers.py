"""
aitema|Hinweis - Security Headers Middleware
BSI-Grundschutz konforme Security-Header.
"""


class SecurityHeadersMiddleware:
    """
    WSGI-Middleware fuer Sicherheits-Header.
    Implementiert BSI-Grundschutz Empfehlungen.
    """

    def __init__(self, wsgi_app):
        self.wsgi_app = wsgi_app

    def __call__(self, environ, start_response):
        def custom_start_response(status, headers, exc_info=None):
            security_headers = [
                ("X-Content-Type-Options", "nosniff"),
                ("X-Frame-Options", "DENY"),
                ("X-XSS-Protection", "1; mode=block"),
                ("Referrer-Policy", "strict-origin-when-cross-origin"),
                ("Permissions-Policy", "camera=(), microphone=(), geolocation=()"),
                (
                    "Content-Security-Policy",
                    "default-src 'self'; "
                    "script-src 'self'; "
                    "style-src 'self' 'unsafe-inline'; "
                    "img-src 'self' data:; "
                    "font-src 'self'; "
                    "connect-src 'self'; "
                    "frame-ancestors 'none'; "
                    "base-uri 'self'; "
                    "form-action 'self'",
                ),
                ("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload"),
                ("Cache-Control", "no-store, no-cache, must-revalidate, private"),
                ("Pragma", "no-cache"),
            ]
            headers.extend(security_headers)
            return start_response(status, headers, exc_info)

        return self.wsgi_app(environ, custom_start_response)
