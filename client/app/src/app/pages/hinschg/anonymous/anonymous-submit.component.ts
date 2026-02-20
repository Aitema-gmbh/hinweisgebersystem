import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';

interface SubmitResult {
  receipt_code: string;
  aktenzeichen: string;
  eingangsdatum: string;
  status: string;
  status_label: string;
}

@Component({
  selector: 'app-anonymous-submit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  template: `
    <div class="anon-container">

      <!-- Sicherheitshinweis-Banner -->
      <div class="security-banner" *ngIf="step < 4">
        <div class="security-icon">&#128274;</div>
        <div class="security-text">
          <strong>Maximale Anonymitaet:</strong> Fuer hoechste Sicherheit
          nutzen Sie den
          <a href="https://www.torproject.org" target="_blank" rel="noopener">Tor Browser</a>
          und unsere
          <span class="onion-address" *ngIf="onionAddress">
            .onion-Adresse: <code>{{ onionAddress }}</code>
          </span>
          <span *ngIf="!onionAddress">
            .onion-Adresse (wird nach dem Start des Tor-Dienstes angezeigt).
          </span>
          <span *ngIf="isTorConnection" class="tor-badge">
            &#10003; Tor-Verbindung erkannt
          </span>
        </div>
      </div>

      <!-- Schritt-Anzeige -->
      <div class="step-indicator" *ngIf="step < 4">
        <div class="step" [class.active]="step >= 1" [class.done]="step > 1">
          <span class="step-num">1</span>
          <span class="step-label">Kategorie</span>
        </div>
        <div class="step-connector" [class.done]="step > 1"></div>
        <div class="step" [class.active]="step >= 2" [class.done]="step > 2">
          <span class="step-num">2</span>
          <span class="step-label">Beschreibung</span>
        </div>
        <div class="step-connector" [class.done]="step > 2"></div>
        <div class="step" [class.active]="step >= 3" [class.done]="step > 3">
          <span class="step-num">3</span>
          <span class="step-label">Bestaetigung</span>
        </div>
      </div>

      <!-- SCHRITT 1: Kategorie -->
      <div class="form-card" *ngIf="step === 1">
        <h2>Anonyme Meldung - Schritt 1/3</h2>
        <h3>Welchen Bereich betrifft Ihre Meldung?</h3>
        <p class="hint">
          Gemaess §2 HinSchG koennen Verstoesse in folgenden Bereichen gemeldet werden:
        </p>

        <form [formGroup]="kategorieForm">
          <div class="kategorie-grid">
            <div
              *ngFor="let kat of kategorien"
              class="kategorie-card"
              [class.selected]="kategorieForm.get('kategorie')?.value === kat.value"
              (click)="selectKategorie(kat.value)"
              role="button"
              [attr.tabindex]="0"
              (keydown.enter)="selectKategorie(kat.value)"
            >
              <span class="kat-icon">{{ kat.icon }}</span>
              <span class="kat-label">{{ kat.label }}</span>
            </div>
          </div>

          <div class="nav-buttons">
            <button
              class="btn btn-primary"
              (click)="goToStep(2)"
              [disabled]="!kategorieForm.get('kategorie')?.value"
            >
              Weiter
            </button>
          </div>
        </form>
      </div>

      <!-- SCHRITT 2: Beschreibung -->
      <div class="form-card" *ngIf="step === 2">
        <h2>Anonyme Meldung - Schritt 2/3</h2>
        <h3>Beschreiben Sie den Sachverhalt</h3>

        <div class="privacy-note">
          <strong>Datenschutzhinweis:</strong> Vermeiden Sie es, persoenliche
          Angaben zu machen, die Ihre Identitaet preisgeben koennten.
          Keine Namen, Personalnummern oder spezifische Ortsangaben.
        </div>

        <form [formGroup]="beschreibungForm">
          <div class="form-group">
            <label for="hinweisTyp">Art des Hinweises (optional)</label>
            <input
              id="hinweisTyp"
              type="text"
              formControlName="hinweisTyp"
              class="form-control"
              placeholder="z.B. Korruption, Datenschutzverletzung..."
              maxlength="200"
            />
          </div>

          <div class="form-group">
            <label for="beschreibung">
              Beschreibung des Vorfalls *
              <span class="char-count">
                {{ beschreibungForm.get('beschreibung')?.value?.length || 0 }} / 50000
              </span>
            </label>
            <textarea
              id="beschreibung"
              formControlName="beschreibung"
              class="form-control"
              rows="12"
              placeholder="Beschreiben Sie den Vorfall so detailliert wie moeglich: Was ist geschehen? Wann? Wo (ohne genaue Ortsangaben)? Gibt es Beweise?"
              maxlength="50000"
            ></textarea>
            <div class="error-msg" *ngIf="beschreibungForm.get('beschreibung')?.invalid && beschreibungForm.get('beschreibung')?.touched">
              Mindestens 20 Zeichen erforderlich.
            </div>
          </div>

          <div class="nav-buttons">
            <button class="btn btn-secondary" (click)="goToStep(1)">Zurueck</button>
            <button
              class="btn btn-primary"
              (click)="goToStep(3)"
              [disabled]="beschreibungForm.invalid"
            >
              Weiter
            </button>
          </div>
        </form>
      </div>

      <!-- SCHRITT 3: Bestaetigung vor Absenden -->
      <div class="form-card" *ngIf="step === 3">
        <h2>Anonyme Meldung - Schritt 3/3</h2>
        <h3>Zusammenfassung und Bestaetigung</h3>

        <div class="summary-box">
          <div class="summary-item">
            <span class="summary-label">Kategorie:</span>
            <span class="summary-value">{{ getKategorieLabel(kategorieForm.get('kategorie')?.value) }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Beschreibung:</span>
            <span class="summary-value summary-text">
              {{ beschreibungForm.get('beschreibung')?.value | slice:0:200 }}
              <span *ngIf="(beschreibungForm.get('beschreibung')?.value?.length || 0) > 200">...</span>
            </span>
          </div>
        </div>

        <div class="important-notice">
          <h4>Wichtig: Bitte lesen Sie dies sorgfaeltig</h4>
          <ul>
            <li>Nach dem Absenden erhalten Sie einen <strong>einmaligen Receipt-Code</strong>.</li>
            <li>Dieser Code ist Ihr einziger Zugang zum Status Ihrer Meldung.</li>
            <li><strong>Notieren oder drucken Sie den Code sofort</strong> - er kann nicht wiederhergestellt werden.</li>
            <li>Ihre Meldung wird anonym verarbeitet. Kein Name, keine IP-Adresse wird gespeichert.</li>
          </ul>
        </div>

        <div class="nav-buttons">
          <button class="btn btn-secondary" (click)="goToStep(2)" [disabled]="isSubmitting">
            Zurueck
          </button>
          <button
            class="btn btn-danger"
            (click)="submitMeldung()"
            [disabled]="isSubmitting"
          >
            <span *ngIf="!isSubmitting">Meldung jetzt anonym einreichen</span>
            <span *ngIf="isSubmitting">Wird eingereicht...</span>
          </button>
        </div>

        <div class="error-msg" *ngIf="submitError">
          {{ submitError }}
        </div>
      </div>

      <!-- SCHRITT 4: Erfolg + Receipt-Code -->
      <div class="form-card success-card" *ngIf="step === 4 && submitResult">
        <div class="success-icon">&#10003;</div>
        <h2>Meldung erfolgreich eingereicht</h2>
        <p>Aktenzeichen: <strong>{{ submitResult.aktenzeichen }}</strong></p>

        <div class="receipt-code-display">
          <h3>Ihr Receipt-Code</h3>
          <div class="receipt-code-box">
            <code class="receipt-code">{{ submitResult.receipt_code }}</code>
          </div>
          <p class="receipt-warning">
            Notieren Sie diesen Code jetzt! Er ist Ihr einziger Zugang
            zum Status Ihrer Meldung und kann nicht wiederhergestellt werden.
          </p>
        </div>

        <!-- Druckbare Receipt-Code-Karte -->
        <div class="receipt-card print-area" id="receipt-print-card">
          <div class="receipt-card-header">
            <strong>aitema | Hinweis</strong>
            <span>Anonymer Meldekanal</span>
          </div>
          <div class="receipt-card-body">
            <div class="receipt-card-field">
              <span>Aktenzeichen:</span>
              <strong>{{ submitResult.aktenzeichen }}</strong>
            </div>
            <div class="receipt-card-field">
              <span>Receipt-Code:</span>
              <strong class="receipt-code-print">{{ submitResult.receipt_code }}</strong>
            </div>
            <div class="receipt-card-field">
              <span>Eingegangen:</span>
              <strong>{{ submitResult.eingangsdatum | date:'dd.MM.yyyy HH:mm' }}</strong>
            </div>
            <div class="receipt-card-field">
              <span>Status-URL:</span>
              <strong>/hinschg/anonym/status</strong>
            </div>
          </div>
          <div class="receipt-card-footer">
            Bewahren Sie diese Karte sicher auf. Kein Dritter sollte Zugang erhalten.
          </div>
        </div>

        <div class="action-buttons">
          <button class="btn btn-secondary" (click)="printReceiptCard()">
            Karte drucken
          </button>
          <button class="btn btn-primary" (click)="goToStatus()">
            Status meiner Meldung
          </button>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .anon-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px 16px;
      font-family: var(--font-family, sans-serif);
    }

    .security-banner {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: #e8f5e9;
      border: 1px solid #4caf50;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 24px;
      font-size: 14px;
    }
    .security-icon { font-size: 24px; flex-shrink: 0; }
    .onion-address code { font-size: 12px; word-break: break-all; }
    .tor-badge { color: #2e7d32; font-weight: 700; margin-left: 8px; }

    .step-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 32px;
    }
    .step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .step-num {
      width: 32px; height: 32px;
      border-radius: 50%;
      background: #e0e0e0;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700;
    }
    .step.active .step-num { background: #1976d2; color: white; }
    .step.done .step-num { background: #4caf50; color: white; }
    .step-label { font-size: 12px; color: #666; }
    .step-connector { flex: 1; height: 2px; background: #e0e0e0; margin: 0 8px; max-width: 80px; }
    .step-connector.done { background: #4caf50; }

    .form-card {
      background: white;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.1);
    }
    .form-card h2 { margin: 0 0 8px; color: #1976d2; }
    .form-card h3 { margin: 0 0 16px; color: #333; }

    .hint { color: #666; font-size: 14px; margin-bottom: 16px; }

    .privacy-note {
      background: #fff3e0;
      border-left: 4px solid #ff9800;
      padding: 12px 16px;
      border-radius: 4px;
      font-size: 14px;
      margin-bottom: 20px;
    }

    .kategorie-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
      margin-bottom: 24px;
    }
    .kategorie-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 16px 12px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }
    .kategorie-card:hover { border-color: #1976d2; background: #e3f2fd; }
    .kategorie-card.selected { border-color: #1976d2; background: #e3f2fd; }
    .kat-icon { font-size: 28px; }
    .kat-label { font-size: 12px; color: #333; }

    .form-group { margin-bottom: 20px; }
    .form-group label {
      display: flex; justify-content: space-between;
      font-weight: 600; margin-bottom: 6px; font-size: 14px;
    }
    .char-count { font-weight: 400; color: #999; font-size: 12px; }
    .form-control {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #ccc;
      border-radius: 6px;
      font-size: 14px;
      font-family: inherit;
      resize: vertical;
      box-sizing: border-box;
    }
    .form-control:focus { outline: none; border-color: #1976d2; }

    .summary-box {
      background: #f5f5f5;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
    }
    .summary-item { display: flex; gap: 12px; margin-bottom: 8px; font-size: 14px; }
    .summary-label { font-weight: 600; min-width: 100px; color: #666; }
    .summary-text { max-height: 80px; overflow: hidden; }

    .important-notice {
      background: #fff8e1;
      border: 1px solid #ffc107;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .important-notice h4 { margin: 0 0 8px; color: #f57c00; }
    .important-notice ul { margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8; }

    .nav-buttons {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 24px;
    }

    .btn {
      padding: 10px 24px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary { background: #1976d2; color: white; }
    .btn-primary:hover:not(:disabled) { background: #1565c0; }
    .btn-secondary { background: #e0e0e0; color: #333; }
    .btn-secondary:hover:not(:disabled) { background: #bdbdbd; }
    .btn-danger { background: #d32f2f; color: white; }
    .btn-danger:hover:not(:disabled) { background: #b71c1c; }

    .error-msg { color: #d32f2f; font-size: 13px; margin-top: 8px; }

    .success-card { text-align: center; }
    .success-icon {
      width: 64px; height: 64px;
      background: #4caf50; color: white;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 32px;
      margin: 0 auto 16px;
    }

    .receipt-code-display {
      margin: 24px 0;
    }
    .receipt-code-box {
      background: #263238;
      padding: 20px 24px;
      border-radius: 8px;
      margin: 12px 0;
    }
    .receipt-code {
      color: #80cbc4;
      font-size: 28px;
      letter-spacing: 4px;
      font-family: monospace;
    }
    .receipt-warning {
      color: #d32f2f;
      font-weight: 600;
      font-size: 14px;
    }

    .receipt-card {
      border: 2px solid #333;
      border-radius: 8px;
      padding: 20px;
      margin: 24px 0;
      text-align: left;
      max-width: 400px;
      margin-left: auto;
      margin-right: auto;
    }
    .receipt-card-header {
      display: flex; justify-content: space-between;
      border-bottom: 1px solid #333;
      padding-bottom: 10px;
      margin-bottom: 12px;
      font-size: 14px;
    }
    .receipt-card-field {
      display: flex; justify-content: space-between;
      padding: 6px 0;
      font-size: 13px;
      border-bottom: 1px dotted #ccc;
    }
    .receipt-code-print { font-family: monospace; font-size: 16px; letter-spacing: 2px; }
    .receipt-card-footer {
      font-size: 11px;
      color: #666;
      margin-top: 12px;
      font-style: italic;
      text-align: center;
    }

    .action-buttons {
      display: flex;
      gap: 12px;
      justify-content: center;
      margin-top: 24px;
    }

    @media print {
      .anon-container > *:not(.print-area) { display: none !important; }
      .print-area { display: block !important; border: 2px solid black; }
    }
  `]
})
export class AnonymousSubmitComponent implements OnInit {
  step = 1;
  isSubmitting = false;
  submitError = '';
  submitResult: SubmitResult | null = null;
  isTorConnection = false;
  onionAddress = '';

  kategorieForm: FormGroup;
  beschreibungForm: FormGroup;

  kategorien = [
    { value: 'korruption', label: 'Korruption', icon: '&#128176;' },
    { value: 'straftat', label: 'Straftat', icon: '&#9878;&#65039;' },
    { value: 'datenschutz', label: 'Datenschutz', icon: '&#128274;' },
    { value: 'arbeitsschutz', label: 'Arbeitsschutz', icon: '&#128119;' },
    { value: 'umweltschutz', label: 'Umweltschutz', icon: '&#127807;' },
    { value: 'geldwaesche', label: 'Geldwaesche', icon: '&#128181;' },
    { value: 'verbraucherschutz', label: 'Verbraucherschutz', icon: '&#129508;' },
    { value: 'steuerbetrug', label: 'Steuerbetrug', icon: '&#128202;' },
    { value: 'verstoss_eu_recht', label: 'EU-Recht-Verstoss', icon: '&#127466;&#127482;' },
    { value: 'verstoss_bundesrecht', label: 'Bundesrecht', icon: '&#127465;&#127466;' },
    { value: 'ordnungswidrigkeit', label: 'Ordnungswidrigkeit', icon: '&#9888;&#65039;' },
    { value: 'sonstiges', label: 'Sonstiges', icon: '&#128196;' },
  ];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
  ) {
    this.kategorieForm = this.fb.group({
      kategorie: ['', Validators.required],
    });

    this.beschreibungForm = this.fb.group({
      hinweisTyp: [''],
      beschreibung: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(50000)]],
    });
  }

  ngOnInit(): void {
    // Tor-Verbindung und Onion-Adresse laden
    this.http.get<{ via_tor: boolean; onion_address?: string }>(
      '/api/hinschg/anonymous/info'
    ).subscribe({
      next: (info) => {
        this.isTorConnection = info.via_tor;
        this.onionAddress = info.onion_address || '';
      },
      error: () => { /* Info-Endpunkt optional */ }
    });
  }

  selectKategorie(value: string): void {
    this.kategorieForm.patchValue({ kategorie: value });
  }

  getKategorieLabel(value: string): string {
    return this.kategorien.find(k => k.value === value)?.label || value;
  }

  goToStep(n: number): void {
    if (n === 2 && this.kategorieForm.invalid) return;
    if (n === 3 && this.beschreibungForm.invalid) {
      this.beschreibungForm.markAllAsTouched();
      return;
    }
    this.step = n;
    window.scrollTo(0, 0);
  }

  submitMeldung(): void {
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    this.submitError = '';

    const payload = {
      kategorie: this.kategorieForm.get('kategorie')?.value,
      beschreibung: this.beschreibungForm.get('beschreibung')?.value,
      hinweis_typ: this.beschreibungForm.get('hinweisTyp')?.value || undefined,
    };

    this.http.post<SubmitResult>('/api/hinschg/anonymous/submit', payload).subscribe({
      next: (result) => {
        this.submitResult = result;
        this.step = 4;
        this.isSubmitting = false;
        window.scrollTo(0, 0);
      },
      error: (err) => {
        this.isSubmitting = false;
        if (err.status === 429) {
          this.submitError = 'Zu viele Anfragen. Bitte warten Sie und versuchen Sie es erneut.';
        } else {
          this.submitError = 'Fehler beim Einreichen. Bitte versuchen Sie es erneut.';
        }
      }
    });
  }

  printReceiptCard(): void {
    window.print();
  }

  goToStatus(): void {
    if (this.submitResult?.receipt_code) {
      this.router.navigate(['/hinschg/anonym/status'], {
        queryParams: { code: this.submitResult.receipt_code }
      });
    }
  }
}
