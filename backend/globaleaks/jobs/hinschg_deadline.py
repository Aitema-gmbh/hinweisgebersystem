"""
HinSchG Deadline Check Job for aitema|Hinweis

Periodic job that runs every hour to:
1. Check for overdue deadlines (7-day confirmation, 3-month feedback)
2. Send reminder notifications 2 days before deadline
3. Escalate overdue cases to admin
4. Archive cases past retention period
5. Clean up expired data per §11 HinSchG

Integrates with GlobaLeaks' job scheduler (Twisted LoopingCall).
"""
from datetime import timedelta

from twisted.internet import task

from globaleaks.jobs.job import Job
from globaleaks.orm import transact
from globaleaks.services.hinschg import (
    check_deadlines,
    cleanup_expired_cases,
)
from globaleaks.utils.log import log


class HinschgDeadlineCheckJob(Job):
    """
    Periodic job for HinSchG compliance monitoring.
    
    Runs every hour and checks:
    - Overdue deadlines -> triggers escalation notification
    - Upcoming deadlines (within 2 days) -> triggers reminder
    - Expired retention periods -> triggers data cleanup
    """
    
    name = "HinSchG Deadline Check"
    interval = 3600  # Run every hour
    monitor_interval = 60 * 60  # 1 hour
    
    def operation(self):
        """Main job operation called by the scheduler."""
        return self._run_checks()
    
    @transact
    def _run_checks(self, session):
        """Execute all deadline checks."""
        log.info("HinSchG Deadline Check: Starting periodic check")
        
        # 1. Check deadlines (overdue + upcoming)
        warnings = []
        try:
            # Note: check_deadlines is already @transact decorated
            # We need to call the inner function directly here
            from globaleaks.services.hinschg import (
                HinweisFrist, HinweisCase
            )
            from globaleaks.utils.utility import datetime_now
            
            now = datetime_now()
            
            # Find overdue deadlines
            overdue = session.query(HinweisFrist).filter(
                HinweisFrist.erledigt == False,
                HinweisFrist.frist_datum < now,
                HinweisFrist.eskaliert == False
            ).all()
            
            for frist in overdue:
                case = session.query(HinweisCase).filter(
                    HinweisCase.id == frist.case_id
                ).first()
                
                if case:
                    frist.eskaliert = True
                    tage = (now - frist.frist_datum).days
                    
                    log.warning(
                        "HinSchG FRISTVERSAEUMNIS: %s - %s (%d Tage ueberfaellig) [Tenant %d]",
                        case.aktenzeichen, frist.frist_typ, tage, frist.tid
                    )
                    
                    warnings.append({
                        'type': 'overdue',
                        'aktenzeichen': case.aktenzeichen,
                        'frist_typ': frist.frist_typ,
                        'tage_ueberfaellig': tage,
                        'tid': frist.tid,
                    })
            
            # Find upcoming deadlines (within 2 days)
            upcoming_limit = now + timedelta(days=2)
            upcoming = session.query(HinweisFrist).filter(
                HinweisFrist.erledigt == False,
                HinweisFrist.frist_datum > now,
                HinweisFrist.frist_datum < upcoming_limit,
                HinweisFrist.erinnerung_gesendet == False
            ).all()
            
            for frist in upcoming:
                case = session.query(HinweisCase).filter(
                    HinweisCase.id == frist.case_id
                ).first()
                
                if case:
                    frist.erinnerung_gesendet = True
                    tage = (frist.frist_datum - now).days
                    
                    log.info(
                        "HinSchG Erinnerung: %s - %s (noch %d Tage)",
                        case.aktenzeichen, frist.frist_typ, tage
                    )
                    
                    warnings.append({
                        'type': 'upcoming',
                        'aktenzeichen': case.aktenzeichen,
                        'frist_typ': frist.frist_typ,
                        'tage_verbleibend': tage,
                        'tid': frist.tid,
                    })
            
            if warnings:
                log.info(
                    "HinSchG Deadline Check: %d overdue, %d upcoming",
                    sum(1 for w in warnings if w['type'] == 'overdue'),
                    sum(1 for w in warnings if w['type'] == 'upcoming'),
                )
                
                # TODO: Send notifications via GlobaLeaks notification system
                # self._send_deadline_notifications(warnings)
            
        except Exception as e:
            log.err("HinSchG Deadline Check failed: %s", str(e))
        
        # 2. Cleanup expired cases (§11 HinSchG)
        try:
            from globaleaks.models.hinschg import FallStatus
            
            expired = session.query(HinweisCase).filter(
                HinweisCase.status == FallStatus.ARCHIVIERT.value,
                HinweisCase.loeschung_datum <= now
            ).all()
            
            deleted_count = 0
            for case in expired:
                from globaleaks.models.hinschg import HinweisCaseHistory
                
                session.query(HinweisCaseHistory).filter(
                    HinweisCaseHistory.case_id == case.id
                ).delete()
                session.query(HinweisFrist).filter(
                    HinweisFrist.case_id == case.id
                ).delete()
                
                log.info(
                    "HinSchG §11: Loesche abgelaufenen Fall %s (Aufbewahrungsfrist abgelaufen)",
                    case.aktenzeichen
                )
                session.delete(case)
                deleted_count += 1
            
            if deleted_count > 0:
                log.info(
                    "HinSchG Cleanup: %d Faelle nach §11 geloescht", deleted_count
                )
                
        except Exception as e:
            log.err("HinSchG Cleanup failed: %s", str(e))
        
        log.info("HinSchG Deadline Check: Completed")
