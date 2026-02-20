# -*- coding: utf-8 -*-
"""
HinSchG Metrics HTTP Handler
GET /api/hinschg/metrics
Returns Prometheus text format (version 0.0.4).
"""
from globaleaks.handlers.base import BaseHandler
from globaleaks.rest import errors
from globaleaks.services.hinschg.metrics import get_metrics_text
from twisted.internet import defer


class HinSchGMetricsHandler(BaseHandler):
    """
    Exposes HinSchG compliance metrics in Prometheus exposition format.

    Endpoint : GET /api/hinschg/metrics
    Content-Type: text/plain; version=0.0.4; charset=utf-8
    """

    check_roles = {"admin", "receiver"}  # restrict to authenticated roles

    @defer.inlineCallbacks
    def get(self):
        try:
            text = yield get_metrics_text()
        except Exception as exc:
            raise errors.InternalServerError(str(exc))

        self.request.setHeader(
            b"Content-Type",
            b"text/plain; version=0.0.4; charset=utf-8"
        )
        self.request.setHeader(b"Cache-Control", b"no-cache, max-age=0")
        defer.returnValue(text)
