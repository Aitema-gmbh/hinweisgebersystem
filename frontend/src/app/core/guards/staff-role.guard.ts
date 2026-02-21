/**
 * aitema|Hinweis - Staff Role Guard (Keycloak Realm Roles)
 * Prueft Keycloak Realm-Rollen fuer feinkoernige Zugriffskontrolle.
 */
import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { KeycloakAuthService } from '../services/keycloak-auth.service';

export const staffRoleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const keycloak = inject(KeycloakAuthService);
  const router = inject(Router);

  const requiredRoles = route.data['roles'] as string[];
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }

  if (keycloak.hasAnyRole(requiredRoles)) {
    return true;
  }

  // Kein Zugriff -> Dashboard
  return router.createUrlTree(['/dashboard']);
};
