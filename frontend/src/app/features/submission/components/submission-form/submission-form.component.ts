/**
 * aitema|Hinweis - Submission Form Component
 * Formular zur Einreichung von Hinweismeldungen (anonym + nicht-anonym).
 * Barrierefreiheit nach WCAG 2.1 AA / BITV 2.0.
 * Design: aitema Design-System 2026.
 */
import { Component, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from "@angular/forms";
import { ApiService, SubmissionCreate } from "../../../../core/services/api.service";
import { A11yService } from "../../../../core/services/a11y.service";

interface Kategorie {
  value: string;
  label: string;
  icon: string;
}

@Component({
  selector: "hw-submission-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="sub-wrapper" role="main" aria-label="Hinweis einreichen">

      <!-- Hero Banner -->
      @if (step() < 5) {
        <div class="sub-hero">
          <div class="sub-hero-content">
            <div class="sub-hero-badge">
              <span>&#128274;</span> Anonymer Meldekanal &mdash; HinSchG
            </div>
            <h1 class="sub-hero-title">Hinweis sicher melden</h1>
            <p class="sub-hero-sub">
              Vertraulich, anonym und rechtssicher gem&auml;&szlig; Hinweisgeberschutzgesetz
            </p>
          </div>
        </div>
      }

      <!-- Step Indicator -->
      @if (step() < 5) {
        <nav class="step-track" aria-label="Formular-Schritte">
          <div class="step-item" [class.active]="step() >= 1" [class.done]="step() > 1">
            <div class="step-circle" [attr.aria-current]="step() === 1 ? 'step' : null">
              <span *ngIf="step() <= 1">1</span>
              <span *ngIf="step() > 1">&#10003;</span>
            </div>
            <span class="step-name">Meldungsart</span>
          </div>
          <div class="step-line" [class.done]="step() > 1"></div>
          <div class="step-item" [class.active]="step() >= 2" [class.done]="step() > 2">
            <div class="step-circle" [attr.aria-current]="step() === 2 ? 'step' : null">
              <span *ngIf="step() <= 2">2</span>
              <span *ngIf="step() > 2">&#10003;</span>
            </div>
            <span class="step-name">Kategorie</span>
          </div>
          <div class="step-line" [class.done]="step() > 2"></div>
          <div class="step-item" [class.active]="step() >= 3" [class.done]="step() > 3">
            <div class="step-circle" [attr.aria-current]="step() === 3 ? 'step' : null">
              <span *ngIf="step() <= 3">3</span>
              <span *ngIf="step() > 3">&#10003;</span>
            </div>
            <span class="step-name">Beschreibung</span>
          </div>
          <div class="step-line" [class.done]="step() > 3"></div>
          <div class="step-item" [class.active]="step() >= 4" [class.done]="step() > 4">
            <div class="step-circle" [attr.aria-current]="step() === 4 ? 'step' : null">4</div>
            <span class="step-name">Best&auml;tigung</span>
          </div>
        </nav>
      }

      <!-- SCHRITT 1: Meldungsart -->
      @if (step() === 1) {
        <div class="glass-card">
          <div class="card-header-inner">
            <span class="card-step-tag">Schritt 1 / 4</span>
            <h2 class="card-title">Wie m&ouml;chten Sie melden?</h2>
            <p class="card-hint">
              Sie k&ouml;nnen Ihren Hinweis anonym oder mit Ihren Kontaktdaten einreichen.
              Ihre Identit&auml;t wird gema&szlig; HinSchG gesch&uuml;tzt.
            </p>
          </div>

          <form [formGroup]="meldungsartForm" class="card-body">
            <div class="mode-grid">
              <button
                type="button"
                class="mode-btn"
                [class.mode-btn--selected]="meldungsartForm.get('is_anonymous')?.value === true"
                (click)="setAnonymous(true)"
                [attr.aria-pressed]="meldungsartForm.get('is_anonymous')?.value === true"
              >
                <div class="mode-btn-icon">&#128274;</div>
                <div class="mode-btn-label">Anonym melden</div>
                <div class="mode-btn-desc">
                  Keine pers&ouml;nlichen Daten erforderlich. H&ouml;chste Anonymit&auml;t.
                </div>
                <span class="mode-btn-check" *ngIf="meldungsartForm.get('is_anonymous')?.value === true">&#10003;</span>
              </button>

              <button
                type="button"
                class="mode-btn"
                [class.mode-btn--selected]="meldungsartForm.get('is_anonymous')?.value === false"
                (click)="setAnonymous(false)"
                [attr.aria-pressed]="meldungsartForm.get('is_anonymous')?.value === false"
              >
                <div class="mode-btn-icon">&#128101;</div>
                <div class="mode-btn-label">Mit Kontaktdaten</div>
                <div class="mode-btn-desc">
                  Optionale Angabe Ihrer Daten f&uuml;r R&uuml;ckfragen. Vertraulich nach HinSchG.
                </div>
                <span class="mode-btn-check" *ngIf="meldungsartForm.get('is_anonymous')?.value === false">&#10003;</span>
              </button>
            </div>

            @if (meldungsartForm.get('is_anonymous')?.value === false) {
              <div class="field-group-pad">
                <div class="privacy-banner">
                  <span class="privacy-banner-icon">&#128274;</span>
                  <div>
                    <strong>Datenschutzhinweis:</strong>
                    Ihre Kontaktdaten werden vertraulich behandelt und nicht ohne Ihre Zustimmung weitergegeben.
                  </div>
                </div>
                <div class="field-group">
                  <label class="field-label" for="melder_name">Name <span class="optional">(optional)</span></label>
                  <input id="melder_name" type="text" formControlName="melder_name"
                         class="field-input" placeholder="Ihr vollst&auml;ndiger Name" autocomplete="name" />
                </div>
                <div class="field-group">
                  <label class="field-label" for="melder_email">E-Mail <span class="optional">(optional)</span></label>
                  <input id="melder_email" type="email" formControlName="melder_email"
                         class="field-input" placeholder="ihre.email@beispiel.de" autocomplete="email" />
                </div>
              </div>
            }

            <div class="form-actions">
              <button type="button" class="btn-aitema btn-aitema--primary" (click)="goToStep(2)">
                Weiter <span>&#8594;</span>
              </button>
            </div>
          </form>
        </div>
      }

      <!-- SCHRITT 2: Kategorie -->
      @if (step() === 2) {
        <div class="glass-card">
          <div class="card-header-inner">
            <span class="card-step-tag">Schritt 2 / 4</span>
            <h2 class="card-title">Welchen Bereich betrifft Ihre Meldung?</h2>
            <p class="card-hint">
              Gem&auml;&szlig; &sect;2 HinSchG k&ouml;nnen Verst&ouml;&szlig;e in folgenden Bereichen gemeldet werden:
            </p>
          </div>

          <form [formGroup]="inhaltForm" class="card-body">
            <div class="kategorie-grid">
              <button
                *ngFor="let kat of kategorien"
                type="button"
                class="kat-btn"
                [class.kat-btn--selected]="inhaltForm.get('kategorie')?.value === kat.value"
                (click)="selectKategorie(kat.value)"
                [attr.aria-pressed]="inhaltForm.get('kategorie')?.value === kat.value"
              >
                <span class="kat-btn-icon">{{ kat.icon }}</span>
                <span class="kat-btn-label">{{ kat.label }}</span>
                <span class="kat-btn-check" *ngIf="inhaltForm.get('kategorie')?.value === kat.value" aria-hidden="true">&#10003;</span>
              </button>
            </div>

            <div class="form-actions form-actions--between">
              <button type="button" class="btn-aitema btn-aitema--ghost" (click)="goToStep(1)">
                &#8592; Zur&uuml;ck
              </button>
              <button type="button" class="btn-aitema btn-aitema--primary"
                      (click)="goToStep(3)"
                      [disabled]="!inhaltForm.get('kategorie')?.value">
                Weiter <span>&#8594;</span>
              </button>
            </div>
          </form>
        </div>
      }

      <!-- SCHRITT 3: Beschreibung -->
      @if (step() === 3) {
        <div class="glass-card">
          <div class="card-header-inner">
            <span class="card-step-tag">Schritt 3 / 4</span>
            <h2 class="card-title">Beschreiben Sie den Sachverhalt</h2>
          </div>

          <form [formGroup]="inhaltForm" class="card-body">
            <div class="privacy-banner">
              <span class="privacy-banner-icon">&#128274;</span>
              <div>
                <strong>Datenschutzhinweis:</strong> Vermeiden Sie pers&ouml;nliche Angaben,
                die Ihre Identit&auml;t preisgeben k&ouml;nnten.
              </div>
            </div>

            <div class="field-group">
              <label class="field-label" for="titel">
                Titel der Meldung <span class="required">*</span>
              </label>
              <input id="titel" type="text" formControlName="titel"
                     class="field-input" placeholder="Kurze Zusammenfassung (min. 10 Zeichen)"
                     maxlength="300" [attr.aria-describedby]="'titel-err'" />
              <div class="field-error" id="titel-err" role="alert"
                   *ngIf="inhaltForm.get('titel')?.invalid && inhaltForm.get('titel')?.touched">
                Titel muss mindestens 10 Zeichen lang sein.
              </div>
            </div>

            <div class="field-group">
              <label class="field-label" for="beschreibung">
                Detaillierte Beschreibung <span class="required">*</span>
                <span class="char-counter">{{ inhaltForm.get('beschreibung')?.value?.length || 0 }} / 50.000</span>
              </label>
              <textarea id="beschreibung" formControlName="beschreibung"
                        class="field-input field-textarea" rows="10"
                        placeholder="Was ist geschehen? Wann? Wo? Gibt es Beweise?"
                        maxlength="50000"
                        [attr.aria-describedby]="'desc-hint desc-err'"></textarea>
              <div class="field-hint" id="desc-hint">
                Mindestens 50 Zeichen. Beschreiben Sie den Sachverhalt so detailliert wie m&ouml;glich.
              </div>
              <div class="field-error" id="desc-err" role="alert"
                   *ngIf="inhaltForm.get('beschreibung')?.invalid && inhaltForm.get('beschreibung')?.touched">
                Beschreibung muss mindestens 50 Zeichen lang sein.
              </div>
            </div>

            <div class="field-group">
              <label class="field-label" for="betroffene_abteilung">
                Betroffene Abteilung <span class="optional">(optional)</span>
              </label>
              <input id="betroffene_abteilung" type="text" formControlName="betroffene_abteilung"
                     class="field-input" placeholder="z.B. Buchhaltung, Einkauf ..." />
            </div>

            <div class="form-actions form-actions--between">
              <button type="button" class="btn-aitema btn-aitema--ghost" (click)="goToStep(2)">
                &#8592; Zur&uuml;ck
              </button>
              <button type="button" class="btn-aitema btn-aitema--primary"
                      (click)="goToStep(4)"
                      [disabled]="inhaltForm.invalid">
                Weiter <span>&#8594;</span>
              </button>
            </div>
          </form>
        </div>
      }

      <!-- SCHRITT 4: Bestaetigung & Absenden -->
      @if (step() === 4) {
        <div class="glass-card">
          <div class="card-header-inner">
            <span class="card-step-tag">Schritt 4 / 4</span>
            <h2 class="card-title">Zusammenfassung &amp; Best&auml;tigung</h2>
          </div>

          <div class="card-body">
            <div class="summary-panel" role="list" aria-label="Zusammenfassung Ihrer Meldung">
              <div class="summary-row">
                <span class="summary-key">Meldungsart</span>
                <span class="summary-val">
                  {{ meldungsartForm.get('is_anonymous')?.value ? '&#128274; Anonym' : '&#128101; Mit Kontaktdaten' }}
                </span>
              </div>
              <div class="summary-row">
                <span class="summary-key">Kategorie</span>
                <span class="summary-val">{{ getKategorieLabel(inhaltForm.get('kategorie')?.value) }}</span>
              </div>
              <div class="summary-row">
                <span class="summary-key">Titel</span>
                <span class="summary-val">{{ inhaltForm.get('titel')?.value }}</span>
              </div>
              <div class="summary-row">
                <span class="summary-key">Beschreibung</span>
                <span class="summary-val summary-val--text">
                  {{ inhaltForm.get('beschreibung')?.value | slice:0:200 }}
                  <span *ngIf="(inhaltForm.get('beschreibung')?.value?.length || 0) > 200"> &hellip;</span>
                </span>
              </div>
            </div>

            <div class="notice-panel" role="note">
              <div class="notice-panel-header">
                <span>&#9888;&#65039;</span>
                <strong>Wichtiger Hinweis vor dem Absenden</strong>
              </div>
              <ul class="notice-list">
                <li>Nach dem Absenden erhalten Sie einen <strong>einmaligen Zugangscode</strong>.</li>
                <li>Dieser Code ist Ihr <strong>einziger Zugang</strong> zum Status Ihrer Meldung.</li>
                <li><strong>Notieren Sie den Code sofort</strong> &mdash; er kann nicht wiederhergestellt werden.</li>
                <li>Weder Ihre IP-Adresse noch Ger&auml;tedaten werden gespeichert.</li>
              </ul>
            </div>

            <div class="datenschutz-check">
              <label class="checkbox-label">
                <input type="checkbox" [(ngModel)]="datenschutzAkzeptiert"
                       class="checkbox-input" [ngModelOptions]="{standalone: true}"
                       id="datenschutz" />
                <span class="checkbox-text">
                  Ich habe die Datenschutzhinweise gelesen und akzeptiere die Verarbeitung
                  meiner Daten gem&auml;&szlig; HinSchG.
                </span>
              </label>
            </div>

            <div class="form-actions form-actions--between">
              <button type="button" class="btn-aitema btn-aitema--ghost" (click)="goToStep(3)"
                      [disabled]="submitting()">
                &#8592; Zur&uuml;ck
              </button>
              <button type="button" class="btn-aitema btn-aitema--submit"
                      [disabled]="!datenschutzAkzeptiert || submitting()"
                      (click)="submit()">
                <span *ngIf="!submitting()">&#128274; Meldung anonym einreichen</span>
                <span *ngIf="submitting()" class="submitting">
                  <span class="spinner-sm"></span> Wird eingereicht &hellip;
                </span>
              </button>
            </div>

            <div class="field-error field-error--pad" *ngIf="submitError()" role="alert">
              {{ submitError() }}
            </div>
          </div>
        </div>
      }

      <!-- SCHRITT 5: Erfolg -->
      @if (step() === 5) {
        <div class="glass-card success-card" role="region" aria-label="Meldung erfolgreich eingereicht" aria-live="assertive">
          <div class="success-header">
            <div class="success-checkmark" aria-hidden="true">&#10003;</div>
            <div>
              <h2 class="success-title">Meldung erfolgreich eingereicht</h2>
              <p class="success-sub">Referenznummer: <strong>{{ referenceCode() }}</strong></p>
            </div>
          </div>

          <div class="receipt-display">
            <div class="receipt-label">Ihr pers&ouml;nlicher Zugangscode</div>
            <div class="receipt-code-box">
              <code class="receipt-code-value">{{ accessCode() }}</code>
            </div>
            <div class="receipt-warning" role="alert">
              &#9888; Notieren Sie diesen Code jetzt! Er ist Ihr einziger Zugang zum
              Status Ihrer Meldung und kann nicht wiederhergestellt werden.
            </div>
          </div>

          <div class="success-info">
            <div class="info-row">
              <span class="info-icon">&#128197;</span>
              <span>Eingangsbestaetigung bis: <strong>{{ eingangsbestaetigung() }}</strong></span>
            </div>
            <div class="info-row">
              <span class="info-icon">&#128269;</span>
              <span>Status abrufen unter: <strong>/status</strong> mit Ihrem Zugangscode</span>
            </div>
          </div>

          <div class="form-actions form-actions--center">
            <button type="button" class="btn-aitema btn-aitema--ghost" (click)="printPage()">
              &#128438; Drucken
            </button>
            <a routerLink="/status" class="btn-aitema btn-aitema--primary">
              Status meiner Meldung &#8594;
            </a>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    :host { display: block; }

    .sub-wrapper {
      max-width: 720px;
      margin: 0 auto;
      padding: 0 1rem 3rem;
      font-family: "Inter", system-ui, sans-serif;
    }

    /* HERO */
    .sub-hero {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1e40af 100%);
      border-radius: 0 0 1.5rem 1.5rem;
      padding: 2.5rem 2rem 3rem;
      margin: 0 -1rem 2rem;
      color: #fff;
      position: relative;
      overflow: hidden;
    }
    .sub-hero::after {
      content: "";
      position: absolute;
      top: -50%;
      right: -10%;
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%);
      pointer-events: none;
    }
    .sub-hero-content { position: relative; z-index: 1; }
    .sub-hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(59,130,246,0.25);
      border: 1px solid rgba(59,130,246,0.4);
      border-radius: 9999px;
      padding: 0.3rem 0.875rem;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #93c5fd;
      margin-bottom: 1rem;
    }
    .sub-hero-title {
      font-size: 1.875rem;
      font-weight: 800;
      margin: 0 0 0.5rem;
      letter-spacing: -0.02em;
    }
    .sub-hero-sub { color: rgba(255,255,255,0.65); font-size: 0.9375rem; margin: 0; }

    /* STEP TRACK */
    .step-track {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 2rem;
    }
    .step-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.375rem;
    }
    .step-circle {
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 50%;
      border: 2px solid #e2e8f0;
      background: #fff;
      color: #94a3b8;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.875rem;
      font-weight: 700;
      transition: all 0.25s ease;
      box-shadow: 0 1px 3px rgba(15,23,42,0.08);
    }
    .step-item.active .step-circle {
      border-color: #3b82f6;
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: #fff;
      box-shadow: 0 4px 12px rgba(59,130,246,0.35);
    }
    .step-item.done .step-circle {
      border-color: #059669;
      background: linear-gradient(135deg, #059669, #047857);
      color: #fff;
    }
    .step-name {
      font-size: 0.6875rem;
      font-weight: 600;
      color: #94a3b8;
      letter-spacing: 0.02em;
      white-space: nowrap;
    }
    .step-item.active .step-name { color: #0f172a; }
    .step-item.done .step-name  { color: #059669; }
    .step-line {
      flex: 1;
      height: 2px;
      background: #e2e8f0;
      max-width: 64px;
      margin: 0 0.25rem 1.375rem;
      transition: background 0.25s ease;
    }
    .step-line.done { background: linear-gradient(90deg, #059669, #3b82f6); }

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
    .card-header-inner { padding: 1.75rem 1.75rem 0; }
    .card-body { padding: 1.25rem 1.75rem 1.75rem; }
    .card-step-tag {
      display: inline-flex;
      padding: 0.2rem 0.625rem;
      background: rgba(59,130,246,0.08);
      color: #2563eb;
      border-radius: 9999px;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin-bottom: 0.75rem;
    }
    .card-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.375rem;
      letter-spacing: -0.01em;
    }
    .card-hint { color: #64748b; font-size: 0.875rem; margin: 0 0 1.5rem; }

    /* MODE SELECT */
    .mode-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.875rem;
      margin-bottom: 1.25rem;
    }
    .mode-btn {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.375rem;
      padding: 1.25rem;
      border: 1.5px solid #e2e8f0;
      border-radius: 0.75rem;
      background: #fff;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: left;
      font-family: inherit;
    }
    .mode-btn:hover {
      border-color: #3b82f6;
      background: rgba(59,130,246,0.03);
      box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
    }
    .mode-btn--selected {
      border-color: #3b82f6 !important;
      background: rgba(59,130,246,0.06) !important;
      box-shadow: 0 0 0 3px rgba(59,130,246,0.15) !important;
    }
    .mode-btn-icon { font-size: 1.75rem; }
    .mode-btn-label { font-size: 0.9375rem; font-weight: 700; color: #0f172a; }
    .mode-btn-desc  { font-size: 0.8125rem; color: #64748b; line-height: 1.4; }
    .mode-btn-check {
      position: absolute;
      top: 0.75rem; right: 0.75rem;
      width: 1.25rem; height: 1.25rem;
      background: #3b82f6; color: #fff;
      border-radius: 50%;
      font-size: 0.6875rem;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700;
    }

    /* KATEGORIE GRID */
    .kategorie-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }
    .kat-btn {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem 0.75rem;
      border: 1.5px solid #e2e8f0;
      border-radius: 0.75rem;
      background: #fff;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: center;
      font-family: inherit;
    }
    .kat-btn:hover {
      border-color: #3b82f6;
      background: rgba(59,130,246,0.03);
      box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
      transform: translateY(-1px);
    }
    .kat-btn--selected {
      border-color: #3b82f6 !important;
      background: rgba(59,130,246,0.06) !important;
      box-shadow: 0 0 0 3px rgba(59,130,246,0.15) !important;
    }
    .kat-btn-icon  { font-size: 1.75rem; line-height: 1; }
    .kat-btn-label { font-size: 0.75rem; font-weight: 600; color: #334155; line-height: 1.3; }
    .kat-btn-check {
      position: absolute;
      top: 0.4rem; right: 0.4rem;
      width: 1.125rem; height: 1.125rem;
      background: #3b82f6; color: #fff;
      border-radius: 50%;
      font-size: 0.625rem;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700;
    }

    /* FIELDS */
    .field-group-pad { padding: 0; margin-top: 1.25rem; }
    .privacy-banner {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      background: #fffbeb;
      border: 1px solid #fcd34d;
      border-radius: 0.5rem;
      padding: 0.875rem 1rem;
      margin-bottom: 1.25rem;
      font-size: 0.875rem;
      color: #78350f;
    }
    .privacy-banner-icon { font-size: 1.125rem; flex-shrink: 0; }
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
    .optional  { font-weight: 400; color: #94a3b8; font-size: 0.8125rem; }
    .required  { color: #ef4444; }
    .char-counter { font-weight: 400; color: #94a3b8; font-size: 0.75rem; }
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
    .field-textarea { resize: vertical; min-height: 220px; }
    .field-hint  { font-size: 0.8125rem; color: #94a3b8; margin-top: 0.375rem; }
    .field-error { color: #dc2626; font-size: 0.8125rem; margin-top: 0.375rem; font-weight: 600; }
    .field-error--pad { padding-top: 0.75rem; }

    /* SUMMARY */
    .summary-panel {
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      overflow: hidden;
      margin-bottom: 1.25rem;
    }
    .summary-row {
      display: flex;
      gap: 1rem;
      padding: 0.875rem 1rem;
      border-bottom: 1px solid #f1f5f9;
      font-size: 0.875rem;
    }
    .summary-row:last-child { border-bottom: none; }
    .summary-key { min-width: 110px; font-weight: 600; color: #64748b; flex-shrink: 0; }
    .summary-val { color: #0f172a; }
    .summary-val--text { max-height: 80px; overflow: hidden; }
    .notice-panel {
      background: #fff8e8;
      border: 1px solid #fcd34d;
      border-radius: 0.75rem;
      padding: 1rem 1.25rem;
      margin-bottom: 1.25rem;
    }
    .notice-panel-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 700;
      font-size: 0.9375rem;
      color: #92400e;
      margin-bottom: 0.75rem;
    }
    .notice-list { margin: 0; padding-left: 1.25rem; font-size: 0.875rem; color: #78350f; line-height: 1.8; }
    .datenschutz-check {
      background: var(--aitema-slate-50, #f8fafc);
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      padding: 1rem;
      margin-bottom: 1.25rem;
    }
    .checkbox-label {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      cursor: pointer;
      font-size: 0.875rem;
      color: #334155;
      line-height: 1.5;
      margin: 0;
    }
    .checkbox-input {
      width: 1.125rem;
      height: 1.125rem;
      margin-top: 0.125rem;
      flex-shrink: 0;
      cursor: pointer;
      accent-color: #3b82f6;
    }

    /* BUTTONS */
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid #f1f5f9;
      margin-top: 0.5rem;
    }
    .form-actions--between { justify-content: space-between; }
    .form-actions--center  { justify-content: center; }
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
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
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
    .btn-aitema--submit {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
      color: #fff;
      box-shadow: 0 2px 8px rgba(15,23,42,0.25);
    }
    .btn-aitema--submit:hover:not(:disabled) {
      background: linear-gradient(135deg, #1e293b, #1e40af);
      box-shadow: 0 4px 16px rgba(15,23,42,0.35);
      transform: translateY(-1px);
    }
    .spinner-sm {
      display: inline-block;
      width: 0.875rem; height: 0.875rem;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* SUCCESS */
    .success-card { /* inherited from glass-card */ }
    .success-header {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      padding: 1.75rem;
      background: linear-gradient(135deg, rgba(5,150,105,0.06), rgba(59,130,246,0.04));
      border-bottom: 1px solid #e2e8f0;
    }
    .success-checkmark {
      width: 3.5rem; height: 3.5rem;
      border-radius: 50%;
      background: linear-gradient(135deg, #059669, #047857);
      color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.5rem; font-weight: 700; flex-shrink: 0;
      box-shadow: 0 4px 16px rgba(5,150,105,0.3);
    }
    .success-title { font-size: 1.25rem; font-weight: 700; color: #0f172a; margin: 0 0 0.25rem; }
    .success-sub   { margin: 0; color: #64748b; font-size: 0.875rem; }
    .receipt-display { padding: 1.75rem; text-align: center; }
    .receipt-label {
      font-size: 0.75rem; font-weight: 700;
      letter-spacing: 0.08em; text-transform: uppercase;
      color: #64748b; margin-bottom: 0.75rem;
    }
    .receipt-code-box {
      background: #0f172a;
      border-radius: 0.75rem;
      padding: 1.5rem 2rem;
      margin: 0 auto 1rem;
      max-width: 480px;
      box-shadow: 0 4px 24px rgba(15,23,42,0.2);
    }
    .receipt-code-value {
      color: #67e8f9;
      font-size: 1.5rem;
      letter-spacing: 0.2em;
      font-family: "Courier New", Courier, monospace;
      font-weight: 700;
    }
    .receipt-warning {
      font-size: 0.875rem; color: #dc2626; font-weight: 600;
      background: #fef2f2; border: 1px solid #fca5a5;
      border-radius: 0.5rem; padding: 0.625rem 0.875rem;
      max-width: 480px; margin: 0 auto;
    }
    .success-info {
      padding: 1rem 1.75rem;
      border-top: 1px solid #f1f5f9;
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
    }
    .info-row {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      font-size: 0.875rem;
      color: #64748b;
    }
    .info-icon { flex-shrink: 0; }

    @media (max-width: 600px) {
      .sub-hero-title { font-size: 1.375rem; }
      .mode-grid { grid-template-columns: 1fr; }
      .kategorie-grid { grid-template-columns: repeat(3, 1fr); }
      .receipt-code-value { font-size: 1rem; letter-spacing: 0.1em; }
      .form-actions { flex-direction: column-reverse; }
      .form-actions--between { flex-direction: row; }
    }

    @media (prefers-reduced-motion: reduce) {
      .btn-aitema, .kat-btn, .step-circle, .mode-btn { transition: none; }
      .spinner-sm { animation: none; }
    }

    @media (prefers-color-scheme: dark) {
      .glass-card { background: #1e293b; border-color: #334155; }
      .card-title { color: #f1f5f9; }
      .field-input { background: #0f172a; border-color: #334155; color: #f1f5f9; }
      .kat-btn, .mode-btn { background: #1e293b; border-color: #334155; }
      .kat-btn-label, .mode-btn-label { color: #f1f5f9; }
      .summary-panel { border-color: #334155; }
      .summary-row { border-color: #334155; }
      .summary-val { color: #f1f5f9; }
      .datenschutz-check { background: #1e293b; border-color: #334155; }
      .checkbox-label { color: #f1f5f9; }
    }
  `],
})
export class SubmissionFormComponent implements OnInit {
  meldungsartForm!: FormGroup;
  inhaltForm!: FormGroup;

  datenschutzAkzeptiert = false;
  step = signal(1);
  submitting = signal(false);
  submitted = signal(false);
  referenceCode = signal("");
  accessCode = signal("");
  eingangsbestaetigung = signal("");
  submitError = signal("");

  kategorien: Kategorie[] = [
    { value: "korruption",          label: "Korruption",          icon: "💰" },
    { value: "betrug",              label: "Betrug",              icon: "⚖️" },
    { value: "geldwaesche",         label: "Geldwäsche",          icon: "💵" },
    { value: "datenschutz",         label: "Datenschutz",         icon: "🔒" },
    { value: "umweltverstoss",      label: "Umwelt",              icon: "🌿" },
    { value: "arbeitssicherheit",   label: "Arbeitsschutz",       icon: "👷" },
    { value: "diskriminierung",     label: "Diskriminierung",     icon: "🤝" },
    { value: "verbraucherschutz",   label: "Verbraucher",         icon: "🧾" },
    { value: "vergaberecht",        label: "Vergaberecht",        icon: "📋" },
    { value: "wettbewerbsrecht",    label: "Wettbewerb",          icon: "⚡" },
    { value: "steuerhinterziehung", label: "Steuern",             icon: "📊" },
    { value: "produktsicherheit",   label: "Produktsicherheit",   icon: "🛡️" },
    { value: "finanzdienstleistungen", label: "Finanzen",         icon: "🏦" },
    { value: "sonstiges",           label: "Sonstiges",           icon: "📄" },
  ];

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private a11yService: A11yService,
  ) {}

  ngOnInit(): void {
    this.a11yService.setPageTitle("Hinweis melden");

    this.meldungsartForm = this.fb.group({
      is_anonymous: [true],
      melder_name:  [""],
      melder_email: [""],
    });

    this.inhaltForm = this.fb.group({
      titel:                ["", [Validators.required, Validators.minLength(10)]],
      kategorie:            ["", Validators.required],
      beschreibung:         ["", [Validators.required, Validators.minLength(50)]],
      betroffene_abteilung: [""],
      zeitraum_von:         [""],
      zeitraum_bis:         [""],
    });
  }

  setAnonymous(value: boolean): void {
    this.meldungsartForm.patchValue({ is_anonymous: value });
  }

  selectKategorie(value: string): void {
    this.inhaltForm.patchValue({ kategorie: value });
  }

  getKategorieLabel(value: string): string {
    return this.kategorien.find((k) => k.value === value)?.label ?? value;
  }

  goToStep(n: number): void {
    if (n === 3 && this.inhaltForm.get('titel')?.invalid) {
      this.inhaltForm.get('titel')?.markAsTouched();
      return;
    }
    if (n === 4 && this.inhaltForm.invalid) {
      this.inhaltForm.markAllAsTouched();
      return;
    }
    this.step.set(n);
    window.scrollTo(0, 0);
  }

  submit(): void {
    if (this.submitting()) return;
    this.submitting.set(true);
    this.submitError.set("");

    const payload: SubmissionCreate = {
      ...this.meldungsartForm.value,
      ...this.inhaltForm.value,
    };

    this.apiService.createSubmission(payload).subscribe({
      next: (response) => {
        this.submitted.set(true);
        this.referenceCode.set(response.reference_code);
        this.accessCode.set(response.access_code);
        this.eingangsbestaetigung.set(
          new Date(response.eingangsbestaetigung_bis).toLocaleDateString("de-DE")
        );
        this.a11yService.announceToScreenReader(
          "Meldung erfolgreich eingereicht. Referenznummer: " + response.reference_code,
          "assertive"
        );
        this.step.set(5);
        this.submitting.set(false);
        window.scrollTo(0, 0);
      },
      error: (error) => {
        this.submitting.set(false);
        const message = error.error?.error ?? "Fehler beim Einreichen der Meldung. Bitte versuchen Sie es erneut.";
        this.submitError.set(message);
        this.a11yService.announceToScreenReader("Fehler: " + message, "assertive");
      },
    });
  }

  printPage(): void {
    window.print();
  }
}
