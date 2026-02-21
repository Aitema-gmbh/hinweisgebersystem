/**
 * aitema|Hinweis - Application Bootstrap
 * Keycloak SSO wird vor dem App-Start initialisiert (check-sso Mode).
 * Buerger-Flows sind nicht betroffen - check-sso blockiert nicht.
 */
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Component, APP_INITIALIZER } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';
import { keycloakTokenInterceptor } from './app/core/interceptors/keycloak-token.interceptor';
import { KeycloakAuthService } from './app/core/services/keycloak-auth.service';

@Component({
  selector: 'hw-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class AppComponent {}

/**
 * Keycloak-Initialisierung als APP_INITIALIZER.
 * Laeuft vor dem ersten Render - stellt sicher dass SSO-Status bekannt ist.
 * onLoad: 'check-sso' blockiert NICHT - Buerger koennen weiterhin anonym melden.
 */
function initializeKeycloak(keycloak: KeycloakAuthService) {
  return () => keycloak.init();
}

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([
        keycloakTokenInterceptor, // Keycloak JWT fuer Staff-API-Calls
        authInterceptor,           // Legacy-Token fuer Fallback
      ])
    ),
    provideAnimationsAsync(),
    // Keycloak SSO-Check beim App-Start (non-blocking fuer Buerger)
    {
      provide: APP_INITIALIZER,
      useFactory: initializeKeycloak,
      deps: [KeycloakAuthService],
      multi: true,
    },
  ],
}).catch((err) => console.error(err));
