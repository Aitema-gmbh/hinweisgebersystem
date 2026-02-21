/**
 * aitema|Hinweis - Login Component
 * 
 * Primaer: Keycloak SSO Login (fuer Staff)
 * Fallback: Lokaler Login (Legacy - optional deaktivierbar)
 * 
 * Buerger-Flows sind NICHT betroffen - diese Komponente
 * ist nur fuer Staff (/login Route).
 */
import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { KeycloakAuthService } from '../../../../core/services/keycloak-auth.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'hw-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatIconModule,
  ],
  template: `
    <div class="login-container" role="main" aria-label="Anmeldung">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>aitema|Hinweis</mat-card-title>
          <mat-card-subtitle>Interner Zugang fuer Bearbeiter und Administratoren</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <!-- PRIMAER: Keycloak SSO Login -->
          <div class="sso-section">
            <p class="sso-info">
              Melden Sie sich mit Ihrem aitema-Organisationskonto an (Single Sign-On).
            </p>
            <button
              mat-raised-button
              color="primary"
              class="sso-button"
              (click)="loginWithKeycloak()"
              [disabled]="ssoLoading()"
              aria-label="Mit aitema SSO anmelden">
              @if (ssoLoading()) {
                <mat-spinner diameter="20" />
              } @else {
                <mat-icon>lock</mat-icon>
                Mit aitema SSO anmelden
              }
            </button>
          </div>

          <!-- Divider -->
          <div class="divider-wrapper">
            <mat-divider />
            <span class="divider-text">oder</span>
            <mat-divider />
          </div>

          <!-- FALLBACK: Lokaler Login -->
          <details class="legacy-section">
            <summary class="legacy-toggle">Lokaler Login (Fallback)</summary>
            <form [formGroup]="loginForm" (ngSubmit)="loginLocal()" class="legacy-form">
              <mat-form-field appearance="outline">
                <mat-label>E-Mail-Adresse</mat-label>
                <input
                  matInput
                  type="email"
                  formControlName="email"
                  required
                  autocomplete="email" />
                <mat-error>Bitte geben Sie eine gueltige E-Mail-Adresse ein</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Passwort</mat-label>
                <input
                  matInput
                  type="password"
                  formControlName="password"
                  required
                  autocomplete="current-password" />
              </mat-form-field>

              @if (mfaRequired()) {
                <mat-form-field appearance="outline">
                  <mat-label>MFA-Code (6-stellig)</mat-label>
                  <input
                    matInput
                    formControlName="mfa_code"
                    maxlength="6"
                    autocomplete="one-time-code" />
                </mat-form-field>
              }

              @if (error()) {
                <div class="error-message" role="alert">{{ error() }}</div>
              }

              <button
                mat-stroked-button
                color="primary"
                type="submit"
                [disabled]="loginForm.invalid || localLoading()"
                class="login-button">
                @if (localLoading()) {
                  <mat-spinner diameter="20" />
                } @else {
                  Anmelden
                }
              </button>
            </form>
          </details>
        </mat-card-content>

        <mat-card-footer class="card-footer">
          <small>
            Dieser Bereich ist ausschliesslich fuer autorisiertes Personal.
            Unbefugter Zugriff wird protokolliert.
          </small>
        </mat-card-footer>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
      padding: 1rem;
    }
    .login-card {
      max-width: 420px;
      width: 100%;
    }
    mat-card-header {
      margin-bottom: 1rem;
    }
    .sso-section {
      padding: 0.5rem 0 1rem;
    }
    .sso-info {
      color: rgba(0,0,0,0.6);
      font-size: 0.9rem;
      margin-bottom: 1rem;
    }
    .sso-button {
      width: 100%;
      height: 48px;
      font-size: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      justify-content: center;
    }
    .sso-button mat-icon {
      margin-right: 0.25rem;
    }
    .divider-wrapper {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin: 1.25rem 0;
    }
    .divider-wrapper mat-divider {
      flex: 1;
    }
    .divider-text {
      color: rgba(0,0,0,0.4);
      font-size: 0.8rem;
      white-space: nowrap;
    }
    .legacy-section {
      margin-top: 0.5rem;
    }
    .legacy-toggle {
      cursor: pointer;
      color: rgba(0,0,0,0.6);
      font-size: 0.85rem;
      user-select: none;
      padding: 0.5rem 0;
    }
    .legacy-toggle:hover {
      color: rgba(0,0,0,0.87);
    }
    .legacy-form {
      margin-top: 1rem;
    }
    mat-form-field {
      display: block;
      margin-bottom: 0.5rem;
    }
    .login-button {
      width: 100%;
      margin-top: 0.5rem;
    }
    .error-message {
      color: #d32f2f;
      background: #ffebee;
      padding: 0.75rem;
      border-radius: 4px;
      margin-bottom: 1rem;
      font-size: 0.9rem;
    }
    .card-footer {
      padding: 0.75rem 1rem;
      background: rgba(0,0,0,0.03);
      border-top: 1px solid rgba(0,0,0,0.08);
    }
    .card-footer small {
      color: rgba(0,0,0,0.45);
      font-size: 0.75rem;
    }
  `],
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
    // Falls bereits via Keycloak authentifiziert -> direkt weiterleiten
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
