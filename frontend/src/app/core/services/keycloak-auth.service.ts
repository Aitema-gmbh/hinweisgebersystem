/**
 * aitema|Hinweis - Keycloak Auth Service
 * SSO-Authentifizierung fuer Staff-Bereich via Keycloak.
 * Buerger-Flows bleiben unberuehrt (anonymous).
 */
import { Injectable, signal, computed } from '@angular/core';
import Keycloak from 'keycloak-js';
import { environment } from '../../../environments/environment';

export interface KeycloakUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

@Injectable({ providedIn: 'root' })
export class KeycloakAuthService {
  private keycloak: Keycloak;

  private authenticatedSignal = signal<boolean>(false);
  private userSignal = signal<KeycloakUser | null>(null);

  readonly isAuthenticated = this.authenticatedSignal.asReadonly();
  readonly currentUser = this.userSignal.asReadonly();
  readonly isReady = signal<boolean>(false);

  constructor() {
    this.keycloak = new Keycloak({
      url: environment.keycloakUrl,
      realm: environment.keycloakRealm,
      clientId: environment.keycloakClientId,
    });

    // Token-Refresh automatisch wenn Token ablaeuft
    this.keycloak.onTokenExpired = () => {
      this.keycloak
        .updateToken(30)
        .then((refreshed) => {
          if (refreshed) {
            console.log('[KeycloakAuth] Token refreshed');
          }
        })
        .catch(() => {
          console.warn('[KeycloakAuth] Token refresh failed, logging out');
          this.logout();
        });
    };
  }

  async init(): Promise<boolean> {
    try {
      const authenticated = await this.keycloak.init({
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri:
          window.location.origin + '/assets/silent-check-sso.html',
        checkLoginIframe: false,
        pkceMethod: 'S256',
      });

      this.authenticatedSignal.set(authenticated);

      if (authenticated) {
        this.updateUserFromToken();
      }

      this.isReady.set(true);
      return authenticated;
    } catch (e) {
      console.error('[KeycloakAuth] Initialization failed', e);
      this.isReady.set(true);
      return false;
    }
  }

  login(redirectUri?: string): void {
    this.keycloak.login({
      redirectUri: redirectUri ?? window.location.href,
    });
  }

  logout(redirectUri?: string): void {
    const uri = redirectUri ?? window.location.origin + '/login';
    this.keycloak.logout({ redirectUri: uri });
    this.authenticatedSignal.set(false);
    this.userSignal.set(null);
  }

  getToken(): string | undefined {
    return this.keycloak.token;
  }

  async getValidToken(): Promise<string | undefined> {
    try {
      // Token erneuern wenn er in weniger als 30 Sekunden ablaeuft
      await this.keycloak.updateToken(30);
      return this.keycloak.token;
    } catch {
      return undefined;
    }
  }

  hasRole(role: string): boolean {
    return this.keycloak.hasRealmRole(role);
  }

  hasAnyRole(roles: string[]): boolean {
    return roles.some((role) => this.keycloak.hasRealmRole(role));
  }

  getUsername(): string {
    return this.keycloak.tokenParsed?.['preferred_username'] ?? '';
  }

  private updateUserFromToken(): void {
    const parsed = this.keycloak.tokenParsed;
    if (!parsed) return;

    const realmRoles: string[] =
      parsed['realm_access']?.['roles'] ?? [];

    this.userSignal.set({
      id: parsed['sub'] ?? '',
      username: parsed['preferred_username'] ?? '',
      email: parsed['email'] ?? '',
      firstName: parsed['given_name'] ?? '',
      lastName: parsed['family_name'] ?? '',
      roles: realmRoles,
    });
  }
}
