#!/bin/sh
# aitema|Hinweis - Backup-Script
set -e

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

echo "[$(date)] Starte Backup..."

# Alle Datenbanken sichern
pg_dumpall -U "${PGUSER}" -h "${PGHOST}" | gzip > "${BACKUP_DIR}/hinweis_full_${TIMESTAMP}.sql.gz"

echo "[$(date)] Backup erstellt: hinweis_full_${TIMESTAMP}.sql.gz"

# Alte Backups bereinigen
find "${BACKUP_DIR}" -name "hinweis_full_*.sql.gz" -mtime +${RETENTION_DAYS} -delete

echo "[$(date)] Alte Backups (>${RETENTION_DAYS} Tage) bereinigt"
echo "[$(date)] Backup abgeschlossen"
