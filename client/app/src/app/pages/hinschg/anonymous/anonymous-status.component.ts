import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, debounceTime } from 'rxjs';

interface Kommentar {
  id: string;
  nachricht: string;
  von_bearbeiter: boolean;
  created_at: string;
}

interface Frist {
  typ: string;
  label: string;
  frist_datum: string;
  erledigt: boolean;
}

interface StatusResult {
  aktenzeichen: string;
  kategorie: string;
  status: string;
  status_label: string;
  eingangsdatum: string;
  updated_at: string;
  kommentare: Kommentar[];
  fristen: Frist[];
}

/** Validator: Prueft ob ein Receipt-Code gueltig ist */
function receiptCodeValidator(control: AbstractControl) {
  const val: string = (control.value || '').toUpperCase().replace(/-/g, '').replace(/\s/g, '');
  if (val.length === 0) return null; // required handled separately
  if (val.length !== 16) return { invalidCode: true };
  const VALID_CHARS = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/;
  if (!VALID_CHARS.test(val)) return { invalidCode: true };
  return null;
}

@Component({
  selector: 'app-anonymous-status',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  template: `
    <div class="status-container">

      <!-- Code-Eingabe -->
      <div class="form-card" *ngIf="!statusResult && !isLoading">
        <h2>Meldungsstatus abfragen</h2>
        <p class="hint">
          Geben Sie Ihren 16-stelligen Receipt-Code ein, um den Status
          Ihrer anonymen Meldung zu sehen.
        </p>

        <form [formGroup]="codeForm" (ngSubmit)="lookupStatus()">
          <div class="form-group">
            <label for="receiptCode">Receipt-Code</label>
            <input
              id="receiptCode"
              type="text"
              formControlName="receiptCode"
              class="form-control code-input"
              placeholder="XXXX-XXXX-XXXX-XXXX"
              maxlength="19"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="characters"
              spellcheck="false"
              (input)="onCodeInput($event)"
            />
            <div class="error-msg" *ngIf="codeForm.get('receiptCode')?.invalid && codeForm.get('receiptCode')?.touched">
              <span *ngIf="codeForm.get('receiptCode')?.errors?.['required']">Bitte geben Sie Ihren Receipt-Code ein.</span>
              <span *ngIf="codeForm.get('receiptCode')?.errors?.['invalidCode']">Ungueltige Zeichen oder falsche Laenge (16 Stellen erforderlich).</span>
            </div>
            <div class="code-help">
              Erlaubte Zeichen: A-Z (ohne I, O) und 2-9. Bindestriche werden automatisch gesetzt.
            </div>
          </div>

          <div class="error-msg" *ngIf="lookupError">{{ lookupError }}</div>

          <button
            type="submit"
            class="btn btn-primary"
            [disabled]="codeForm.invalid || isLoading"
          >
            Status abrufen
          </button>
        </form>
      </div>

      <!-- Ladeanimation -->
      <div class="loading-card" *ngIf="isLoading">
        <div class="spinner"></div>
        <p>Status wird abgerufen...</p>
      </div>

      <!-- Status-Anzeige -->
      <div *ngIf="statusResult && !isLoading">

        <div class="result-header">
          <h2>Meldungsstatus</h2>
          <button class="btn btn-secondary btn-sm" (click)="resetLookup()">
            Anderen Code eingeben
          </button>
        </div>

        <!-- Status-Badge + Aktenzeichen -->
        <div class="form-card meta-card">
          <div class="meta-row">
            <span class="meta-label">Aktenzeichen:</span>
            <strong>{{ statusResult.aktenzeichen }}</strong>
          </div>
          <div class="meta-row">
            <span class="meta-label">Kategorie:</span>
            <span>{{ statusResult.kategorie }}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Status:</span>
            <span class="status-badge" [class]="'status-' + statusResult.status">
              {{ statusResult.status_label }}
            </span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Eingegangen:</span>
            <span>{{ statusResult.eingangsdatum | date:'dd.MM.yyyy HH:mm' }}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Zuletzt aktualisiert:</span>
            <span>{{ statusResult.updated_at | date:'dd.MM.yyyy HH:mm' }}</span>
          </div>
        </div>

        <!-- Timeline / Fristen -->
        <div class="form-card">
          <h3>Gesetzliche Fristen (HinSchG)</h3>
          <div class="timeline">
            <div
              *ngFor="let frist of statusResult.fristen"
              class="timeline-item"
              [class.done]="frist.erledigt"
              [class.overdue]="!frist.erledigt && isFristOverdue(frist.frist_datum)"
            >
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <div class="timeline-label">{{ frist.label }}</div>
                <div class="timeline-date">
                  Frist: {{ frist.frist_datum | date:'dd.MM.yyyy' }}
                  <span class="frist-status" *ngIf="frist.erledigt"> - Erledigt</span>
                  <span class="frist-overdue" *ngIf="!frist.erledigt && isFristOverdue(frist.frist_datum)">
                    - Ueberfaellig
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Nachrichten-Timeline -->
        <div class="form-card" *ngIf="statusResult.kommentare.length > 0">
          <h3>Nachrichten vom Bearbeiter</h3>
          <div class="message-list">
            <div
              *ngFor="let msg of statusResult.kommentare"
              class="message-item"
              [class.from-bearbeiter]="msg.von_bearbeiter"
              [class.from-melder]="!msg.von_bearbeiter"
            >
              <div class="message-meta">
                <span class="message-from">
                  {{ msg.von_bearbeiter ? 'Bearbeiter' : 'Sie' }}
                </span>
                <span class="message-date">
                  {{ msg.created_at | date:'dd.MM.yyyy HH:mm' }}
                </span>
              </div>
              <div class="message-text">{{ msg.nachricht }}</div>
            </div>
          </div>
        </div>

        <!-- Nachricht senden -->
        <div class="form-card">
          <h3>Nachricht senden</h3>
          <p class="hint">
            Sie koennen anonym mit dem Bearbeiter kommunizieren.
            Vermeiden Sie persoenliche Angaben.
          </p>

          <form [formGroup]="messageForm" (ngSubmit)="sendMessage()">
            <div class="form-group">
              <label for="nachricht">
                Ihre Nachricht
                <span class="char-count">
                  {{ messageForm.get('nachricht')?.value?.length || 0 }} / 4000
                </span>
              </label>
              <textarea
                id="nachricht"
                formControlName="nachricht"
                class="form-control"
                rows="5"
                placeholder="Schreiben Sie Ihre anonyme Nachricht..."
                maxlength="4000"
              ></textarea>
              <div class="error-msg" *ngIf="messageForm.get('nachricht')?.invalid && messageForm.get('nachricht')?.touched">
                Mindestens 5 Zeichen erforderlich.
              </div>
            </div>

            <div class="success-msg" *ngIf="messageSent">
              Nachricht wurde gesendet.
            </div>
            <div class="error-msg" *ngIf="messageError">{{ messageError }}</div>

            <button
              type="submit"
              class="btn btn-primary"
              [disabled]="messageForm.invalid || isSendingMessage"
            >
              <span *ngIf="!isSendingMessage">Nachricht senden</span>
              <span *ngIf="isSendingMessage">Wird gesendet...</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .status-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px 16px;
    }

    .form-card {
      background: white;
      border-radius: 12px;
      padding: 28px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    .form-card h2 { margin: 0 0 8px; color: #1976d2; }
    .form-card h3 { margin: 0 0 16px; color: #333; }

    .hint { color: #666; font-size: 14px; margin-bottom: 20px; }

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
      box-sizing: border-box;
    }
    .form-control:focus { outline: none; border-color: #1976d2; }
    textarea.form-control { resize: vertical; }

    .code-input {
      font-family: monospace;
      font-size: 22px;
      letter-spacing: 3px;
      text-transform: uppercase;
      text-align: center;
    }
    .code-help { font-size: 12px; color: #999; margin-top: 4px; }

    .error-msg { color: #d32f2f; font-size: 13px; margin-bottom: 12px; }
    .success-msg { color: #2e7d32; font-size: 13px; margin-bottom: 12px; font-weight: 600; }

    .btn {
      padding: 10px 24px;
      border: none; border-radius: 6px;
      font-size: 14px; font-weight: 600;
      cursor: pointer; transition: all 0.2s;
    }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary { background: #1976d2; color: white; }
    .btn-primary:hover:not(:disabled) { background: #1565c0; }
    .btn-secondary { background: #e0e0e0; color: #333; }
    .btn-secondary:hover:not(:disabled) { background: #bdbdbd; }
    .btn-sm { padding: 6px 16px; font-size: 13px; }

    .loading-card {
      text-align: center;
      padding: 60px 20px;
    }
    .spinner {
      width: 48px; height: 48px;
      border: 4px solid #e0e0e0;
      border-top-color: #1976d2;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .result-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .result-header h2 { margin: 0; color: #1976d2; }

    .meta-card .meta-row {
      display: flex;
      gap: 16px;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
      font-size: 14px;
    }
    .meta-row:last-child { border-bottom: none; }
    .meta-label { min-width: 160px; color: #666; font-weight: 600; }

    .status-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
    }
    .status-eingegangen { background: #e3f2fd; color: #1565c0; }
    .status-in_pruefung { background: #fff3e0; color: #e65100; }
    .status-in_bearbeitung { background: #e8f5e9; color: #2e7d32; }
    .status-abgeschlossen { background: #f5f5f5; color: #616161; }
    .status-zurueckgewiesen { background: #ffebee; color: #b71c1c; }

    .timeline { padding: 8px 0; }
    .timeline-item {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      padding: 12px 0;
      border-bottom: 1px solid #f0f0f0;
      opacity: 0.6;
    }
    .timeline-item.done { opacity: 1; }
    .timeline-item.overdue { opacity: 1; }
    .timeline-dot {
      width: 12px; height: 12px;
      border-radius: 50%;
      background: #e0e0e0;
      margin-top: 4px;
      flex-shrink: 0;
    }
    .timeline-item.done .timeline-dot { background: #4caf50; }
    .timeline-item.overdue .timeline-dot { background: #f44336; }
    .timeline-label { font-size: 14px; font-weight: 600; }
    .timeline-date { font-size: 13px; color: #666; margin-top: 2px; }
    .frist-status { color: #4caf50; }
    .frist-overdue { color: #f44336; font-weight: 600; }

    .message-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
    .message-item {
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
    }
    .from-bearbeiter { background: #e3f2fd; align-self: flex-start; max-width: 85%; }
    .from-melder { background: #f5f5f5; align-self: flex-end; max-width: 85%; }
    .message-meta {
      display: flex; justify-content: space-between;
      font-size: 12px; color: #666; margin-bottom: 6px;
    }
    .message-from { font-weight: 600; }
    .message-text { line-height: 1.6; }
  `]
})
export class AnonymousStatusComponent implements OnInit, OnDestroy {
  codeForm: FormGroup;
  messageForm: FormGroup;

  isLoading = false;
  isSendingMessage = false;
  messageSent = false;
  messageError = '';
  lookupError = '';

  statusResult: StatusResult | null = null;
  currentCode = '';

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
  ) {
    this.codeForm = this.fb.group({
      receiptCode: ['', [Validators.required, receiptCodeValidator]],
    });

    this.messageForm = this.fb.group({
      nachricht: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(4000)]],
    });
  }

  ngOnInit(): void {
    // Code aus Query-Param vorausfuellen
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['code']) {
        const formatted = this.formatCodeForDisplay(params['code']);
        this.codeForm.patchValue({ receiptCode: formatted });
        this.lookupStatus();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Auto-Formatierung bei Eingabe: XXXXXXXXXXXXXXXX -> XXXX-XXXX-XXXX-XXXX */
  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let val = input.value.toUpperCase().replace(/[^A-Z2-9]/g, '');
    if (val.length > 16) val = val.slice(0, 16);

    // Bindestriche nach je 4 Zeichen einfuegen
    const formatted = val.match(/.{1,4}/g)?.join('-') || val;
    this.codeForm.patchValue({ receiptCode: formatted }, { emitEvent: false });
    input.value = formatted;
  }

  formatCodeForDisplay(code: string): string {
    const clean = code.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 16);
    return clean.match(/.{1,4}/g)?.join('-') || clean;
  }

  lookupStatus(): void {
    if (this.codeForm.invalid) {
      this.codeForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.lookupError = '';
    this.statusResult = null;

    const raw = (this.codeForm.get('receiptCode')?.value || '').replace(/-/g, '');
    this.currentCode = raw;

    this.http.get<StatusResult>(`/api/hinschg/anonymous/status/${raw}`).subscribe({
      next: (result) => {
        this.statusResult = result;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 404) {
          this.lookupError = 'Receipt-Code nicht gefunden. Bitte pruefen Sie die Eingabe.';
        } else if (err.status === 429) {
          this.lookupError = 'Zu viele Anfragen. Bitte warten Sie eine Minute.';
        } else {
          this.lookupError = 'Fehler beim Abrufen des Status. Bitte versuchen Sie es erneut.';
        }
      }
    });
  }

  resetLookup(): void {
    this.statusResult = null;
    this.currentCode = '';
    this.codeForm.reset();
    this.messageForm.reset();
    this.messageSent = false;
    this.messageError = '';
    this.lookupError = '';
  }

  isFristOverdue(fristDatum: string): boolean {
    return new Date(fristDatum) < new Date();
  }

  sendMessage(): void {
    if (this.messageForm.invalid || this.isSendingMessage) return;

    this.isSendingMessage = true;
    this.messageSent = false;
    this.messageError = '';

    const nachricht = this.messageForm.get('nachricht')?.value;

    this.http.post<{ success: boolean }>(
      `/api/hinschg/anonymous/message/${this.currentCode}`,
      { nachricht }
    ).subscribe({
      next: () => {
        this.isSendingMessage = false;
        this.messageSent = true;
        this.messageForm.reset();
        // Status neu laden um Nachricht anzuzeigen
        setTimeout(() => this.reloadStatus(), 500);
      },
      error: (err) => {
        this.isSendingMessage = false;
        if (err.status === 404) {
          this.messageError = 'Meldung nicht gefunden.';
        } else {
          this.messageError = 'Fehler beim Senden. Bitte versuchen Sie es erneut.';
        }
      }
    });
  }

  private reloadStatus(): void {
    if (!this.currentCode) return;
    this.http.get<StatusResult>(`/api/hinschg/anonymous/status/${this.currentCode}`).subscribe({
      next: (result) => { this.statusResult = result; },
      error: () => { /* Kein erneuter Fehler anzeigen */ }
    });
  }
}
