# aitema|Hinweis - Backend Dockerfile
# Multi-stage build fuer Dev und Prod

# === Base Stage ===
FROM python:3.12-slim-bookworm AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    libmagic1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN addgroup --system --gid 1001 hinweis && \
    adduser --system --uid 1001 --ingroup hinweis hinweis

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# === Development Stage ===
FROM base AS development

ENV FLASK_ENV=development \
    FLASK_DEBUG=1

RUN pip install --no-cache-dir watchdog[watchmedo]

COPY . .

RUN mkdir -p /app/uploads && chown -R hinweis:hinweis /app

EXPOSE 8080

CMD ["python", "-m", "flask", "run", "--host=0.0.0.0", "--port=8080", "--reload"]

# === Production Stage ===
FROM base AS production

ENV FLASK_ENV=production \
    FLASK_DEBUG=0

COPY . .

RUN mkdir -p /app/uploads && chown -R hinweis:hinweis /app

USER hinweis

EXPOSE 8080

CMD ["gunicorn", \
     "--bind", "0.0.0.0:8080", \
     "--workers", "4", \
     "--worker-class", "gthread", \
     "--threads", "2", \
     "--timeout", "120", \
     "--keep-alive", "5", \
     "--max-requests", "1000", \
     "--max-requests-jitter", "50", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "app:create_app()"]
