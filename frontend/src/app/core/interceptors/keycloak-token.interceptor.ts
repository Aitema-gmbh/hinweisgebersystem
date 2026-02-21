/**
 * aitema|Hinweis - Keycloak Token Interceptor
 * Fuegt Keycloak JWT-Token fuer Staff-API-Calls hinzu.
 * Buerger-Flows (anonymous) werden NICHT modifiziert.
 */
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap, catchError, throwError } from 'rxjs';
import { KeycloakAuthService } from '../services/keycloak-auth.service';

// Staff-API-Endpunkte die ein Keycloak-Token benoetigen
const STAFF_API_PATTERNS = [
  '/api/v1/staff/',
  '/api/v1/cases',
  '/api/v1/submissions',
  '/api/v1/admin/',
  '/api/v1/dashboard',
  '/api/v1/auth/',
];

function isStaffRequest(url: string): boolean {
  return STAFF_API_PATTERNS.some((pattern) => url.includes(pattern));
}

export const keycloakTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const keycloak = inject(KeycloakAuthService);

  // Buerger-Flows unberuehrt lassen
  if (!isStaffRequest(req.url)) {
    return next(req);
  }

  // Kein Token -> direkt weiter (z.B. oeffentliche Endpunkte)
  if (!keycloak.isAuthenticated()) {
    return next(req);
  }

  // Token erneuern falls noetig, dann Request abschicken
  return from(keycloak.getValidToken()).pipe(
    switchMap((token) => {
      if (token) {
        const authReq = req.clone({
          setHeaders: { Authorization: `Bearer ${token}` },
        });
        return next(authReq);
      }
      return next(req);
    }),
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        keycloak.login(window.location.href);
      }
      return throwError(() => error);
    })
  );
};
