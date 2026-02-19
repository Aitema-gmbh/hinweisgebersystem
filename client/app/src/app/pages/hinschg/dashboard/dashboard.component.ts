/**
 * HinSchG Dashboard Component
 * 
 * Main overview for Ombudspersonen showing:
 * - Case statistics by status
 * - Overdue/upcoming deadlines with warnings
 * - Recent cases
 * - Category distribution chart
 * 
 * Accessibility: WCAG 2.1 AA compliant with:
 * - Semantic HTML structure
 * - ARIA labels and live regions
 * - Keyboard navigation
 * - Screen reader announcements for deadline warnings
 */
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil, interval } from 'rxjs';

import {
  HinschgService,
  Dashboard,
  HinweisCase,
  Frist,
  FallStatus,
  STATUS_CONFIG,
  KATEGORIE_LABELS,
} from '../../services/hinschg.service';

@Component({
  selector: 'app-hinschg-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <main class="dashboard" role="main" aria-label="HinSchG Dashboard">
      <h1 class="sr-only">Hinweisgebersystem Dashboard</h1>

      <!-- Deadline Warnings (ARIA Live Region) -->
      <div
        *ngIf="dashboard && dashboard.overdue_fristen > 0"
        class="alert alert-danger"
        role="alert"
        aria-live="assertive"
      >
        <span class="alert-icon" aria-hidden="true">&#9888;</span>
        <strong>Achtung:</strong>
        {{ dashboard.overdue_fristen }} Frist(en) ueberschritten!
        <a routerLink="/hinschg/fristen" class="alert-link">
          Fristen anzeigen
        </a>
      </div>

      <div
        *ngIf="dashboard && dashboard.upcoming_fristen > 0"
        class="alert alert-warning"
        role="status"
        aria-live="polite"
      >
        <span class="alert-icon" aria-hidden="true">&#9200;</span>
        {{ dashboard.upcoming_fristen }} Frist(en) laufen in den naechsten 7 Tagen ab.
      </div>

      <!-- Statistics Cards -->
      <section class="stats-grid" aria-label="Fallstatistiken">
        <div class="stat-card stat-card--total">
          <div class="stat-value" aria-label="Gesamtzahl Faelle">
            {{ dashboard?.total_cases || 0 }}
          </div>
          <div class="stat-label">Faelle gesamt</div>
        </div>

        <div
          *ngFor="let status of statusKeys"
          class="stat-card"
          [style.border-left-color]="getStatusColor(status)"
        >
          <div class="stat-value">
            {{ dashboard?.status_counts?.[status] || 0 }}
          </div>
          <div class="stat-label">{{ getStatusLabel(status) }}</div>
        </div>
      </section>

      <!-- Recent Cases -->
      <section class="recent-cases" aria-label="Aktuelle Faelle">
        <h2>Aktuelle Faelle</h2>
        <table
          class="cases-table"
          role="table"
          aria-label="Liste der neuesten Faelle"
        >
          <thead>
            <tr>
              <th scope="col">Aktenzeichen</th>
              <th scope="col">Status</th>
              <th scope="col">Kategorie</th>
              <th scope="col">Prioritaet</th>
              <th scope="col">Eingangsdatum</th>
              <th scope="col">Naechste Frist</th>
              <th scope="col">
                <span class="sr-only">Aktionen</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let c of dashboard?.recent_cases || []">
              <td>
                <a
                  [routerLink]="['/hinschg/cases', c.id]"
                  [attr.aria-label]="'Fall ' + c.aktenzeichen + ' oeffnen'"
                >
                  {{ c.aktenzeichen }}
                </a>
              </td>
              <td>
                <span
                  class="status-badge"
                  [style.background-color]="getStatusColor(c.status)"
                  [attr.aria-label]="'Status: ' + getStatusLabel(c.status)"
                >
                  {{ getStatusLabel(c.status) }}
                </span>
              </td>
              <td>{{ getKategorieLabel(c.kategorie) }}</td>
              <td>
                <span
                  class="priority-badge"
                  [class]="'priority--' + c.prioritaet"
                  [attr.aria-label]="'Prioritaet: ' + c.prioritaet"
                >
                  {{ c.prioritaet | titlecase }}
                </span>
              </td>
              <td>{{ c.eingangsdatum | date:'dd.MM.yyyy' }}</td>
              <td>
                <span
                  *ngIf="getNextFrist(c)"
                  [class.frist-warning]="isFristNah(c)"
                  [class.frist-overdue]="isFristUeberfaellig(c)"
                >
                  {{ getNextFristDatum(c) | date:'dd.MM.yyyy' }}
                </span>
                <span *ngIf="!getNextFrist(c)" class="text-muted">-</span>
              </td>
              <td>
                <a
                  [routerLink]="['/hinschg/cases', c.id]"
                  class="btn btn-sm"
                  aria-label="Details anzeigen"
                >
                  Details
                </a>
              </td>
            </tr>
          </tbody>
        </table>

        <div *ngIf="!dashboard?.recent_cases?.length" class="empty-state">
          <p>Noch keine Faelle vorhanden.</p>
        </div>
      </section>

      <!-- Category Distribution -->
      <section
        *ngIf="dashboard?.kategorien_verteilung"
        class="category-chart"
        aria-label="Kategorienverteilung"
      >
        <h2>Kategorienverteilung</h2>
        <div class="chart-bars">
          <div
            *ngFor="let entry of getCategoriesArray()"
            class="chart-bar"
            [attr.aria-label]="entry.label + ': ' + entry.count + ' Faelle'"
          >
            <div class="bar-label">{{ entry.label }}</div>
            <div class="bar-container">
              <div
                class="bar-fill"
                [style.width.%]="entry.percentage"
                role="progressbar"
                [attr.aria-valuenow]="entry.count"
                [attr.aria-valuemin]="0"
                [attr.aria-valuemax]="dashboard?.total_cases"
              ></div>
            </div>
            <div class="bar-count">{{ entry.count }}</div>
          </div>
        </div>
      </section>
    </main>
  `,
  styles: [`
    :host { display: block; padding: 1.5rem; }

    .alert {
      padding: 1rem 1.5rem;
      border-radius: 0.5rem;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 1rem;
    }
    .alert-danger {
      background: #fef2f2;
      border: 1px solid #fca5a5;
      color: #991b1b;
    }
    .alert-warning {
      background: #fffbeb;
      border: 1px solid #fcd34d;
      color: #92400e;
    }
    .alert-icon { font-size: 1.25rem; }
    .alert-link { color: inherit; font-weight: 600; text-decoration: underline; }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-left: 4px solid #6b7280;
      border-radius: 0.5rem;
      padding: 1.25rem;
      text-align: center;
    }
    .stat-card--total {
      border-left-color: #111827;
      background: #f9fafb;
    }
    .stat-value { font-size: 2rem; font-weight: 700; line-height: 1; }
    .stat-label { font-size: 0.875rem; color: #6b7280; margin-top: 0.5rem; }

    .cases-table {
      width: 100%;
      border-collapse: collapse;
      background: #fff;
      border-radius: 0.5rem;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .cases-table th {
      background: #f9fafb;
      padding: 0.75rem 1rem;
      text-align: left;
      font-weight: 600;
      font-size: 0.875rem;
      color: #374151;
      border-bottom: 2px solid #e5e7eb;
    }
    .cases-table td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #f3f4f6;
      font-size: 0.875rem;
    }
    .cases-table tr:hover { background: #f9fafb; }
    .cases-table a { color: #2563eb; text-decoration: none; }
    .cases-table a:hover { text-decoration: underline; }
    .cases-table a:focus-visible {
      outline: 2px solid #2563eb;
      outline-offset: 2px;
      border-radius: 2px;
    }

    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      color: #fff;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .priority--kritisch { color: #dc2626; font-weight: 700; }
    .priority--hoch { color: #ea580c; }
    .priority--mittel { color: #ca8a04; }
    .priority--niedrig { color: #65a30d; }

    .frist-warning { color: #ca8a04; font-weight: 600; }
    .frist-overdue { color: #dc2626; font-weight: 700; }

    .chart-bars { display: flex; flex-direction: column; gap: 0.5rem; }
    .chart-bar {
      display: grid;
      grid-template-columns: 180px 1fr 50px;
      align-items: center;
      gap: 0.75rem;
    }
    .bar-label { font-size: 0.875rem; color: #374151; }
    .bar-container {
      background: #f3f4f6;
      border-radius: 4px;
      height: 24px;
      overflow: hidden;
    }
    .bar-fill {
      background: #3b82f6;
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;
      min-width: 2px;
    }
    .bar-count { font-size: 0.875rem; font-weight: 600; text-align: right; }

    .empty-state { text-align: center; padding: 3rem; color: #9ca3af; }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }

    .btn {
      display: inline-block;
      padding: 0.375rem 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      background: #fff;
      color: #374151;
      font-size: 0.75rem;
      cursor: pointer;
      text-decoration: none;
    }
    .btn:hover { background: #f9fafb; }
    .btn:focus-visible {
      outline: 2px solid #2563eb;
      outline-offset: 2px;
    }

    h2 {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 2rem 0 1rem;
      color: #111827;
    }

    @media (max-width: 768px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .chart-bar { grid-template-columns: 120px 1fr 40px; }
      .cases-table { display: block; overflow-x: auto; }
    }

    @media (prefers-reduced-motion: reduce) {
      .bar-fill { transition: none; }
    }

    @media (forced-colors: active) {
      .status-badge { border: 1px solid; }
      .stat-card { border: 1px solid; }
    }
  `],
})
export class HinschgDashboardComponent implements OnInit, OnDestroy {
  dashboard: Dashboard | null = null;
  statusKeys: FallStatus[] = [
    'eingegangen', 'eingangsbestaetigung', 'in_pruefung',
    'in_bearbeitung', 'folgemassnahme', 'rueckmeldung',
    'abgeschlossen', 'archiviert',
  ];

  private destroy$ = new Subject<void>();

  constructor(private hinschgService: HinschgService) {}

  ngOnInit(): void {
    this.loadDashboard();

    // Auto-refresh every 60 seconds
    interval(60000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadDashboard());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDashboard(): void {
    this.hinschgService.getDashboard()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => this.dashboard = data,
        error: (err) => console.error('Dashboard load failed:', err),
      });
  }

  getStatusLabel(status: FallStatus): string {
    return this.hinschgService.getStatusLabel(status);
  }

  getStatusColor(status: FallStatus): string {
    return this.hinschgService.getStatusColor(status);
  }

  getKategorieLabel(kategorie: string): string {
    return this.hinschgService.getKategorieLabel(kategorie as any);
  }

  getNextFrist(c: HinweisCase): string | null {
    if (c.eingangsbestaetigung_frist && !c.eingangsbestaetigung_datum) {
      return c.eingangsbestaetigung_frist;
    }
    if (c.rueckmeldung_frist && !c.rueckmeldung_datum) {
      return c.rueckmeldung_frist;
    }
    return null;
  }

  getNextFristDatum(c: HinweisCase): string | null {
    return this.getNextFrist(c);
  }

  isFristNah(c: HinweisCase): boolean {
    const frist = this.getNextFrist(c);
    if (!frist) return false;
    const days = Math.ceil(
      (new Date(frist).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return days > 0 && days <= 3;
  }

  isFristUeberfaellig(c: HinweisCase): boolean {
    const frist = this.getNextFrist(c);
    if (!frist) return false;
    return new Date(frist) < new Date();
  }

  getCategoriesArray(): { label: string; count: number; percentage: number }[] {
    if (!this.dashboard?.kategorien_verteilung) return [];
    const total = this.dashboard.total_cases || 1;
    return Object.entries(this.dashboard.kategorien_verteilung).map(
      ([key, count]) => ({
        label: this.getKategorieLabel(key),
        count,
        percentage: (count / total) * 100,
      })
    ).sort((a, b) => b.count - a.count);
  }
}
