"""
HinSchG API Handlers for aitema|Hinweis

REST API endpoints for HinSchG case management.
Integrates with GlobaLeaks' Twisted-based handler system.
"""
from globaleaks.handlers.base import BaseHandler
from globaleaks.orm import transact, tw
from globaleaks.rest import requests, errors
from globaleaks.services.hinschg import (
    create_hinweis_case,
    update_case_status,
    check_deadlines,
    generate_compliance_report,
    cleanup_expired_cases,
    serialize_hinweis_case,
    VALID_TRANSITIONS,
)
from globaleaks.models.hinschg import (
    HinweisCase, HinweisCaseHistory, HinweisFrist,
    OmbudspersonConfig, HinschgReport,
    FallStatus, HinweisKategorie,
)
from globaleaks.utils.utility import datetime_now
from globaleaks.utils.log import log

import json
from datetime import datetime


# ============================================================
# Case Management Endpoints
# ============================================================

class HinschgCaseCollection(BaseHandler):
    """
    GET /api/hinschg/cases - List all cases for the current tenant
    POST /api/hinschg/cases - Create a new HinSchG case
    """
    check_roles = {'admin', 'receiver'}  # Ombudsperson = receiver role

    @transact
    def _get_cases(self, session):
        """Get all cases for the current tenant with filtering."""
        tid = self.request.tid
        
        query = session.query(HinweisCase).filter(
            HinweisCase.tid == tid
        )
        
        # Optional filters via query params
        status = self.request.args.get(b'status', [None])[0]
        if status:
            query = query.filter(HinweisCase.status == status.decode())
        
        kategorie = self.request.args.get(b'kategorie', [None])[0]
        if kategorie:
            query = query.filter(HinweisCase.kategorie == kategorie.decode())
        
        prioritaet = self.request.args.get(b'prioritaet', [None])[0]
        if prioritaet:
            query = query.filter(HinweisCase.prioritaet == prioritaet.decode())
        
        cases = query.order_by(HinweisCase.eingangsdatum.desc()).all()
        return [serialize_hinweis_case(c) for c in cases]

    def get(self):
        return self._get_cases()

    def post(self):
        """Create a new HinSchG case linked to a GlobaLeaks submission."""
        request = json.loads(self.request.content.read())
        
        return create_hinweis_case(
            tid=self.request.tid,
            internaltip_id=request['internaltip_id'],
            kategorie=request.get('kategorie', 'sonstiges'),
            meldekanal=request.get('meldekanal', 'online'),
            ombudsperson_id=request.get('ombudsperson_id'),
        )


class HinschgCaseInstance(BaseHandler):
    """
    GET /api/hinschg/cases/<case_id> - Get case details
    PUT /api/hinschg/cases/<case_id> - Update case
    """
    check_roles = {'admin', 'receiver'}

    @transact
    def _get_case(self, session, case_id):
        tid = self.request.tid
        case = session.query(HinweisCase).filter(
            HinweisCase.tid == tid,
            HinweisCase.id == case_id
        ).first()
        
        if not case:
            raise errors.ResourceNotFound
        
        result = serialize_hinweis_case(case)
        
        # Include case history
        history = session.query(HinweisCaseHistory).filter(
            HinweisCaseHistory.case_id == case_id
        ).order_by(HinweisCaseHistory.created_at.desc()).all()
        
        result['history'] = [{
            'id': h.id,
            'alter_status': h.alter_status,
            'neuer_status': h.neuer_status,
            'kommentar': h.kommentar,
            'aktion': h.aktion,
            'user_id': h.user_id,
            'created_at': h.created_at.isoformat() if h.created_at else None,
        } for h in history]
        
        # Include deadlines
        fristen = session.query(HinweisFrist).filter(
            HinweisFrist.case_id == case_id
        ).order_by(HinweisFrist.frist_datum).all()
        
        result['fristen'] = [{
            'id': f.id,
            'frist_typ': f.frist_typ,
            'frist_datum': f.frist_datum.isoformat(),
            'erledigt': f.erledigt,
            'erledigt_datum': f.erledigt_datum.isoformat() if f.erledigt_datum else None,
            'eskaliert': f.eskaliert,
        } for f in fristen]
        
        return result

    def get(self, case_id):
        return self._get_case(case_id)

    @transact
    def _update_case(self, session, case_id, request):
        tid = self.request.tid
        case = session.query(HinweisCase).filter(
            HinweisCase.tid == tid,
            HinweisCase.id == case_id
        ).first()
        
        if not case:
            raise errors.ResourceNotFound
        
        # Updatable fields (not status - use status endpoint)
        for field in ['kategorie', 'prioritaet', 'ombudsperson_id',
                      'fallbearbeiter_id', 'stichhaltig',
                      'folgemassnahme_beschreibung']:
            if field in request:
                setattr(case, field, request[field])
        
        case.updated_at = datetime_now()
        return serialize_hinweis_case(case)

    def put(self, case_id):
        request = json.loads(self.request.content.read())
        return self._update_case(case_id, request)


class HinschgCaseStatusChange(BaseHandler):
    """
    POST /api/hinschg/cases/<case_id>/status - Change case status
    
    Validates transitions per HinSchG workflow.
    """
    check_roles = {'admin', 'receiver'}

    def post(self, case_id):
        request = json.loads(self.request.content.read())
        
        return update_case_status(
            tid=self.request.tid,
            case_id=case_id,
            neuer_status=request['status'],
            user_id=self.session.user_id,
            kommentar=request.get('kommentar', ''),
            begruendung=request.get('begruendung', ''),
        )


# ============================================================
# Dashboard & Statistics
# ============================================================

class HinschgDashboard(BaseHandler):
    """
    GET /api/hinschg/dashboard - Dashboard data for Ombudsperson
    """
    check_roles = {'admin', 'receiver'}

    @transact
    def _get_dashboard(self, session):
        tid = self.request.tid
        now = datetime_now()
        
        # Case counts by status
        status_counts = {}
        for status in FallStatus:
            count = session.query(HinweisCase).filter(
                HinweisCase.tid == tid,
                HinweisCase.status == status.value
            ).count()
            status_counts[status.value] = count
        
        # Overdue deadlines
        overdue_fristen = session.query(HinweisFrist).filter(
            HinweisFrist.tid == tid,
            HinweisFrist.erledigt == False,
            HinweisFrist.frist_datum < now
        ).count()
        
        # Upcoming deadlines (next 7 days)
        upcoming_fristen = session.query(HinweisFrist).filter(
            HinweisFrist.tid == tid,
            HinweisFrist.erledigt == False,
            HinweisFrist.frist_datum >= now,
            HinweisFrist.frist_datum < now + __import__('datetime').timedelta(days=7)
        ).count()
        
        # Recent cases
        recent = session.query(HinweisCase).filter(
            HinweisCase.tid == tid
        ).order_by(
            HinweisCase.eingangsdatum.desc()
        ).limit(10).all()
        
        # Category distribution
        kategorien = {}
        all_cases = session.query(HinweisCase).filter(
            HinweisCase.tid == tid
        ).all()
        for c in all_cases:
            kat = c.kategorie or 'sonstiges'
            kategorien[kat] = kategorien.get(kat, 0) + 1
        
        return {
            'status_counts': status_counts,
            'total_cases': sum(status_counts.values()),
            'overdue_fristen': overdue_fristen,
            'upcoming_fristen': upcoming_fristen,
            'kategorien_verteilung': kategorien,
            'recent_cases': [serialize_hinweis_case(c) for c in recent],
        }

    def get(self):
        return self._get_dashboard()


# ============================================================
# Compliance Reports
# ============================================================

class HinschgReportCollection(BaseHandler):
    """
    GET /api/hinschg/reports - List compliance reports
    POST /api/hinschg/reports - Generate new report
    """
    check_roles = 'admin'

    @transact
    def _get_reports(self, session):
        tid = self.request.tid
        reports = session.query(HinschgReport).filter(
            HinschgReport.tid == tid
        ).order_by(HinschgReport.created_at.desc()).all()
        
        from globaleaks.services.hinschg import serialize_hinschg_report
        return [serialize_hinschg_report(r) for r in reports]

    def get(self):
        return self._get_reports()

    def post(self):
        request = json.loads(self.request.content.read())
        
        von = datetime.fromisoformat(request['von'])
        bis = datetime.fromisoformat(request['bis'])
        
        return generate_compliance_report(
            tid=self.request.tid,
            von=von,
            bis=bis,
            erstellt_von=self.session.user_id,
        )


# ============================================================
# Ombudsperson Configuration
# ============================================================

class OmbudspersonCollection(BaseHandler):
    """
    GET /api/hinschg/ombudspersonen - List Ombudspersonen
    POST /api/hinschg/ombudspersonen - Add Ombudsperson
    """
    check_roles = 'admin'

    @transact
    def _get_ombudspersonen(self, session):
        tid = self.request.tid
        configs = session.query(OmbudspersonConfig).filter(
            OmbudspersonConfig.tid == tid
        ).all()
        
        return [{
            'id': c.id,
            'user_id': c.user_id,
            'ist_extern': c.ist_extern,
            'organisation': c.organisation,
            'qualifikation': c.qualifikation,
            'vertretung_user_id': c.vertretung_user_id,
            'aktiv': c.aktiv,
        } for c in configs]

    def get(self):
        return self._get_ombudspersonen()

    @transact
    def _create_ombudsperson(self, session, request):
        tid = self.request.tid
        now = datetime_now()
        
        config = OmbudspersonConfig({
            'tid': tid,
            'user_id': request['user_id'],
            'ist_extern': request.get('ist_extern', False),
            'organisation': request.get('organisation', ''),
            'qualifikation': request.get('qualifikation', ''),
            'vertretung_user_id': request.get('vertretung_user_id'),
            'aktiv': True,
            'created_at': now,
            'updated_at': now,
        })
        session.add(config)
        session.flush()
        
        return {
            'id': config.id,
            'user_id': config.user_id,
            'aktiv': config.aktiv,
        }

    def post(self):
        request = json.loads(self.request.content.read())
        return self._create_ombudsperson(request)


# ============================================================
# Deadline Management
# ============================================================

class HinschgFristenOverview(BaseHandler):
    """
    GET /api/hinschg/fristen - Overview of all deadlines
    """
    check_roles = {'admin', 'receiver'}

    @transact
    def _get_fristen(self, session):
        tid = self.request.tid
        
        fristen = session.query(HinweisFrist, HinweisCase).join(
            HinweisCase, HinweisCase.id == HinweisFrist.case_id
        ).filter(
            HinweisFrist.tid == tid,
            HinweisFrist.erledigt == False
        ).order_by(HinweisFrist.frist_datum).all()
        
        return [{
            'id': f.id,
            'case_id': f.case_id,
            'aktenzeichen': c.aktenzeichen,
            'frist_typ': f.frist_typ,
            'frist_datum': f.frist_datum.isoformat(),
            'eskaliert': f.eskaliert,
            'case_status': c.status,
        } for f, c in fristen]

    def get(self):
        return self._get_fristen()
