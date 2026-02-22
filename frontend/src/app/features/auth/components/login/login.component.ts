import { Component, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { KeycloakAuthService } from '../../../../core/services/keycloak-auth.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'hw-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
  ],
  template: `
    <div class="login-page-container animate-fadeInUp">
      <div class="aitema-card login-card">
        <div class="card-header">
          <h1 class="aitema-logo-badge">aitema|Hinweis</h1>
          <p class="card-subtitle">Interner Zugang für Bearbeiter</p>
        </div>

        <div class="card-content">
          <!-- PRIMAER: Keycloak SSO Login -->
          <div class="sso-section">
            <p class="sso-info">
              Anmeldung mit Ihrem Organisationskonto (Single Sign-On).
            </p>
            <button
              class="aitema-button aitema-button--primary sso-button"
              (click)="loginWithKeycloak()"
              [disabled]="ssoLoading()"
              aria-label="Mit SSO anmelden">
              @if (ssoLoading()) {
                <span>Prüfe Anmeldung...</span>
              } @else {
                <span>&#128274;</span> <!-- Lock Icon -->
                <span>Mit SSO anmelden</span>
              }
            </button>
          </div>

          <!-- Divider -->
          <div class="divider-wrapper">
            <hr class="divider">
            <span class="divider-text">oder</span>
            <hr class="divider">
          </div>

          <!-- FALLBACK: Lokaler Login -->
          <details class="legacy-section">
            <summary class="legacy-toggle">Lokaler Login (Fallback)</summary>
            <form [formGroup]="loginForm" (ngSubmit)="loginLocal()" class="legacy-form">
              <div class="form-group">
                <label for="email">E-Mail-Adresse</label>
                <input
                  id="email"
                  class="aitema-input"
                  type="email"
                  formControlName="email"
                  required
                  autocomplete="email" />
              </div>

              <div class="form-group">
                <label for="password">Passwort</label>
                <input
                  id="password"
                  class="aitema-input"
                  type="password"
                  formControlName="password"
                  required
                  autocomplete="current-password" />
              </div>

              @if (mfaRequired()) {
                <div class="form-group">
                  <label for="mfa_code">MFA-Code (6-stellig)</label>
                  <input
                    id="mfa_code"
                    class="aitema-input"
                    formControlName="mfa_code"
                    maxlength="6"
                    autocomplete="one-time-code" />
                </div>
              }

              @if (error()) {
                <div class="aitema-badge aitema-badge--critical error-message" role="alert">
                  {{ error() }}
                </div>
              }

              <button
                class="aitema-button aitema-button--secondary login-button"
                type="submit"
                [disabled]="loginForm.invalid || localLoading()">
                @if (localLoading()) {
                  <span>Anmeldung läuft...</span>
                } @else {
                  Anmelden
                }
              </button>
            </form>
          </details>
        </div>

        <div class="card-footer">
          <small>
            Dieser Bereich ist ausschließlich für autorisiertes Personal.
          </small>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .login-page-container {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 4rem 1rem;
    }
    .login-card {
      max-width: 420px;
      width: 100%;
      padding: 2rem;
    }
    .card-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    .card-subtitle {
      margin-top: 0.5rem;
      color: var(--aitema-muted);
    }
    .sso-info {
      font-size: 0.9rem;
      color: var(--aitema-muted);
      text-align: center;
      margin-bottom: 1rem;
    }
    .sso-button {
      width: 100%;
      height: 48px;
      font-size: 1rem;
      gap: 0.75rem;
    }
    .divider-wrapper {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin: 1.5rem 0;
    }
    .divider {
      flex: 1;
      border: none;
      height: 1px;
      background-color: var(--aitema-border);
    }
    .divider-text {
      font-size: 0.8rem;
      color: var(--aitema-muted);
      white-space: nowrap;
    }
    .legacy-toggle {
      cursor: pointer;
      color: var(--aitema-muted);
      font-size: 0.9rem;
      user-select: none;
      padding: 0.5rem 0;
    }
    .legacy-toggle:hover {
      color: var(--aitema-text);
    }
    .legacy-form {
      margin-top: 1rem;
    }
    .form-group {
      margin-bottom: 1rem;
    }
    .form-group label {
      display: block;
      font-weight: 500;
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
    }
    .login-button {
      width: 100%;
      margin-top: 1rem;
      background-color: var(--aitema-surface);
      border-color: var(--aitema-border);
      color: var(--aitema-text);
    }
    .login-button:hover {
      background-color: var(--aitema-bg);
      border-color: var(--aitema-slate-300);
    }
    .error-message {
      width: 100%;
      text-align: center;
      padding: 0.75rem;
      margin-bottom: 1rem;
    }
    .card-footer {
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid var(--aitema-border);
      text-align: center;
    }
    .card-footer small {
      color: var(--aitema-muted);
      font-size: 0.8rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  ssoLoading = signal(false);
  localLoading = signal(false);
  error = signal<string | null>(null);
  mfaRequired = signal(false);

  constructor(
    private fb: FormBuilder,
    private keycloakAuth: KeycloakAuthService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      mfa_code: [''],
    });
  }

  ngOnInit(): void {
    // If already authenticated via Keycloak -> redirect
    if (this.keycloakAuth.isAuthenticated()) {
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
      this.router.navigateByUrl(returnUrl);
    }
  }

  loginWithKeycloak(): void {
    this.ssoLoading.set(true);
    const returnUrl = this.route.snapshot.queryParams['returnUrl'];
    const redirectUri = returnUrl
      ? window.location.origin + returnUrl
      : window.location.origin + '/dashboard';
    this.keycloakAuth.login(redirectUri);
  }

  loginLocal(): void {
    if (this.loginForm.invalid || this.localLoading()) return;
    this.localLoading.set(true);
    this.error.set(null);

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.localLoading.set(false);
        if (err.error?.mfa_required) {
          this.mfaRequired.set(true);
          this.error.set('Bitte geben Sie Ihren MFA-Code ein');
        } else {
          this.error.set(err.error?.error ?? 'Anmeldung fehlgeschlagen');
        }
      },
    });
  }
}
