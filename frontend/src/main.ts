/**
 * aitema|Hinweis - Application Bootstrap
 * Keycloak SSO wird vor dem App-Start initialisiert (check-sso Mode).
 * Buerger-Flows sind nicht betroffen - check-sso blockiert nicht.
 */
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Component, OnInit, APP_INITIALIZER } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';
import { keycloakTokenInterceptor } from './app/core/interceptors/keycloak-token.interceptor';
import { KeycloakAuthService } from './app/core/services/keycloak-auth.service';
import { LanguageSwitcherComponent } from './app/shared/components/language-switcher/language-switcher.component';
import { I18nService } from './app/services/i18n.service';

@Component({
  selector: 'hw-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, LanguageSwitcherComponent],
  template: `
    <!-- Global Navigation Bar -->
    <header class="aitema-navbar" role="banner">
      <div class="navbar-inner">
        <a routerLink="/" class="navbar-brand" aria-label="aitema Hinweisgebersystem - Startseite">
          <span class="brand-icon" aria-hidden="true">&#128274;</span>
          <span class="brand-text">aitema<span class="brand-pipe">|</span>Hinweis</span>
        </a>

        <nav class="navbar-links" role="navigation" [attr.aria-label]="i18n.get('NAV_HOME')">
          <a routerLink="/melden" routerLinkActive="active" class="nav-link">
            {{ i18n.get('NAV_REPORT') }}
          </a>
          <a routerLink="/status" routerLinkActive="active" class="nav-link">
            {{ i18n.get('NAV_STATUS') }}
          </a>
        </nav>

        <div class="navbar-actions">
          <hw-language-switcher></hw-language-switcher>
          <a routerLink="/login" class="nav-link-login" [attr.aria-label]="i18n.get('NAV_LOGIN')">
            {{ i18n.get('NAV_LOGIN') }}
          </a>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main id="main-content" tabindex="-1">
      <router-outlet />
    </main>

    <!-- Skip Link (Accessibility) -->
    <a href="#main-content" class="skip-link">Zum Hauptinhalt springen</a>
  `,
  styles: [`
    :host { display: block; }
    .skip-link {
      position: absolute; top: -100%; left: 1rem; z-index: 9999;
      padding: 0.5rem 1rem; background: #1e3a5f; color: #fff;
      border-radius: 0 0 0.5rem 0.5rem; font-weight: 700;
      text-decoration: none; transition: top 0.2s;
    }
    .skip-link:focus { top: 0; }
    .aitema-navbar {
      position: sticky; top: 0; z-index: 500;
      background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
      color: #fff; box-shadow: 0 2px 16px rgba(15,23,42,0.18);
    }
    .navbar-inner {
      display: flex; align-items: center; justify-content: space-between;
      max-width: 1200px; margin: 0 auto; padding: 0.875rem 1.5rem; gap: 1.5rem;
    }
    .navbar-brand {
      display: flex; align-items: center; gap: 0.5rem;
      text-decoration: none; color: #fff; font-weight: 800;
      font-size: 1.125rem; letter-spacing: -0.02em; flex-shrink: 0;
    }
    .brand-pipe { color: #3b82f6; margin: 0 0.1rem; }
    .navbar-links { display: flex; align-items: center; gap: 0.25rem; flex: 1; }
    .nav-link {
      padding: 0.4rem 0.875rem; border-radius: 0.5rem; text-decoration: none;
      color: rgba(255,255,255,0.75); font-size: 0.875rem; font-weight: 500;
      transition: all 0.18s ease; white-space: nowrap;
    }
    .nav-link:hover { color: #fff; background: rgba(255,255,255,0.1); }
    .nav-link.active { color: #fff; background: rgba(59,130,246,0.25); }
    .navbar-actions { display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0; }
    .nav-link-login {
      padding: 0.375rem 0.875rem; border: 1.5px solid rgba(255,255,255,0.3);
      border-radius: 0.5rem; text-decoration: none; color: rgba(255,255,255,0.85);
      font-size: 0.8125rem; font-weight: 600; transition: all 0.18s ease; white-space: nowrap;
    }
    .nav-link-login:hover { background: rgba(255,255,255,0.1); color: #fff; }
    main { min-height: calc(100vh - 64px); }
    :host-context([dir="rtl"]) .navbar-inner { flex-direction: row-reverse; }
    @media (max-width: 640px) {
      .navbar-inner { padding: 0.75rem 1rem; gap: 0.75rem; }
      .navbar-links { display: none; }
    }
  `]
})
export class AppComponent implements OnInit {
  constructor(public i18n: I18nService) {}
  ngOnInit(): void {}
}

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
