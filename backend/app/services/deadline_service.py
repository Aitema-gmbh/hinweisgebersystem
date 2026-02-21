"""
aitema|Hinweis - D3: HinSchG-Fristenampel Service
Fristenberechnung und Ampel-Status gemaess HinSchG §17.

Fristen:
  - Eingangsbestaetigung: 7 Tage ab Eingang (Case.created_at)
  - Abschluss-Rueckmeldung: 3 Monate (90 Tage) ab Eingang

Ampel:
  - gruen  (green):  > 14 Tage verbleibend
  - gelb   (yellow): 0-14 Tage verbleibend
  - rot    (red):    ueberfaellig
  - done:            Fall abgeschlossen (resolved_at gesetzt)
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from dataclasses import dataclass, field

import structlog

log = structlog.get_logger()

# HinSchG §17 Fristenkonstanten
ACK_DAYS = 7          # Eingangsbestaetigung: 7 Kalendertage
RESOLVE_DAYS = 90     # Abschluss-Rueckmeldung: 3 Monate (90 Tage vereinfacht)
WARNING_DAYS = 14     # Gelbe Warnstufe: 14 Tage vor Ablauf


@dataclass
class DeadlineStatus:
    """Ergebnis der Fristenberechnung fuer einen Fall."""
    status: str                        # 'green', 'yellow', 'red', 'done'
    label: str                         # Anzeigetext fuer Badge
    deadline_type: Optional[str]       # 'ack' | 'resolve' | None
    deadline_type_label: Optional[str] # 'Eingangsbestaetigung' | 'Abschluss-Rueckmeldung'
    days_remaining: Optional[int]      # Verbleibende Tage (negativ = ueberfaellig)
    deadline: Optional[str]            # ISO-Datum der naechsten Frist
    ack_done: bool                     # Eingangsbestaetigung erledigt
    resolve_done: bool                 # Abschluss-Rueckmeldung erledigt
    ack_deadline: str                  # ISO-Datum Eingangsbestaetigung-Frist
    resolve_deadline: str              # ISO-Datum Abschluss-Frist


def get_case_deadline_status(case) -> DeadlineStatus:
    """
    Berechnet den Ampel-Status einer HinSchG-Frist fuer einen Fall.

    Nutzt Case.created_at als Eingangsdatum.
    Prueft acknowledged_at (Eingangsbestaetigung) und resolved_at (Abschluss).

    Args:
        case: Case-ORM-Objekt mit created_at, acknowledged_at, resolved_at

    Returns:
        DeadlineStatus mit Ampel-Farbe, Label, Tagen und Fristen-ISO-Datum
    """
    now = datetime.now(timezone.utc)

    # Eingangsdatum (timezone-aware machen falls noetig)
    created = case.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)

    # Fristen berechnen
    ack_deadline = created + timedelta(days=ACK_DAYS)
    resolve_deadline = created + timedelta(days=RESOLVE_DAYS)

    ack_done = case.acknowledged_at is not None
    resolve_done = case.resolved_at is not None

    # Fall vollstaendig abgeschlossen
    if resolve_done:
        return DeadlineStatus(
            status="done",
            label="Abgeschlossen",
            deadline_type=None,
            deadline_type_label=None,
            days_remaining=None,
            deadline=None,
            ack_done=ack_done,
            resolve_done=resolve_done,
            ack_deadline=ack_deadline.isoformat(),
            resolve_deadline=resolve_deadline.isoformat(),
        )

    # Naechste offene Frist bestimmen
    if not ack_done:
        next_deadline = ack_deadline
        deadline_type = "ack"
        deadline_type_label = "Eingangsbestaetigung"
    else:
        next_deadline = resolve_deadline
        deadline_type = "resolve"
        deadline_type_label = "Abschluss-Rueckmeldung"

    days_remaining = (next_deadline - now).days

    # Ampel-Farbe bestimmen
    if days_remaining < 0:
        status = "red"
        label = f"UEBERFAELLIG: {deadline_type_label} ({abs(days_remaining)}d)"
    elif days_remaining <= WARNING_DAYS:
        status = "yellow"
        label = f"{deadline_type_label} in {days_remaining}d"
    else:
        status = "green"
        label = f"{deadline_type_label} in {days_remaining}d"

    return DeadlineStatus(
        status=status,
        label=label,
        deadline_type=deadline_type,
        deadline_type_label=deadline_type_label,
        days_remaining=days_remaining,
        deadline=next_deadline.isoformat(),
        ack_done=ack_done,
        resolve_done=resolve_done,
        ack_deadline=ack_deadline.isoformat(),
        resolve_deadline=resolve_deadline.isoformat(),
    )


def get_deadline_summary(cases) -> dict:
    """
    Berechnet eine Zusammenfassung der Fristenstatus fuer alle Faelle.
    Fuer das Dashboard-Widget.

    Returns:
        {'green': int, 'yellow': int, 'red': int, 'done': int, 'total': int}
    """
    summary = {"green": 0, "yellow": 0, "red": 0, "done": 0, "total": 0}
    for case in cases:
        status = get_case_deadline_status(case)
        summary[status.status] = summary.get(status.status, 0) + 1
        summary["total"] += 1
    return summary


def get_urgent_cases(cases, warning_days: int = WARNING_DAYS) -> list:
    """
    Filtert Faelle mit dringenden Fristen (gelb oder rot).

    Args:
        cases: Liste von Case-ORM-Objekten
        warning_days: Schwellwert in Tagen (Default: WARNING_DAYS=14)

    Returns:
        Liste von {'case': Case, 'deadline_info': DeadlineStatus}
    """
    urgent = []
    for case in cases:
        ds = get_case_deadline_status(case)
        if ds.status in ("yellow", "red"):
            urgent.append({"case": case, "deadline_info": ds})
    return sorted(
        urgent,
        key=lambda x: (
            0 if x["deadline_info"].status == "red" else 1,
            x["deadline_info"].days_remaining if x["deadline_info"].days_remaining is not None else 9999,
        ),
    )
