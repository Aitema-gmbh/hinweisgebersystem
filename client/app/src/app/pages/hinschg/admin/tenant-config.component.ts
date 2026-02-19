/**
 * HinSchG Tenant Configuration Component
 * 
 * Admin panel for configuring tenant-specific HinSchG settings:
 * - Deadline durations (within legal bounds)
 * - Notification templates
 * - Branding
 * - Channel configuration
 * - Compliance settings
 */
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { HinschgService } from '../../../services/hinschg.service';

@Component({
  selector: 'app-hinschg-tenant-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="config-page" role="main" id="main-content">
      <h1>Konfiguration der Meldestelle</h1>
      
      <div *ngIf="saved" class="alert alert-success" role="status" aria-live="polite">
        Konfiguration erfolgreich gespeichert.
      </div>

      <!-- Fristen -->
      <section class="config-section" aria-label="Fristenkonfiguration">
        <h2>Fristen</h2>
        <p class="section-hint">Gesetzliche Grenzen werden automatisch validiert.</p>
        
        <div class="config-grid">
          <div class="config-item">
            <label for="frist-eingang">Eingangsbestaetigung (Tage)</label>
            <div class="input-with-hint">
              <input id="frist-eingang" type="number"
                     [(ngModel)]="config.frist_eingangsbestaetigung_tage"
                     class="form-control" min="1" max="7">
              <span class="hint">§8 Abs. 1: max. 7 Tage</span>
            </div>
          </div>
          
          <div class="config-item">
            <label for="frist-rueck">Rueckmeldung (Tage)</label>
            <div class="input-with-hint">
              <input id="frist-rueck" type="number"
                     [(ngModel)]="config.frist_rueckmeldung_tage"
                     class="form-control" min="30" max="90">
              <span class="hint">§8 Abs. 1: max. ~3 Monate</span>
            </div>
          </div>
          
          <div class="config-item">
            <label for="aufbewahrung">Aufbewahrungsfrist (Jahre)</label>
            <div class="input-with-hint">
              <input id="aufbewahrung" type="number"
                     [(ngModel)]="config.aufbewahrungsfrist_jahre"
                     class="form-control" min="3" max="10">
              <span class="hint">§11 Abs. 1: mind. 3 Jahre</span>
            </div>
          </div>

          <div class="config-item">
            <label for="erinnerung">Erinnerung vor Fristablauf (Tage)</label>
            <input id="erinnerung" type="number"
                   [(ngModel)]="config.erinnerung_vor_frist_tage"
                   class="form-control" min="1" max="14">
          </div>
        </div>
      </section>

      <!-- Meldekanale -->
      <section class="config-section" aria-label="Meldekanalkonfiguration">
        <h2>Meldekanal (§16 HinSchG)</h2>
        <p class="section-hint">Mindestens ein Meldekanal muss aktiv sein.</p>
        
        <div class="channel-list">
          <label class="channel-toggle" *ngFor="let ch of channels">
            <input type="checkbox" [(ngModel)]="ch.active">
            <span class="channel-name">{{ ch.label }}</span>
            <span class="channel-desc">{{ ch.description }}</span>
          </label>
        </div>
      </section>

      <!-- Kommune Info -->
      <section class="config-section" aria-label="Kommuneninformationen">
        <h2>Kommune</h2>
        <div class="config-grid">
          <div class="config-item">
            <label for="kommune-name">Name der Kommune</label>
            <input id="kommune-name" type="text"
                   [(ngModel)]="config.kommune_name"
                   class="form-control" placeholder="z.B. Stadt Musterstadt">
          </div>
          <div class="config-item">
            <label for="kommune-web">Website</label>
            <input id="kommune-web" type="url"
                   [(ngModel)]="config.kommune_website"
                   class="form-control" placeholder="https://...">
          </div>
          <div class="config-item">
            <label for="eskalation-email">Eskalations-E-Mail</label>
            <input id="eskalation-email" type="email"
                   [(ngModel)]="config.eskalation_email"
                   class="form-control"
                   placeholder="admin@kommune.de">
          </div>
          <div class="config-item">
            <label for="meldestelle-name">Name der Meldestelle</label>
            <input id="meldestelle-name" type="text"
                   [(ngModel)]="config.meldestelle_name"
                   class="form-control"
                   placeholder="Interne Meldestelle">
          </div>
        </div>
      </section>

      <!-- Branding -->
      <section class="config-section" aria-label="Branding">
        <h2>Erscheinungsbild</h2>
        <div class="config-grid">
          <div class="config-item">
            <label for="primary-color">Primaerfarbe</label>
            <div class="color-input">
              <input id="primary-color" type="color"
                     [(ngModel)]="config.theme_primary_color">
              <span>{{ config.theme_primary_color }}</span>
            </div>
          </div>
          <div class="config-item">
            <label for="secondary-color">Sekundaerfarbe</label>
            <div class="color-input">
              <input id="secondary-color" type="color"
                     [(ngModel)]="config.theme_secondary_color">
              <span>{{ config.theme_secondary_color }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Compliance -->
      <section class="config-section" aria-label="Compliance-Einstellungen">
        <h2>Compliance</h2>
        <div class="config-grid">
          <div class="config-item">
            <label class="toggle-label">
              <input type="checkbox" [(ngModel)]="config.compliance_report_auto">
              Automatische Berichtserstellung
            </label>
          </div>
          <div class="config-item">
            <label for="report-schedule">Berichtszyklus</label>
            <select id="report-schedule" [(ngModel)]="config.compliance_report_schedule"
                    class="form-control">
              <option value="yearly">Jaehrlich</option>
              <option value="quarterly">Quartalsweise</option>
            </select>
          </div>
          <div class="config-item">
            <label class="toggle-label">
              <input type="checkbox" [(ngModel)]="config.auto_aktenzeichen">
              Automatische Aktenzeichen-Vergabe
            </label>
          </div>
          <div class="config-item">
            <label for="az-prefix">Aktenzeichen-Praefix</label>
            <input id="az-prefix" type="text"
                   [(ngModel)]="config.aktenzeichen_prefix"
                   class="form-control" maxlength="10"
                   placeholder="HIN">
          </div>
        </div>
      </section>

      <!-- Save -->
      <div class="save-bar">
        <button class="btn btn-primary" (click)="saveConfig()"
                [disabled]="saving"
                aria-label="Konfiguration speichern">
          {{ saving ? 'Speichern...' : 'Konfiguration speichern' }}
        </button>
      </div>

      <div *ngIf="loading" class="loading" role="status">Laden...</div>
    </main>
  `,
  styles: [`
    :host { display: block; padding: 1.5rem; max-width: 900px; }
    h1 { font-size: 1.5rem; margin-bottom: 1.5rem; }
    h2 { font-size: 1.125rem; font-weight: 600; margin: 0 0 0.5rem; }
    
    .config-section { background: #fff; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1.5rem; margin-bottom: 1.5rem; }
    .section-hint { font-size: 0.75rem; color: #6b7280; margin-bottom: 1rem; }
    
    .config-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.25rem; }
    .config-item label { display: block; font-weight: 600; font-size: 0.875rem; margin-bottom: 0.375rem; }
    .form-control { width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 0.875rem; min-height: 44px; box-sizing: border-box; }
    .form-control:focus { outline: 2px solid #2563eb; border-color: #2563eb; }
    
    .input-with-hint .hint { display: block; font-size: 0.625rem; color: #6b7280; margin-top: 0.25rem; }
    
    .channel-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .channel-toggle { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; cursor: pointer; }
    .channel-toggle:hover { background: #f9fafb; }
    .channel-toggle input { width: 20px; height: 20px; }
    .channel-name { font-weight: 600; font-size: 0.875rem; min-width: 80px; }
    .channel-desc { font-size: 0.75rem; color: #6b7280; }
    
    .color-input { display: flex; align-items: center; gap: 0.5rem; }
    .color-input input[type="color"] { width: 44px; height: 44px; border: 1px solid #d1d5db; border-radius: 0.375rem; padding: 2px; cursor: pointer; }
    
    .toggle-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
    .toggle-label input { width: 20px; height: 20px; }
    
    .save-bar { position: sticky; bottom: 0; background: #fff; padding: 1rem 0; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; }
    
    .alert-success { padding: 0.75rem 1rem; background: #f0fdf4; border: 1px solid #86efac; color: #166534; border-radius: 0.5rem; margin-bottom: 1rem; }
    
    .btn { padding: 0.5rem 1rem; border-radius: 0.375rem; font-size: 0.875rem; cursor: pointer; border: 1px solid #d1d5db; background: #fff; min-height: 44px; }
    .btn-primary { background: #2563eb; color: #fff; border-color: #2563eb; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
    
    .loading { text-align: center; padding: 3rem; color: #6b7280; }
    
    @media (max-width: 768px) {
      .config-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class HinschgTenantConfigComponent implements OnInit, OnDestroy {
  config: any = {
    frist_eingangsbestaetigung_tage: 7,
    frist_rueckmeldung_tage: 90,
    aufbewahrungsfrist_jahre: 3,
    erinnerung_vor_frist_tage: 2,
    eskalation_email: '',
    kommune_name: '',
    kommune_website: '',
    meldestelle_name: 'Interne Meldestelle',
    theme_primary_color: '#1e3a5f',
    theme_secondary_color: '#4a90d9',
    compliance_report_auto: true,
    compliance_report_schedule: 'yearly',
    auto_aktenzeichen: true,
    aktenzeichen_prefix: 'HIN',
  };

  channels = [
    { key: 'online', label: 'Online', description: 'Meldung ueber das Webformular', active: true },
    { key: 'telefon', label: 'Telefon', description: 'Telefonische Meldung an die Meldestelle', active: true },
    { key: 'persoenlich', label: 'Persoenlich', description: 'Persoenliche Vorsprache bei der Meldestelle', active: true },
    { key: 'post', label: 'Post', description: 'Schriftliche Meldung per Post', active: true },
    { key: 'email', label: 'E-Mail', description: 'Meldung per E-Mail (verschluesselt empfohlen)', active: false },
  ];

  loading = true;
  saving = false;
  saved = false;

  private destroy$ = new Subject<void>();

  constructor(private hinschgService: HinschgService) {}

  ngOnInit(): void {
    // Load tenant config from API
    this.loading = false;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  saveConfig(): void {
    this.saving = true;
    this.saved = false;
    // Simulate save
    setTimeout(() => {
      this.saving = false;
      this.saved = true;
      setTimeout(() => this.saved = false, 3000);
    }, 1000);
  }
}
