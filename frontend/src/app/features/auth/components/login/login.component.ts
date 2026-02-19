import { Component, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from "@angular/forms";
import { Router, ActivatedRoute } from "@angular/router";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { AuthService } from "../../../../core/services/auth.service";

@Component({
  selector: "hw-login",
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatCardModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="login-container" role="main" aria-label="Anmeldung">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>aitema|Hinweis - Anmeldung</mat-card-title>
          <mat-card-subtitle>Interner Zugang fuer Bearbeiter</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="loginForm" (ngSubmit)="login()">
            <mat-form-field appearance="outline">
              <mat-label>E-Mail-Adresse</mat-label>
              <input matInput type="email" formControlName="email" required autocomplete="email" />
              <mat-error>Bitte geben Sie eine gueltige E-Mail-Adresse ein</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Passwort</mat-label>
              <input matInput type="password" formControlName="password" required
                     autocomplete="current-password" />
            </mat-form-field>

            @if (mfaRequired()) {
              <mat-form-field appearance="outline">
                <mat-label>MFA-Code (6-stellig)</mat-label>
                <input matInput formControlName="mfa_code" maxlength="6"
                       autocomplete="one-time-code" />
              </mat-form-field>
            }

            @if (error()) {
              <div class="error-message" role="alert">{{ error() }}</div>
            }

            <button mat-raised-button color="primary" type="submit"
                    [disabled]="loginForm.invalid || loading()"
                    class="login-button">
              @if (loading()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                Anmelden
              }
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container { display: flex; justify-content: center; align-items: center; min-height: 80vh; }
    .login-card { max-width: 400px; width: 100%; padding: 1rem; }
    mat-form-field { display: block; margin-bottom: 0.5rem; }
    .login-button { width: 100%; margin-top: 1rem; }
    .error-message { color: #d32f2f; background: #ffebee; padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; }
  `],
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);
  mfaRequired = signal(false);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      email: ["", [Validators.required, Validators.email]],
      password: ["", Validators.required],
      mfa_code: [""],
    });
  }

  login(): void {
    if (this.loginForm.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set(null);

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParams["returnUrl"] || "/dashboard";
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.loading.set(false);
        if (err.error?.mfa_required) {
          this.mfaRequired.set(true);
          this.error.set("Bitte geben Sie Ihren MFA-Code ein");
        } else {
          this.error.set(err.error?.error ?? "Anmeldung fehlgeschlagen");
        }
      },
    });
  }
}
