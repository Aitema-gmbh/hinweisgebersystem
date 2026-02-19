-- aitema|Hinweis - Datenbank-Initialisierung
-- Wird bei erstem Start von PostgreSQL ausgefuehrt

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Hinweis: Tabellen werden durch Alembic-Migrationen erstellt
-- Diese Datei dient nur fuer Extensions und initiale DB-Konfiguration
