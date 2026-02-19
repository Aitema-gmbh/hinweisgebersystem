/**
 * HinSchG Reports Component
 * §27 Compliance Reporting
 */
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { HinschgService } from '../../../services/hinschg.service';

@Component({
  selector: 'app-hinschg-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="reports-page" role="main" id="main-content">
      <header class="page-header">
        <h1>Compliance-Berichte (\u00a727 HinSchG)</h1>
        <button class="btn btn-primary" (click)="generateReport()"
                [disabled]="generating"
                aria-label="Neuen Bericht generieren">
          {{ generating ? 'Wird generiert...' : '+ Bericht generieren' }}
        </button>
      </header>

      <!-- Generate Report Form -->
      <section class="generate-form" aria-label="Bericht erstellen">
        <div class="form-row">
          <div class="form-group">
            <label for="report-year">Jahr</label>
            <select id="report-year" [(ngModel)]="reportYear" class="form-control">
              <option *ngFor="let y of availableYears" [value]="y">{{ y }}</option>
            </select>
          </div>
          <div class="form-group">
            <label for="report-type">Berichtstyp</label>
            <select id="report-type" [(ngModel)]="reportType" class="form-control">
              <option value="jahresbericht">Jahresbericht</option>
              <option value="quartalsbericht">Quartalsbericht</option>
              <option value="ad_hoc">Ad-hoc-Bericht</option>
            </select>
          </div>
        </div>
      </section>

      <!-- Reports List -->
      <section class="reports-list" aria-label="Vorhandene Berichte">
        <h2>Vorhandene Berichte</h2>
        <div *ngFor="let r of reports" class="report-card">
          <div class="report-info">
            <h3>{{ r.titel }}</h3>
            <div class="report-meta">
              <span>Zeitraum: {{ r.zeitraum_von | date:'dd.MM.yyyy' }} - {{ r.zeitraum_bis | date:'dd.MM.yyyy' }}</span>
              <span>Erstellt: {{ r.created_at | date:'dd.MM.yyyy HH:mm' }}</span>
            </div>
          </div>
          <div class="report-stats">
            <div class="report-stat">
              <span class="stat-value">{{ r.daten?.total_meldungen || 0 }}</span>
              <span class="stat-label">Meldungen</span>
            </div>
            <div class="report-stat">
              <span class="stat-value">{{ r.daten?.abgeschlossen || 0 }}</span>
              <span class="stat-label">Abgeschlossen</span>
            </div>
            <div class="report-stat">
              <span class="stat-value">{{ r.daten?.fristversaeumnisse || 0 }}</span>
              <span class="stat-label">Fristversaeumnisse</span>
            </div>
            <div class="report-stat">
              <span class="stat-value">{{ r.daten?.durchschn_bearbeitungstage || 0 }}</span>
              <span class="stat-label">&#216; Bearbeitungstage</span>
            </div>
          </div>
        </div>

        <div *ngIf="reports.length === 0 && !loading" class="empty-state">
          <p>Noch keine Berichte vorhanden.</p>
        </div>
      </section>

      <div *ngIf="loading" class="loading" role="status">Laden...</div>
    </main>
  `,
  styles: [`
    :host { display: block; padding: 1.5rem; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .page-header h1 { font-size: 1.5rem; margin: 0; }
    
    .generate-form { background: #fff; padding: 1.25rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; margin-bottom: 2rem; }
    .form-row { display: flex; gap: 1rem; flex-wrap: wrap; }
    .form-group { display: flex; flex-direction: column; gap: 0.25rem; }
    .form-group label { font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase; }
    .form-control { padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 0.875rem; min-height: 44px; }
    .form-control:focus { outline: 2px solid #2563eb; border-color: #2563eb; }
    
    .report-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1.25rem; margin-bottom: 1rem; }
    .report-info h3 { font-size: 1.125rem; margin: 0 0 0.5rem; }
    .report-meta { font-size: 0.75rem; color: #6b7280; display: flex; gap: 1.5rem; flex-wrap: wrap; }
    
    .report-stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 1rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #f3f4f6; }
    .report-stat { text-align: center; }
    .stat-value { display: block; font-size: 1.5rem; font-weight: 700; color: #111827; }
    .stat-label { font-size: 0.75rem; color: #6b7280; }
    
    .btn { padding: 0.5rem 1rem; border-radius: 0.375rem; font-size: 0.875rem; cursor: pointer; border: 1px solid #d1d5db; background: #fff; min-height: 44px; }
    .btn-primary { background: #2563eb; color: #fff; border-color: #2563eb; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
    
    h2 { font-size: 1.25rem; font-weight: 600; margin: 2rem 0 1rem; }
    .empty-state { text-align: center; padding: 3rem; color: #9ca3af; }
    .loading { text-align: center; padding: 3rem; color: #6b7280; }
  `],
})
export class HinschgReportsComponent implements OnInit, OnDestroy {
  reports: any[] = [];
  loading = true;
  generating = false;
  reportYear = new Date().getFullYear();
  reportType = 'jahresbericht';
  availableYears: number[] = [];

  private destroy$ = new Subject<void>();

  constructor(private hinschgService: HinschgService) {
    const currentYear = new Date().getFullYear();
    this.availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);
  }

  ngOnInit(): void {
    this.hinschgService.getReports().pipe(takeUntil(this.destroy$)).subscribe({
      next: (reports) => { this.reports = reports; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  generateReport(): void {
    this.generating = true;
    this.hinschgService.generateReport({
      jahr: this.reportYear,
      typ: this.reportType,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (report) => {
        this.reports.unshift(report);
        this.generating = false;
      },
      error: () => { this.generating = false; },
    });
  }
}
