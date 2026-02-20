"""
aitema|Hinweis - HinSchG-konformes Hinweisgebersystem
Backend Application Factory

GlobaLeaks-Fork mit Multi-Tenant-Support, HinSchG-Compliance
und BSI-Grundschutz konformer Sicherheitsarchitektur.
"""

import os
import logging
from datetime import timedelta

from flask import Flask, jsonify, request, g
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, scoped_session
from celery import Celery
import structlog
import redis

from app.models import Base
from app.middleware.tenant_resolver import TenantResolverMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware

__version__ = "0.1.0"
__app_name__ = "aitema|Hinweis"

# Celery-Instanz (wird in create_app konfiguriert)
celery_app = Celery("hinweis")


def configure_logging(app: Flask) -> None:
    """Konfiguriert strukturiertes Logging mit structlog."""
    log_level = getattr(logging, app.config.get("LOG_LEVEL", "INFO").upper())

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.StackInfoRenderer(),
            structlog.dev.set_exc_info,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer()
            if app.config.get("FLASK_ENV") == "production"
            else structlog.dev.ConsoleRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def configure_database(app: Flask) -> None:
    """Konfiguriert die Datenbankverbindung mit SQLAlchemy."""
    database_url = app.config["DATABASE_URL"]

    # asyncpg URL fuer sync-Zugriff umwandeln
    sync_url = database_url.replace("+asyncpg", "+psycopg2")

    engine = create_engine(
        sync_url,
        pool_size=app.config.get("DB_POOL_SIZE", 10),
        max_overflow=app.config.get("DB_MAX_OVERFLOW", 20),
        pool_timeout=app.config.get("DB_POOL_TIMEOUT", 30),
        pool_recycle=app.config.get("DB_POOL_RECYCLE", 3600),
        pool_pre_ping=True,
        echo=app.config.get("FLASK_DEBUG", False),
    )

    session_factory = sessionmaker(bind=engine, expire_on_commit=False)
    Session = scoped_session(session_factory)

    app.engine = engine
    app.Session = Session

    @app.teardown_appcontext
    def cleanup_session(exception=None):
        Session.remove()


def configure_redis(app: Flask) -> redis.Redis:
    """Konfiguriert Redis-Verbindung fuer Sessions und Cache."""
    redis_client = redis.from_url(
        app.config["REDIS_URL"],
        decode_responses=True,
        socket_timeout=5,
        socket_connect_timeout=5,
        retry_on_timeout=True,
    )
    app.redis = redis_client
    return redis_client


def configure_celery(app: Flask) -> Celery:
    """Konfiguriert Celery fuer asynchrone Tasks."""
    celery_app.conf.update(
        broker_url=app.config["CELERY_BROKER_URL"],
        result_backend=app.config["REDIS_URL"],
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        timezone="Europe/Berlin",
        enable_utc=True,
        task_track_started=True,
        task_time_limit=300,
        task_soft_time_limit=240,
        worker_max_tasks_per_child=1000,
        broker_connection_retry_on_startup=True,
        beat_schedule={
            "check-hinschg-fristen": {
                "task": "app.services.hinschg_compliance.check_fristen_task",
                "schedule": timedelta(hours=1),
            },
            "cleanup-expired-sessions": {
                "task": "app.services.audit.cleanup_expired_sessions",
                "schedule": timedelta(hours=6),
            },
            "generate-audit-report": {
                "task": "app.services.audit.generate_daily_report",
                "schedule": timedelta(days=1),
            },
        },
    )

    class ContextTask(celery_app.Task):
        """Celery Task mit Flask Application Context."""

        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery_app.Task = ContextTask
    return celery_app


def register_blueprints(app: Flask) -> None:
    """Registriert alle API-Blueprints."""
    from app.api.auth import auth_bp
    from app.api.submissions import submissions_bp
    from app.api.cases import cases_bp
    from app.api.tenants import tenants_bp
    from app.api.admin import admin_bp
    from app.api.webhooks import webhooks_bp

    api_prefix = "/api/v1"

    app.register_blueprint(auth_bp, url_prefix=f"{api_prefix}/auth")
    app.register_blueprint(submissions_bp, url_prefix=f"{api_prefix}/submissions")
    app.register_blueprint(cases_bp, url_prefix=f"{api_prefix}/cases")
    app.register_blueprint(tenants_bp, url_prefix=f"{api_prefix}/tenants")
    app.register_blueprint(admin_bp, url_prefix=f"{api_prefix}/admin")
    app.register_blueprint(webhooks_bp, url_prefix=f"{api_prefix}/webhooks")


def register_error_handlers(app: Flask) -> None:
    """Registriert globale Fehlerbehandlung."""
    log = structlog.get_logger()

    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({"error": "Ungueltige Anfrage", "detail": str(error)}), 400

    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({"error": "Nicht autorisiert"}), 401

    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({"error": "Zugriff verweigert"}), 403

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Ressource nicht gefunden"}), 404

    @app.errorhandler(429)
    def rate_limited(error):
        return jsonify({"error": "Zu viele Anfragen. Bitte spaeter erneut versuchen."}), 429

    @app.errorhandler(500)
    def internal_error(error):
        log.error("internal_server_error", error=str(error))
        return jsonify({"error": "Interner Serverfehler"}), 500


def create_app(config_override: dict | None = None) -> Flask:
    """
    Application Factory fuer aitema|Hinweis.

    Args:
        config_override: Optionale Konfigurationsueberschreibungen (z.B. fuer Tests)

    Returns:
        Konfigurierte Flask-Applikation
    """
    app = Flask(__name__)

    # Basis-Konfiguration
    app.config.update(
        # Flask
        SECRET_KEY=os.environ.get("SECRET_KEY", "dev-secret-key"),
        DEBUG=os.environ.get("FLASK_DEBUG", "0") == "1",
        # Datenbank
        DATABASE_URL=os.environ.get(
            "DATABASE_URL",
            "postgresql+psycopg2://hinweis:changeme_dev@localhost:5432/hinweis_platform",
        ),
        DB_POOL_SIZE=int(os.environ.get("DB_POOL_SIZE", "10")),
        DB_MAX_OVERFLOW=int(os.environ.get("DB_MAX_OVERFLOW", "20")),
        # Redis
        REDIS_URL=os.environ.get("REDIS_URL", "redis://localhost:6379/0"),
        CELERY_BROKER_URL=os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/1"),
        # JWT
        JWT_SECRET_KEY=os.environ.get("JWT_SECRET_KEY", "dev-jwt-secret"),
        JWT_ACCESS_TOKEN_EXPIRES=timedelta(
            minutes=int(os.environ.get("SESSION_TIMEOUT_MINUTES", "30"))
        ),
        JWT_REFRESH_TOKEN_EXPIRES=timedelta(days=7),
        JWT_TOKEN_LOCATION=["headers", "cookies"],
        JWT_COOKIE_SECURE=os.environ.get("SESSION_COOKIE_SECURE", "false").lower() == "true",
        JWT_COOKIE_SAMESITE=os.environ.get("SESSION_COOKIE_SAMESITE", "Lax"),
        # Verschluesselung
        ENCRYPTION_MASTER_KEY=os.environ.get("ENCRYPTION_MASTER_KEY", "dev-master-key"),
        # Upload
        MAX_CONTENT_LENGTH=int(os.environ.get("MAX_UPLOAD_SIZE_MB", "50")) * 1024 * 1024,
        UPLOAD_FOLDER=os.environ.get("UPLOAD_FOLDER", "/app/uploads"),
        # HinSchG
        HINSCHG_EINGANGSBESTAETIGUNG_TAGE=int(
            os.environ.get("HINSCHG_EINGANGSBESTAETIGUNG_TAGE", "7")
        ),
        HINSCHG_RUECKMELDUNG_TAGE=int(os.environ.get("HINSCHG_RUECKMELDUNG_TAGE", "90")),
        HINSCHG_AUFBEWAHRUNG_JAHRE=int(os.environ.get("HINSCHG_AUFBEWAHRUNG_JAHRE", "3")),
        # Sicherheit
        RATE_LIMIT_ENABLED=os.environ.get("RATE_LIMIT_ENABLED", "true").lower() == "true",
        MFA_REQUIRED=os.environ.get("MFA_REQUIRED", "false").lower() == "true",
        PASSWORD_MIN_LENGTH=int(os.environ.get("PASSWORD_MIN_LENGTH", "12")),
        # Logging
        LOG_LEVEL=os.environ.get("LOG_LEVEL", "INFO"),
        FLASK_ENV=os.environ.get("FLASK_ENV", "development"),
    )

    # Test-Konfiguration ueberschreiben
    if config_override:
        app.config.update(config_override)

    # Logging
    configure_logging(app)

    # CORS
    CORS(
        app,
        origins=os.environ.get("CORS_ORIGINS", "http://localhost:4200").split(","),
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization", "X-Tenant-ID"],
        expose_headers=["X-Request-ID"],
    )

    # JWT
    jwt = JWTManager(app)

    # Rate Limiting
    if app.config["RATE_LIMIT_ENABLED"]:
        limiter = Limiter(
            key_func=get_remote_address,
            app=app,
            default_limits=[os.environ.get("RATE_LIMIT_DEFAULT", "100/hour")],
            storage_uri=app.config["REDIS_URL"],
        )
        app.limiter = limiter

    # Datenbank
    configure_database(app)

    # Redis
    configure_redis(app)

    # Celery
    configure_celery(app)

    # Middleware
    app.wsgi_app = TenantResolverMiddleware(app.wsgi_app, app)
    app.wsgi_app = SecurityHeadersMiddleware(app.wsgi_app)

    # Blueprints
    register_blueprints(app)

    # Error Handlers
    register_error_handlers(app)

    # Health-Check Endpoint
    @app.route("/api/v1/health")
    def health():
        """Health-Check Endpoint fuer Monitoring und Load Balancer."""
        health_status = {"status": "healthy", "version": __version__, "app": __app_name__}

        # Datenbank-Check
        try:
            with app.Session() as session:
                session.execute(text("SELECT 1"))
            health_status["database"] = "connected"
        except Exception:
            health_status["database"] = "disconnected"
            health_status["status"] = "degraded"

        # Redis-Check
        try:
            app.redis.ping()
            health_status["redis"] = "connected"
        except Exception:
            health_status["redis"] = "disconnected"
            health_status["status"] = "degraded"

        status_code = 200 if health_status["status"] == "healthy" else 503
        return jsonify(health_status), status_code

    return app
