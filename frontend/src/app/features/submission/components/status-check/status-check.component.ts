/**
 * aitema|Hinweis - Status Check Component
 * Status-Abfrage fuer anonyme Meldungen via Zugangscode.
 * Design: aitema Design-System 2026 | WCAG 2.1 AA
 */
import { Component, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { ApiService } from "../../../../core/services/api.service";

@Component({
  selector: "hw-status-check",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="status-wrapper" role="main" aria-label="Meldungsstatus pruefen">

      <!-- Hero -->
      @if (!statusData()) {
        <div class="status-hero">
          <div class="status-hero-icon" aria-hidden="true">&#128274;</div>
          <h1 class="status-hero-title">Status Ihrer Meldung</h1>
          <p class="status-hero-sub">
            Geben Sie Ihren pers&ouml;nlichen Zugangscode ein, um den aktuellen
            Bearbeitungsstand Ihrer anonymen Meldung abzurufen.
          </p>
        </div>
      }

      <!-- Code-Eingabe -->
      @if (!statusData() && !loading()) {
        <div class="glass-card">
          <div class="card-header-inner">
            <span class="card-section-tag">Zugangscode eingeben</span>
            <h2 class="card-title">Status abrufen</h2>
          </div>

          <form (ngSubmit)="checkStatus()" class="card-body" novalidate>
            <div class="field-group">
              <label class="field-label" for="accessCode">
                Zugangscode <span class="required">*</span>
              </label>
              <div class="code-input-wrap">
                <input
                  id="accessCode"
                  type="text"
                  [(ngModel)]="accessCode"
                  name="accessCode"
                  class="field-input code-input"
                  placeholder="Ihr pers&ouml;nlicher Zugangscode"
                  autocomplete="off"
                  autocorrect="off"
                  spellcheck="false"
                  [attr.aria-describedby]="'code-hint' + (error() ? ' code-err' : '')"
                />
              </div>
              <div class="field-hint" id="code-hint">
                Zugangscode aus der Eingangsbestaetigung Ihrer Meldung
              </div>
              @if (error()) {
                <div class="field-error" id="code-err" role="alert">
                  <span>&#9888;</span> {{ error() }}
                </div>
              }
            </div>

            <div class="form-actions">
              <button
                type="submit"
                class="btn-aitema btn-aitema--primary btn-full"
                [disabled]="accessCode.length < 8"
              >
                &#128269; Status abrufen
              </button>
            </div>
          </form>
        </div>
      }

      <!-- Ladeanimation -->
      @if (loading()) {
        <div class="loading-card" role="status" aria-live="polite" aria-label="Status wird geladen">
          <div class="spinner-ring" aria-hidden="true"></div>
          <p class="loading-text">Status wird sicher abgerufen &hellip;</p>
        </div>
      }

      <!-- Status-Anzeige -->
      @if (statusData() && !loading()) {
        <div role="region" aria-label="Ihr Meldungsstatus">

          <div class="result-topbar">
            <h2 class="result-title">Ihr Meldungsstatus</h2>
            <button type="button" class="btn-aitema btn-aitema--ghost btn-sm" (click)="reset()">
              &#8592; Anderen Code
            </button>
          </div>

          <!-- Meta Card -->
          <div class="glass-card meta-glass" role="list" aria-label="Meldungsdetails">
            <div class="meta-grid">
              <div class="meta-item" role="listitem">
                <span class="meta-key">Referenznummer</span>
                <strong class="meta-val meta-val--mono">{{ statusData()!.reference_code }}</strong>
              </div>
              <div class="meta-item" role="listitem">
                <span class="meta-key">Status</span>
                <span class="status-pill" [class]="getStatusPillClass(statusData()!.status)">
                  {{ translateStatus(statusData()!.status) }}
                </span>
              </div>
              <div class="meta-item" role="listitem">
                <span class="meta-key">Kategorie</span>
                <span class="meta-val">{{ statusData()!.kategorie }}</span>
              </div>
              <div class="meta-item" role="listitem">
                <span class="meta-key">Eingegangen am</span>
                <span class="meta-val">{{ statusData()!.eingegangen_am | date:'dd.MM.yyyy' }}</span>
              </div>
              <div class="meta-item" role="listitem">
                <span class="meta-key">Tage in Bearbeitung</span>
                <span class="meta-val">{{ statusData()!.tage_seit_eingang }} Tage</span>
              </div>
              <div class="meta-item" role="listitem">
                <span class="meta-key">Eingangsbestaetigung</span>
                <span class="meta-val">
                  <span class="frist-pill" [class.frist-pill--ok]="statusData()!.eingangsbestaetigung_gesendet"
                        [class.frist-pill--pending]="!statusData()!.eingangsbestaetigung_gesendet">
                    {{ statusData()!.eingangsbestaetigung_gesendet ? '&#10003; Gesendet' : '&#8987; Ausstehend' }}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <!-- Status Timeline -->
          <div class="glass-card">
            <div class="card-header-inner">
              <h3 class="card-title">Bearbeitungsverlauf</h3>
            </div>
            <div class="timeline-list" role="list" aria-label="Bearbeitungsverlauf">
              <div *ngFor="let step of getStatusTimeline(); let last = last"
                   class="timeline-entry"
                   [class.tl--done]="step.done"
                   [class.tl--active]="step.active"
                   role="listitem">
                <div class="tl-dot-wrap">
                  <div class="tl-dot" [attr.aria-label]="step.done ? 'Abgeschlossen' : step.active ? 'Aktuell' : 'Ausstehend'"></div>
                  <div class="tl-connector" *ngIf="!last"></div>
                </div>
                <div class="tl-content">
                  <div class="tl-label">{{ step.label }}</div>
                  <div class="tl-state">
                    <span *ngIf="step.done" class="tl-badge tl-badge--done">&#10003; Erledigt</span>
                    <span *ngIf="step.active" class="tl-badge tl-badge--active">&#9679; Aktuell</span>
                    <span *ngIf="!step.done && !step.active" class="tl-badge tl-badge--pending">&#8987; Ausstehend</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Hinweis zur Frist -->
          @if (!statusData()!.eingangsbestaetigung_gesendet && statusData()!.tage_seit_eingang > 5) {
            <div class="aitema-alert aitema-alert--warning" role="alert">
              <span class="alert-icon">&#9200;</span>
              <div>
                <strong>Hinweis:</strong> Die Eingangsbestaetigung ist gema&szlig; HinSchG innerhalb von
                7 Tagen zu versenden. Bei Verz&ouml;gerung kontaktieren Sie bitte Ihre zust&auml;ndige Stelle.
              </div>
            </div>
          }

          <!-- Neue Suche -->
          <div class="form-actions form-actions--center">
            <button type="button" class="btn-aitema btn-aitema--ghost" (click)="reset()">
              Anderen Code eingeben
            </button>
            <a routerLink="/meldung" class="btn-aitema btn-aitema--primary">
              Neue Meldung einreichen
            </a>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    :host { display: block; }

    .status-wrapper {
      max-width: 680px;
      margin: 0 auto;
      padding: 0 1rem 3rem;
      font-family: "Inter", system-ui, sans-serif;
    }

    /* HERO */
    .status-hero {
      text-align: center;
      padding: 2.5rem 1rem 2rem;
    }
    .status-hero-icon { font-size: 3rem; margin-bottom: 1rem; }
    .status-hero-title {
      font-size: 1.75rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 0.5rem;
      letter-spacing: -0.02em;
    }
    .status-hero-sub {
      color: #64748b;
      font-size: 0.9375rem;
      max-width: 480px;
      margin: 0 auto;
      line-height: 1.6;
    }

    /* GLASS CARD */
    .glass-card {
      background: rgba(255,255,255,0.97);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      box-shadow: 0 4px 24px rgba(15,23,42,0.08), 0 1px 4px rgba(15,23,42,0.04);
      overflow: hidden;
      margin-bottom: 1.5rem;
    }
    .card-header-inner { padding: 1.5rem 1.5rem 0; }
    .card-body { padding: 1.25rem 1.5rem 1.5rem; }
    .card-section-tag {
      display: inline-flex;
      padding: 0.2rem 0.625rem;
      background: rgba(59,130,246,0.08);
      color: #2563eb;
      border-radius: 9999px;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin-bottom: 0.625rem;
    }
    .card-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 1.25rem;
      letter-spacing: -0.01em;
    }

    /* CODE INPUT */
    .field-group { margin-bottom: 1.25rem; }
    .field-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
      font-size: 0.875rem;
      color: #334155;
      margin-bottom: 0.4rem;
    }
    .required { color: #ef4444; }
    .field-input {
      width: 100%;
      padding: 0.625rem 0.875rem;
      border: 1.5px solid #e2e8f0;
      border-radius: 0.5rem;
      font-size: 1rem;
      font-family: inherit;
      color: #0f172a;
      background: #fff;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
      box-sizing: border-box;
    }
    .field-input:hover { border-color: #94a3b8; }
    .field-input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
    }
    .code-input {
      font-family: "Courier New", Courier, monospace;
      font-size: 1.125rem;
      letter-spacing: 0.08em;
    }
    .field-hint  { font-size: 0.8125rem; color: #94a3b8; margin-top: 0.375rem; }
    .field-error {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      color: #dc2626;
      font-size: 0.8125rem;
      margin-top: 0.375rem;
      font-weight: 600;
    }

    /* LOADING */
    .loading-card {
      text-align: center;
      padding: 4rem 2rem;
      background: rgba(255,255,255,0.97);
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      margin-bottom: 1.5rem;
    }
    .spinner-ring {
      width: 3rem; height: 3rem;
      border: 3px solid #e2e8f0;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.9s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading-text { color: #64748b; font-size: 0.9375rem; }

    /* RESULT */
    .result-topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
    }
    .result-title { font-size: 1.25rem; font-weight: 700; color: #0f172a; margin: 0; }

    /* META GRID */
    .meta-glass { padding: 0; }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
      gap: 0;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #f1f5f9;
      border-right: 1px solid #f1f5f9;
    }
    .meta-item:nth-child(2n) { border-right: none; }
    .meta-key {
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #94a3b8;
    }
    .meta-val { font-size: 0.9375rem; font-weight: 600; color: #0f172a; }
    .meta-val--mono { font-family: "Courier New", Courier, monospace; letter-spacing: 0.05em; }

    /* STATUS PILL */
    .status-pill {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    .status-pill--eingegangen        { background: #dbeafe; color: #1e40af; }
    .status-pill--eingangsbestaetigung { background: #e0e7ff; color: #3730a3; }
    .status-pill--in_pruefung         { background: #fef3c7; color: #92400e; }
    .status-pill--in_bearbeitung      { background: #d1fae5; color: #065f46; }
    .status-pill--rueckmeldung        { background: #f3e8ff; color: #6b21a8; }
    .status-pill--abgeschlossen       { background: #f1f5f9; color: #475569; }
    .status-pill--abgelehnt           { background: #fee2e2; color: #991b1b; }

    /* FRIST PILL */
    .frist-pill {
      display: inline-flex;
      align-items: center;
      padding: 0.2rem 0.625rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .frist-pill--ok      { background: #d1fae5; color: #065f46; }
    .frist-pill--pending { background: #fef3c7; color: #92400e; }

    /* TIMELINE */
    .timeline-list { padding: 0.5rem 1.5rem 1.25rem; }
    .timeline-entry {
      display: flex;
      gap: 1rem;
      padding-bottom: 1rem;
    }
    .tl-dot-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 1.5rem;
      flex-shrink: 0;
    }
    .tl-dot {
      width: 0.875rem; height: 0.875rem;
      border-radius: 50%;
      background: #e2e8f0;
      border: 2px solid #e2e8f0;
      flex-shrink: 0;
      transition: all 0.2s ease;
    }
    .tl-connector {
      flex: 1; width: 2px; background: #e2e8f0;
      margin: 0.25rem 0; min-height: 1.5rem;
    }
    .tl--done .tl-dot { background: linear-gradient(135deg, #059669, #047857); border-color: #059669; }
    .tl--done .tl-connector { background: #d1fae5; }
    .tl--active .tl-dot { background: #3b82f6; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(59,130,246,0.2); }
    .tl-content { padding-top: 0.0625rem; flex: 1; }
    .tl-label { font-size: 0.9375rem; font-weight: 600; color: #0f172a; margin-bottom: 0.25rem; }
    .tl-state { font-size: 0.8125rem; }
    .tl-badge {
      display: inline-flex; align-items: center;
      padding: 0.125rem 0.5rem; border-radius: 9999px;
      font-size: 0.6875rem; font-weight: 700;
    }
    .tl-badge--done    { background: #d1fae5; color: #065f46; }
    .tl-badge--active  { background: #dbeafe; color: #1e40af; }
    .tl-badge--pending { background: #f1f5f9; color: #64748b; }

    /* ALERT */
    .aitema-alert {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      border-radius: 0.75rem;
      margin-bottom: 1.5rem;
      font-size: 0.875rem;
    }
    .aitema-alert--warning { background: #fffbeb; border: 1px solid #fcd34d; color: #92400e; }
    .alert-icon { font-size: 1.125rem; flex-shrink: 0; }

    /* BUTTONS */
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding-top: 0.5rem;
    }
    .form-actions--center { justify-content: center; flex-wrap: wrap; }
    .btn-aitema {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.625rem 1.375rem;
      border: none;
      border-radius: 0.5rem;
      font-family: inherit;
      font-size: 0.9375rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
    }
    .btn-aitema:disabled { opacity: 0.45; cursor: not-allowed; }
    .btn-aitema--primary {
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: #fff;
      box-shadow: 0 2px 8px rgba(59,130,246,0.3);
    }
    .btn-aitema--primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      box-shadow: 0 4px 16px rgba(59,130,246,0.4);
      transform: translateY(-1px);
    }
    .btn-aitema--ghost {
      background: transparent;
      border: 1.5px solid #e2e8f0;
      color: #64748b;
    }
    .btn-aitema--ghost:hover:not(:disabled) {
      background: #f8fafc;
      border-color: #cbd5e1;
      color: #0f172a;
    }
    .btn-full { width: 100%; justify-content: center; }
    .btn-sm   { padding: 0.4rem 0.875rem; font-size: 0.8125rem; }

    @media (max-width: 600px) {
      .meta-grid { grid-template-columns: 1fr; }
      .meta-item { border-right: none; }
      .form-actions--center { flex-direction: column; }
    }

    @media (prefers-reduced-motion: reduce) {
      .btn-aitema, .tl-dot { transition: none; }
      .spinner-ring { animation: none; }
    }

    @media (prefers-color-scheme: dark) {
      .status-hero-title { color: #f1f5f9; }
      .status-hero-sub   { color: #94a3b8; }
      .glass-card { background: #1e293b; border-color: #334155; }
      .card-title { color: #f1f5f9; }
      .field-input { background: #0f172a; border-color: #334155; color: #f1f5f9; }
      .result-title { color: #f1f5f9; }
      .meta-item { border-color: #334155; }
      .meta-val  { color: #f1f5f9; }
      .tl-label  { color: #f1f5f9; }
      .tl-connector { background: #334155; }
      .loading-card { background: #1e293b; border-color: #334155; }
    }
  `],
})
export class StatusCheckComponent {
  accessCode = "";
  loading = signal(false);
  statusData = signal<any>(null);
  error = signal<string | null>(null);

  statusFlow = [
    { key: "eingegangen",           label: "Meldung eingegangen" },
    { key: "eingangsbestaetigung",  label: "Eingangsbestaetigung (7 Tage)" },
    { key: "in_pruefung",          label: "In Pruefung" },
    { key: "in_bearbeitung",       label: "In Bearbeitung" },
    { key: "rueckmeldung",         label: "Rueckmeldung erteilt (3 Monate)" },
    { key: "abgeschlossen",        label: "Abgeschlossen" },
  ];

  statusMap: Record<string, string> = {
    eingegangen:           "Eingegangen",
    eingangsbestaetigung:  "Eingangsbestaetigung versendet",
    in_pruefung:          "In Pruefung",
    in_bearbeitung:       "In Bearbeitung",
    rueckmeldung:         "Rueckmeldung erteilt",
    abgeschlossen:        "Abgeschlossen",
    abgelehnt:            "Nicht im Anwendungsbereich",
  };

  constructor(private apiService: ApiService) {}

  checkStatus(): void {
    if (this.accessCode.length < 8) return;
    this.loading.set(true);
    this.error.set(null);
    this.statusData.set(null);

    this.apiService.checkStatus(this.accessCode).subscribe({
      next: (data) => {
        this.statusData.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error ?? "Meldung nicht gefunden oder ungueltiger Zugangscode.");
        this.loading.set(false);
      },
    });
  }

  reset(): void {
    this.statusData.set(null);
    this.error.set(null);
    this.accessCode = "";
  }

  translateStatus(status: string): string {
    return this.statusMap[status] ?? status;
  }

  getStatusPillClass(status: string): string {
    return "status-pill status-pill--" + status.replace(/_/g, "_");
  }

  getStatusTimeline(): { key: string; label: string; done: boolean; active: boolean }[] {
    const current = this.statusData()?.status;
    const currentIndex = this.statusFlow.findIndex(s => s.key === current);

    return this.statusFlow.map((s, i) => ({
      ...s,
      done:   i < currentIndex,
      active: i === currentIndex,
    }));
  }
}
