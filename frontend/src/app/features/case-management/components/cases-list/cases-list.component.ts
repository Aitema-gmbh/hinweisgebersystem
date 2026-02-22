/**
 * aitema|Hinweis - Cases List Component
 * D3: Frist-Ampel-Spalte mit hw-deadline-badge
 * D4: Weiterleitungs-Status-Anzeige
 * UI-Overhaul: aitema Design-System 2026
 */
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { DeadlineBadgeComponent } from '../../../../shared/components/deadline-badge/deadline-badge.component';
import { DeadlineSummaryWidgetComponent } from '../../../../shared/components/deadline-badge/deadline-summary-widget.component';
import { DeadlineSummary, DeadlineStatusData } from '../../../../shared/components/deadline-badge/deadline-badge.component';

export interface CaseListItem {
  id: string;
  case_number: string;
  titel: string;
  status: string;
  schweregrad: string | null;
  assignee_id: string | null;
  bearbeitungsdauer_tage: number;
  opened_at: string;
  updated_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  forwarded_to_ombudsperson_at: string | null;
  ombudsperson_recommendation: string | null;
  deadline_status: DeadlineStatusData;
}

@Component({
  selector: 'hw-cases-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, DeadlineBadgeComponent, DeadlineSummaryWidgetComponent],
  template: `
    <div class="cases-wrapper" role="main">
      <!-- Page Header -->
      <header class="page-header">
        <div class="page-header__content">
          <h1 class="page-header__title">Fallübersicht</h1>
          <p class="page-header__subtitle">HinSchG-konforme Fallbearbeitung für die interne Meldestelle.</p>
        </div>
        <div class="page-header__actions">
          <div class="filter-group">
            <label for="statusFilter" class="filter-label">Status</label>
            <select id="statusFilter" class="filter-select" [(ngModel)]="statusFilter" (change)="loadCases()">
              <option value="">Alle Status</option>
              <option value="offen">Offen</option>
              <option value="zugewiesen">Zugewiesen</option>
              <option value="in_ermittlung">In Ermittlung</option>
              <option value="abgeschlossen">Abgeschlossen</option>
            </select>
          </div>
          <div class="filter-group">
            <label for="deadlineFilter" class="filter-label">Frist</label>
            <select id="deadlineFilter" class="filter-select" [(ngModel)]="deadlineFilter" (change)="loadCases()">
              <option value="">Alle Fristen</option>
              <option value="urgent">Dringend (gelb/rot)</option>
            </select>
          </div>
        </div>
      </header>

      <!-- Page Content Grid -->
      <div class="content-grid">
        <!-- Sidebar -->
        <aside class="content-grid__sidebar">
          <hw-deadline-summary-widget [summary]="deadlineSummary()"></hw-deadline-summary-widget>
        </aside>

        <!-- Main Content -->
        <div class="content-grid__main">
          @if (loading()) {
            <div class="glass-card loading-card">
              <div class="spinner-ring" aria-hidden="true"></div>
              <p class="loading-text">Fälle werden geladen...</p>
            </div>
          } @else if (cases().length === 0) {
            <div class="glass-card empty-state-card">
              <p class="empty-state-text">Keine Fälle gefunden, die den Filterkriterien entsprechen.</p>
            </div>
          } @else {
            <div class="glass-card table-card">
              <div class="table-wrapper">
                <table class="cases-table">
                  <thead>
                    <tr>
                      <th>Fall</th>
                      <th>Status</th>
                      <th>Schweregrad</th>
                      <th>HinSchG §17 Frist</th>
                      <th>Ombudsperson</th>
                      <th>Alter</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (c of cases(); track c.id) {
                      <tr class="cases-table__row">
                        <!-- Case Number + Title -->
                        <td data-label="Fall">
                          <div class="cases-table__cell-primary">{{ c.case_number }}</div>
                          <div class="cases-table__cell-secondary">{{ c.titel }}</div>
                        </td>

                        <!-- Status -->
                        <td data-label="Status">
                          <span [class]="statusBadgeClass(c.status)">
                            {{ c.status | titlecase }}
                          </span>
                        </td>

                        <!-- Severity -->
                        <td data-label="Schweregrad">
                          @if (c.schweregrad) {
                            <span [class]="schweregradClass(c.schweregrad)">
                              {{ c.schweregrad | titlecase }}
                            </span>
                          } @else {
                            <span class="text-muted">-</span>
                          }
                        </td>

                        <!-- Deadline -->
                        <td data-label="HinSchG §17 Frist">
                          @if (c.deadline_status) {
                            <hw-deadline-badge
                              [status]="c.deadline_status.status"
                              [label]="c.deadline_status.label"
                              [deadlineData]="c.deadline_status">
                            </hw-deadline-badge>
                          }
                        </td>

                        <!-- Ombudsperson -->
                        <td data-label="Ombudsperson">
                          @if (c.forwarded_to_ombudsperson_at) {
                            @if (c.ombudsperson_recommendation) {
                              <span class="status-badge status-badge--recommendation">
                                {{ recommendationLabel(c.ombudsperson_recommendation) }}
                              </span>
                            } @else {
                              <span class="forwarded-indicator">
                                <span class="forwarded-indicator__dot"></span>
                                Weitergeleitet
                              </span>
                            }
                          } @else {
                            <span class="text-muted">-</span>
                          }
                        </td>

                        <!-- Age -->
                        <td data-label="Alter" class="cases-table__cell-secondary">
                          {{ c.bearbeitungsdauer_tage }}d
                        </td>

                        <!-- Link -->
                        <td>
                          <a [routerLink]="['/faelle', c.id]" class="table-action-link">
                            Details <span>&#8594;</span>
                          </a>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <!-- Pagination -->
              @if (pagination() && pagination()!.pages > 1) {
                <div class="pagination">
                  <span class="pagination__summary">
                    Seite {{ currentPage() }} von {{ pagination()!.pages }} ({{ pagination()!.total }} Fälle)
                  </span>
                  <div class="pagination__controls">
                    <button (click)="prevPage()" [disabled]="currentPage() === 1" class="btn-aitema btn-aitema--ghost">
                      &#8592; Zurück
                    </button>
                    <button (click)="nextPage()" [disabled]="currentPage() >= pagination()!.pages" class="btn-aitema btn-aitema--ghost">
                      Weiter &#8594;
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      background-color: #f8fafc;
      min-height: 100vh;
    }

    .cases-wrapper {
      max-width: 1440px;
      margin: 0 auto;
      padding: 1.5rem;
      font-family: "Inter", system-ui, sans-serif;
    }

    .page-header {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      padding: 1.5rem;
      background: #0f172a;
      color: #fff;
      border-radius: 1rem;
    }
    @media (min-width: 768px) {
      .page-header {
        flex-direction: row;
        align-items: center;
      }
    }
    .page-header__title {
      font-size: 1.5rem;
      font-weight: 800;
      margin: 0;
      letter-spacing: -0.02em;
      color: #fff;
    }
    .page-header__subtitle {
      font-size: 0.875rem;
      color: #cbd5e1;
      margin: 0.25rem 0 0;
      max-width: 350px;
    }
    .page-header__actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .filter-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .filter-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #cbd5e1;
    }
    .filter-select {
      padding: 0.5rem 2rem 0.5rem 0.75rem;
      border: 1px solid #37476b;
      border-radius: 0.5rem;
      background-color: #1e3a5f;
      color: #fff;
      font-size: 0.875rem;
      font-weight: 500;
      appearance: none;
      background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
      background-position: right 0.5rem center;
      background-repeat: no-repeat;
      background-size: 1.5em 1.5em;
      transition: border-color 0.2s;
    }
    .filter-select:hover {
      border-color: #3b82f6;
    }
    .filter-select:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
    }

    .content-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
    @media (min-width: 1024px) {
      .content-grid {
        grid-template-columns: 280px 1fr;
      }
    }

    .glass-card {
      background: rgba(255, 255, 255, 0.97);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      box-shadow: 0 4px 24px rgba(15, 23, 42, 0.08), 0 1px 4px rgba(15, 23, 42, 0.04);
      overflow: hidden;
      margin-bottom: 1.5rem;
    }
    .loading-card, .empty-state-card {
      padding: 3rem 1.5rem;
      text-align: center;
    }
    .spinner-ring {
      width: 3rem;
      height: 3rem;
      border: 3px solid #e2e8f0;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.9s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading-text, .empty-state-text {
      color: #64748b;
      font-size: 0.9375rem;
      font-weight: 500;
    }

    .table-card {
      padding: 0;
    }
    .table-wrapper {
      overflow-x: auto;
    }
    .cases-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    .cases-table th, .cases-table td {
      padding: 1rem;
      text-align: left;
      white-space: nowrap;
    }
    .cases-table thead tr {
      border-bottom: 1px solid #e2e8f0;
    }
    .cases-table th {
      font-size: 0.75rem;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background-color: #f8fafc;
    }
    .cases-table__row {
      border-bottom: 1px solid #f1f5f9;
      transition: background-color 0.2s ease;
    }
    .cases-table__row:last-child {
      border-bottom: none;
    }
    .cases-table__row:hover {
      background-color: #f8fafc;
    }
    .cases-table__cell-primary {
      font-weight: 600;
      color: #1e293b;
    }
    .cases-table__cell-secondary {
      font-size: 0.8125rem;
      color: #64748b;
      max-width: 200px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .text-muted {
      color: #94a3b8;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    .status-badge--abgeschlossen { background: #f1f5f9; color: #475569; }
    .status-badge--in-ermittlung, .status-badge--stellungnahme { background: #fef3c7; color: #92400e; }
    .status-badge--zugewiesen { background: #dbeafe; color: #1e40af; }
    .status-badge--offen { background: #e2e8f0; color: #475569; }
    .status-badge--eskaliert { background: #fee2e2; color: #991b1b; }
    .status-badge--recommendation { background: #f3e8ff; color: #6b21a8; }

    .severity-label {
      font-weight: 600;
    }
    .severity-label--gering { color: #059669; }
    .severity-label--mittel { color: #f59e0b; }
    .severity-label--schwer { color: #f97316; }
    .severity-label--kritisch { color: #ef4444; font-weight: 800; }

    .forwarded-indicator {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.8125rem;
      color: #a855f7;
    }
    .forwarded-indicator__dot {
      width: 0.5rem;
      height: 0.5rem;
      background-color: #c084fc;
      border-radius: 50%;
      animation: pulse 1.5s infinite ease-in-out;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .table-action-link {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-weight: 600;
      color: #3b82f6;
      text-decoration: none;
      transition: color 0.2s;
    }
    .table-action-link:hover {
      color: #0f172a;
    }

    .pagination {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      background-color: #f8fafc;
      border-top: 1px solid #e2e8f0;
    }
    @media (min-width: 640px) {
      .pagination {
        flex-direction: row;
      }
    }
    .pagination__summary {
      font-size: 0.8125rem;
      color: #64748b;
    }
    .pagination__controls {
      display: flex;
      gap: 0.5rem;
    }

    .btn-aitema {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      padding: 0.625rem 1rem;
      border: 1.5px solid transparent;
      border-radius: 0.5rem;
      font-family: inherit;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
    }
    .btn-aitema:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    .btn-aitema--ghost {
      background: transparent;
      border-color: #e2e8f0;
      color: #475569;
    }
    .btn-aitema--ghost:hover:not(:disabled) {
      background: #f8fafc;
      border-color: #cbd5e1;
      color: #0f172a;
    }
  `]
})
export class CasesListComponent implements OnInit {
  cases = signal<CaseListItem[]>([]);
  deadlineSummary = signal<DeadlineSummary | null>(null);
  loading = signal(true);
  pagination = signal<{ page: number; per_page: number; total: number; pages: number } | null>(null);
  currentPage = signal(1);

  statusFilter = '';
  deadlineFilter = '';

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadCases();
  }

  loadCases(): void {
    this.loading.set(true);
    const params: Record<string, string> = {
      page: String(this.currentPage()),
      per_page: '25',
    };
    if (this.statusFilter) params['status'] = this.statusFilter;
    if (this.deadlineFilter) params['deadline_filter'] = this.deadlineFilter;

    this.api.get<{ items: CaseListItem[]; pagination: any; deadline_summary: DeadlineSummary }>(
      '/cases', params
    ).subscribe({
      next: (resp) => {
        this.cases.set(resp.items);
        this.pagination.set(resp.pagination);
        this.deadlineSummary.set(resp.deadline_summary);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
      this.loadCases();
    }
  }

  nextPage(): void {
    const p = this.pagination();
    if (p && this.currentPage() < p.pages) {
      this.currentPage.update((c) => c + 1);
      this.loadCases();
    }
  }

  statusBadgeClass(status: string): string {
    const baseClass = 'status-badge';
    const statusClass = `status-badge--${status.replace(/_/g, '-')}`;
    return `${baseClass} ${statusClass}`;
  }

  schweregradClass(s: string): string {
    const baseClass = 'severity-label';
    const severityClass = `severity-label--${s}`;
    return `${baseClass} ${severityClass}`;
  }

  recommendationLabel(r: string): string {
    const labels: Record<string, string> = {
      pursue: 'Weiterverfolgen',
      close: 'Schliessen',
      escalate: 'Eskalieren',
    };
    return labels[r] || r;
  }
}
