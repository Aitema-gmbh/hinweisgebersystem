/**
 * aitema|Hinweis - Staff Auth Guard (Keycloak SSO)
 * Schuetzt alle Staff-Routen. Buerger-Flows (melden, status) bleiben unberuehrt.
 */
import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { KeycloakAuthService } from '../services/keycloak-auth.service';

export const staffAuthGuard: CanActivateFn = async () => {
  const keycloak = inject(KeycloakAuthService);

  if (keycloak.isAuthenticated()) {
    return true;
  }

  // Redirect zu Keycloak Login mit Rueckkehr-URL
  keycloak.login(window.location.href);
  return false;
};
