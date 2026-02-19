/**
 * HinSchG New Case Component
 * 
 * Form for creating new whistleblower cases.
 * WCAG 2.1 AA compliant with:
 * - Proper form labels and descriptions
 * - Error identification and suggestions
 * - Progress indication
 */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { HinschgService, KATEGORIE_LABELS } from '../../../services/hinschg.service';

@Component({
  selector: 'app-hinschg-new-case',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <main class="new-case-page" role="main" id="main-content">
      <a routerLink="/hinschg/cases" class="back-link">&larr; Zurueck zur Uebersicht</a>
      <h1>Neuen Fall anlegen</h1>

      <!-- Progress Steps -->
      <nav class="steps" aria-label="Fortschritt">
        <ol class="step-list">
          <li *ngFor="let s of steps; let i = index"
              [class.step--active]="currentStep === i"
              [class.step--done]="currentStep > i"
              [attr.aria-current]="currentStep === i ? 'step' : null">
            <span class="step-number">{{ i + 1 }}</span>
            <span class="step-label">{{ s }}</span>
          </li>
        </ol>
      </nav>

      <!-- Step 1: Grunddaten -->
      <section *ngIf="currentStep === 0" aria-label="Grunddaten">
        <h2>Grunddaten</h2>
        <div class="form-grid">
          <div class="form-group">
            <label for="kategorie">Kategorie (§2 HinSchG) *</label>
            <select id="kategorie" [(ngModel)]="formData.kategorie"
                    class="form-control" required
                    [attr.aria-invalid]="submitted && !formData.kategorie">
              <option value="">Bitte waehlen...</option>
              <option *ngFor="let k of kategorien" [value]="k.value">
                {{ k.label }}
              </option>
            </select>
            <div *ngIf="submitted && !formData.kategorie" class="form-error" role="alert">
              Bitte waehlen Sie eine Kategorie.
            </div>
          </div>

          <div class="form-group">
            <label for="meldekanal">Meldekanal *</label>
            <select id="meldekanal" [(ngModel)]="formData.meldekanal"
                    class="form-control" required>
              <option value="online">Online</option>
              <option value="telefon">Telefon</option>
              <option value="persoenlich">Persoenlich</option>
              <option value="post">Post</option>
            </select>
          </div>

          <div class="form-group">
            <label for="prioritaet">Prioritaet</label>
            <select id="prioritaet" [(ngModel)]="formData.prioritaet"
                    class="form-control">
              <option value="niedrig">Niedrig</option>
              <option value="mittel">Mittel</option>
              <option value="hoch">Hoch</option>
              <option value="kritisch">Kritisch</option>
            </select>
          </div>
        </div>
      </section>

      <!-- Step 2: Sachverhalt -->
      <section *ngIf="currentStep === 1" aria-label="Sachverhalt">
        <h2>Sachverhalt</h2>
        <div class="form-group">
          <label for="beschreibung">Beschreibung des Sachverhalts *</label>
          <textarea id="beschreibung" [(ngModel)]="formData.beschreibung"
                    class="form-control" rows="6" required
                    placeholder="Bitte beschreiben Sie den gemeldeten Sachverhalt..."></textarea>
        </div>
        <div class="form-group">
          <label for="betroffene">Betroffene Personen / Abteilungen</label>
          <textarea id="betroffene" [(ngModel)]="formData.betroffene"
                    class="form-control" rows="3"
                    placeholder="Optional: Welche Personen oder Abteilungen sind betroffen?"></textarea>
        </div>
      </section>

      <!-- Step 3: Hinweisgeber -->
      <section *ngIf="currentStep === 2" aria-label="Hinweisgeber">
        <h2>Hinweisgeber (optional)</h2>
        <p class="info-text">
          Gemaess §16 Abs. 1 HinSchG koennen Meldungen auch anonym erfolgen.
          Die Identitaet des Hinweisgebers ist gemaess §8 Abs. 1 geschuetzt.
        </p>
        <div class="form-group">
          <label class="toggle-label">
            <input type="checkbox" [(ngModel)]="formData.anonym">
            Anonyme Meldung
          </label>
        </div>
        <div *ngIf="!formData.anonym" class="form-grid">
          <div class="form-group">
            <label for="hg-name">Name</label>
            <input id="hg-name" type="text" [(ngModel)]="formData.hinweisgeber_name"
                   class="form-control">
          </div>
          <div class="form-group">
            <label for="hg-email">E-Mail</label>
            <input id="hg-email" type="email" [(ngModel)]="formData.hinweisgeber_email"
                   class="form-control">
          </div>
        </div>
      </section>

      <!-- Step 4: Zusammenfassung -->
      <section *ngIf="currentStep === 3" aria-label="Zusammenfassung">
        <h2>Zusammenfassung</h2>
        <div class="summary">
          <div class="summary-item">
            <label>Kategorie</label>
            <span>{{ getKategorieLabel(formData.kategorie) }}</span>
          </div>
          <div class="summary-item">
            <label>Meldekanal</label>
            <span>{{ formData.meldekanal | titlecase }}</span>
          </div>
          <div class="summary-item">
            <label>Prioritaet</label>
            <span>{{ formData.prioritaet | titlecase }}</span>
          </div>
          <div class="summary-item summary-item--full">
            <label>Sachverhalt</label>
            <span>{{ formData.beschreibung }}</span>
          </div>
          <div class="summary-item">
            <label>Hinweisgeber</label>
            <span>{{ formData.anonym ? 'Anonym' : formData.hinweisgeber_name || 'Nicht angegeben' }}</span>
          </div>
        </div>
        <div class="legal-notice">
          <p>
            Mit der Anlage dieses Falls wird automatisch eine Frist fuer die
            Eingangsbestaetigung (7 Tage, §8 HinSchG) und die Rueckmeldung
            (3 Monate, §8 HinSchG) erstellt.
          </p>
        </div>
      </section>

      <!-- Navigation -->
      <div class="form-nav">
        <button *ngIf="currentStep > 0" class="btn btn-secondary"
                (click)="prevStep()" aria-label="Zurueck">
          &larr; Zurueck
        </button>
        <div class="spacer"></div>
        <button *ngIf="currentStep < steps.length - 1" class="btn btn-primary"
                (click)="nextStep()" aria-label="Weiter">
          Weiter &rarr;
        </button>
        <button *ngIf="currentStep === steps.length - 1" class="btn btn-primary"
                (click)="submitCase()" [disabled]="submitting"
                aria-label="Fall anlegen">
          {{ submitting ? 'Wird angelegt...' : 'Fall anlegen' }}
        </button>
      </div>
    </main>
  `,
  styles: [`
    :host { display: block; padding: 1.5rem; max-width: 800px; }
    .back-link { color: #6b7280; text-decoration: none; font-size: 0.875rem; }
    .back-link:hover { color: #374151; }
    h1 { font-size: 1.5rem; margin: 0.5rem 0 1.5rem; }
    h2 { font-size: 1.125rem; margin-bottom: 1rem; }
    
    .steps { margin-bottom: 2rem; }
    .step-list { display: flex; list-style: none; padding: 0; margin: 0; gap: 0; }
    .step-list li { flex: 1; display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; border-bottom: 3px solid #e5e7eb; color: #9ca3af; font-size: 0.875rem; }
    .step--active { border-bottom-color: #2563eb !important; color: #111827 !important; font-weight: 600; }
    .step--done { border-bottom-color: #16a34a !important; color: #16a34a !important; }
    .step-number { display: inline-flex; width: 24px; height: 24px; border-radius: 50%; background: #e5e7eb; color: #6b7280; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; }
    .step--active .step-number { background: #2563eb; color: #fff; }
    .step--done .step-number { background: #16a34a; color: #fff; }
    
    .form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem; }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; font-weight: 600; font-size: 0.875rem; margin-bottom: 0.375rem; }
    .form-control { width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 0.875rem; min-height: 44px; box-sizing: border-box; }
    .form-control:focus { outline: 2px solid #2563eb; border-color: #2563eb; }
    .form-error { color: #991b1b; font-size: 0.75rem; margin-top: 0.25rem; }
    
    .info-text { font-size: 0.875rem; color: #6b7280; background: #f0f9ff; padding: 0.75rem 1rem; border-radius: 0.5rem; border-left: 3px solid #3b82f6; margin-bottom: 1rem; }
    .toggle-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-weight: 600; }
    .toggle-label input { width: 20px; height: 20px; }
    
    .summary { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1.25rem; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .summary-item label { display: block; font-size: 0.625rem; color: #6b7280; text-transform: uppercase; font-weight: 600; }
    .summary-item span { font-size: 0.875rem; }
    .summary-item--full { grid-column: 1 / -1; }
    
    .legal-notice { margin-top: 1rem; padding: 0.75rem 1rem; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 0.5rem; font-size: 0.875rem; color: #92400e; }
    
    .form-nav { display: flex; gap: 0.75rem; margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #e5e7eb; }
    .spacer { flex: 1; }
    
    .btn { padding: 0.5rem 1.25rem; border-radius: 0.375rem; font-size: 0.875rem; cursor: pointer; border: 1px solid #d1d5db; background: #fff; min-height: 44px; font-weight: 600; }
    .btn-primary { background: #2563eb; color: #fff; border-color: #2563eb; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-secondary { background: #f3f4f6; }
    .btn:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
    
    @media (max-width: 768px) {
      .step-list { flex-direction: column; }
      .step-list li { border-bottom: none; border-left: 3px solid #e5e7eb; }
      .step--active { border-left-color: #2563eb !important; }
      .step--done { border-left-color: #16a34a !important; }
      .form-grid { grid-template-columns: 1fr; }
      .summary { grid-template-columns: 1fr; }
    }
  `],
})
export class HinschgNewCaseComponent {
  steps = ['Grunddaten', 'Sachverhalt', 'Hinweisgeber', 'Zusammenfassung'];
  currentStep = 0;
  submitted = false;
  submitting = false;

  kategorien: { value: string; label: string }[] = [];
  
  formData = {
    kategorie: '',
    meldekanal: 'online',
    prioritaet: 'mittel',
    beschreibung: '',
    betroffene: '',
    anonym: false,
    hinweisgeber_name: '',
    hinweisgeber_email: '',
  };

  constructor(
    private hinschgService: HinschgService,
    private router: Router,
  ) {
    this.kategorien = Object.entries(KATEGORIE_LABELS).map(([key, label]) => ({
      value: key,
      label: label as string,
    }));
  }

  getKategorieLabel(k: string): string {
    return this.hinschgService.getKategorieLabel(k as any);
  }

  nextStep(): void {
    this.submitted = true;
    if (this.currentStep === 0 && !this.formData.kategorie) return;
    if (this.currentStep === 1 && !this.formData.beschreibung) return;
    this.submitted = false;
    this.currentStep = Math.min(this.currentStep + 1, this.steps.length - 1);
  }

  prevStep(): void {
    this.currentStep = Math.max(this.currentStep - 1, 0);
  }

  submitCase(): void {
    this.submitting = true;
    this.hinschgService.createCase(this.formData).subscribe({
      next: (created) => {
        this.router.navigate(['/hinschg/cases', created.id]);
      },
      error: () => { this.submitting = false; },
    });
  }
}
