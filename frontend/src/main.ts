/**
 * aitema|Hinweis - Application Bootstrap
 * Keycloak SSO wird vor dem App-Start initialisiert (check-sso Mode).
 * Buerger-Flows sind nicht betroffen - check-sso blockiert nicht.
 */
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { APP_INITIALIZER } from '@angular/core';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';
import { keycloakTokenInterceptor } from './app/core/interceptors/keycloak-token.interceptor';
import { KeycloakAuthService } from './app/core/services/keycloak-auth.service';

function initializeKeycloak(keycloak: KeycloakAuthService) {
  return () => keycloak.init();
}

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([
        keycloakTokenInterceptor,
        authInterceptor,
      ])
    ),
    provideAnimationsAsync(),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeKeycloak,
      deps: [KeycloakAuthService],
      multi: true,
    },
  ],
}).catch((err) => console.error(err));
