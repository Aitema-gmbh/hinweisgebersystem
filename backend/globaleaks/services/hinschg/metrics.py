# -*- coding: utf-8 -*-
"""
HinSchG Prometheus Metrics Service
Generates metrics in Prometheus text format (no external dependencies).
Cache TTL: 60 seconds
"""
import time
from globaleaks.orm import transact

# ---------------------------------------------------------------------------
# Simple in-process cache
# ---------------------------------------------------------------------------
_cache = {
    "data": None,
    "ts": 0.0,
}
CACHE_TTL = 60  # seconds


# ---------------------------------------------------------------------------
# Prometheus text-format helpers
# ---------------------------------------------------------------------------

def _labels(**kw):
    """Render a label set as {key="value",...}"""
    if not kw:
        return ""
    parts = ','.join('{}="{}"'.format(k, str(v).replace('"', '\\"')) for k, v in kw.items())
    return "{" + parts + "}"


def _gauge(name, help_text, metric_type, samples):
    """
    samples: list of (label_dict, value)
    Returns Prometheus text lines.
    """
    lines = [
        "# HELP {} {}".format(name, help_text),
        "# TYPE {} {}".format(name, metric_type),
    ]
    for label_dict, value in samples:
        lbl = _labels(**label_dict)
        lines.append("{}{} {}".format(name, lbl, value))
    return lines


# ---------------------------------------------------------------------------
# DB queries (all wrapped in @transact externally)
# ---------------------------------------------------------------------------

def _query_cases_by_status(session):
    """Returns list of (status, tid, count)."""
    rows = session.execute(
        """
        SELECT
            COALESCE(hinschg_status, 'eingegangen') AS status,
            tid,
            COUNT(*) AS cnt
        FROM internaltip
        WHERE hinschg_status IS NOT NULL
        GROUP BY status, tid
        """
    ).fetchall()
    return rows


def _query_fristen_overdue(session):
    """Returns list of (typ, tid, count) for overdue deadlines."""
    now_ts = int(time.time())
    rows = session.execute(
        """
        SELECT
            COALESCE(frist_typ, 'bearbeitung') AS typ,
            tid,
            COUNT(*) AS cnt
        FROM internaltip_hinschg_frist
        WHERE frist_datum < :now
          AND abgeschlossen = 0
        GROUP BY typ, tid
        """,
        {"now": now_ts}
    ).fetchall()
    return rows


def _query_fristen_upcoming(session):
    """Returns list of (tid, count) for fristen due within 7 days."""
    now_ts = int(time.time())
    seven_days = now_ts + 7 * 86400
    rows = session.execute(
        """
        SELECT tid, COUNT(*) AS cnt
        FROM internaltip_hinschg_frist
        WHERE frist_datum BETWEEN :now AND :soon
          AND abgeschlossen = 0
        GROUP BY tid
        """,
        {"now": now_ts, "soon": seven_days}
    ).fetchall()
    return rows


def _query_avg_processing_days(session):
    """Returns list of (tid, avg_days) for closed cases."""
    rows = session.execute(
        """
        SELECT
            tid,
            AVG(
                CAST(abschluss_datum - creation_date AS REAL) / 86400.0
            ) AS avg_days
        FROM internaltip
        WHERE hinschg_status = 'abgeschlossen'
          AND abschluss_datum IS NOT NULL
        GROUP BY tid
        """
    ).fetchall()
    return rows


def _query_compliance_rate(session):
    """Returns list of (tid, rate_percent) – fristgerechte Abschluesse / total."""
    rows = session.execute(
        """
        SELECT
            tid,
            CASE
                WHEN COUNT(*) = 0 THEN 100.0
                ELSE
                    100.0 * SUM(
                        CASE WHEN hinschg_fristgerecht = 1 THEN 1 ELSE 0 END
                    ) / COUNT(*)
            END AS rate
        FROM internaltip
        WHERE hinschg_status = 'abgeschlossen'
        GROUP BY tid
        """
    ).fetchall()
    return rows


def _query_cases_per_category(session):
    """Returns list of (kategorie, tid, count)."""
    rows = session.execute(
        """
        SELECT
            COALESCE(hinschg_kategorie, 'unbekannt') AS kategorie,
            tid,
            COUNT(*) AS cnt
        FROM internaltip
        WHERE hinschg_kategorie IS NOT NULL
        GROUP BY kategorie, tid
        """
    ).fetchall()
    return rows


def _query_anonymous_ratio(session):
    """Returns list of (tid, ratio_percent) for anonymous reports."""
    rows = session.execute(
        """
        SELECT
            tid,
            100.0 * SUM(CASE WHEN identity_provided = 0 THEN 1 ELSE 0 END) / COUNT(*) AS ratio
        FROM internaltip
        GROUP BY tid
        """
    ).fetchall()
    return rows


def _query_new_cases_per_week(session):
    """Returns list of (tid, count) of cases created in the last 7 days."""
    cutoff = int(time.time()) - 7 * 86400
    rows = session.execute(
        """
        SELECT tid, COUNT(*) AS cnt
        FROM internaltip
        WHERE creation_date >= :cutoff
        GROUP BY tid
        """,
        {"cutoff": cutoff}
    ).fetchall()
    return rows


def _query_active_ombudspersonen(session):
    """Returns list of (tid, count) of active receivers/ombudspersonen."""
    rows = session.execute(
        """
        SELECT tid, COUNT(*) AS cnt
        FROM receiver
        WHERE active = 1
        GROUP BY tid
        """
    ).fetchall()
    return rows


def _query_escalations_this_month(session):
    """Returns list of (tid, count) of escalations this calendar month."""
    import datetime
    now = datetime.datetime.utcnow()
    month_start = int(datetime.datetime(now.year, now.month, 1).timestamp())
    rows = session.execute(
        """
        SELECT tid, COUNT(*) AS cnt
        FROM internaltip
        WHERE hinschg_eskaliert = 1
          AND hinschg_eskalation_datum >= :ms
        GROUP BY tid
        """,
        {"ms": month_start}
    ).fetchall()
    return rows


# ---------------------------------------------------------------------------
# Build full metrics text
# ---------------------------------------------------------------------------

def _build_metrics(session):
    lines = []

    # 1. hinschg_cases_total
    rows = _query_cases_by_status(session)
    samples = [
        ({"status": r[0], "tid": r[1]}, int(r[2]))
        for r in rows
    ]
    lines += _gauge(
        "hinschg_cases_total",
        "Total HinSchG cases by status and tenant",
        "gauge",
        samples
    )
    lines.append("")

    # 2. hinschg_fristen_overdue
    rows = _query_fristen_overdue(session)
    samples = [
        ({"typ": r[0], "tid": r[1]}, int(r[2]))
        for r in rows
    ]
    lines += _gauge(
        "hinschg_fristen_overdue",
        "Number of overdue HinSchG deadlines by type and tenant",
        "gauge",
        samples
    )
    lines.append("")

    # 3. hinschg_fristen_upcoming
    rows = _query_fristen_upcoming(session)
    samples = [
        ({"tid": r[0]}, int(r[1]))
        for r in rows
    ]
    lines += _gauge(
        "hinschg_fristen_upcoming",
        "HinSchG deadlines due within the next 7 days per tenant",
        "gauge",
        samples
    )
    lines.append("")

    # 4. hinschg_avg_processing_days
    rows = _query_avg_processing_days(session)
    samples = [
        ({"tid": r[0]}, round(float(r[1] or 0), 2))
        for r in rows
    ]
    lines += _gauge(
        "hinschg_avg_processing_days",
        "Average processing time in days for closed HinSchG cases per tenant",
        "gauge",
        samples
    )
    lines.append("")

    # 5. hinschg_compliance_rate
    rows = _query_compliance_rate(session)
    samples = [
        ({"tid": r[0]}, round(float(r[1] or 100.0), 2))
        for r in rows
    ]
    lines += _gauge(
        "hinschg_compliance_rate",
        "Percentage of HinSchG cases closed within legal deadline per tenant",
        "gauge",
        samples
    )
    lines.append("")

    # 6. hinschg_cases_per_category
    rows = _query_cases_per_category(session)
    samples = [
        ({"kategorie": r[0], "tid": r[1]}, int(r[2]))
        for r in rows
    ]
    lines += _gauge(
        "hinschg_cases_per_category",
        "HinSchG cases grouped by category and tenant",
        "gauge",
        samples
    )
    lines.append("")

    # 7. hinschg_anonymous_ratio
    rows = _query_anonymous_ratio(session)
    samples = [
        ({"tid": r[0]}, round(float(r[1] or 0), 2))
        for r in rows
    ]
    lines += _gauge(
        "hinschg_anonymous_ratio",
        "Percentage of anonymous HinSchG reports per tenant",
        "gauge",
        samples
    )
    lines.append("")

    # 8. hinschg_new_cases_week
    rows = _query_new_cases_per_week(session)
    samples = [
        ({"tid": r[0]}, int(r[1]))
        for r in rows
    ]
    lines += _gauge(
        "hinschg_new_cases_week",
        "New HinSchG cases created in the last 7 days per tenant",
        "gauge",
        samples
    )
    lines.append("")

    # 9. hinschg_active_ombudspersonen
    rows = _query_active_ombudspersonen(session)
    samples = [
        ({"tid": r[0]}, int(r[1]))
        for r in rows
    ]
    lines += _gauge(
        "hinschg_active_ombudspersonen",
        "Number of active ombudspersonen/receivers per tenant",
        "gauge",
        samples
    )
    lines.append("")

    # 10. hinschg_escalations_month
    rows = _query_escalations_this_month(session)
    samples = [
        ({"tid": r[0]}, int(r[1]))
        for r in rows
    ]
    lines += _gauge(
        "hinschg_escalations_month",
        "Number of escalated HinSchG cases this calendar month per tenant",
        "gauge",
        samples
    )
    lines.append("")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

@transact
def get_metrics_text(session):
    """
    Returns Prometheus text format metrics string.
    Result is cached for CACHE_TTL seconds.
    """
    now = time.time()
    if _cache["data"] is not None and (now - _cache["ts"]) < CACHE_TTL:
        return _cache["data"]

    text = _build_metrics(session)
    _cache["data"] = text
    _cache["ts"] = now
    return text
