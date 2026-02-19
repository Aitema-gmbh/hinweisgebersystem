/**
 * HinSchG Cases List Component
 * 
 * Displays all cases with:
 * - Filtering by status, priority, category
 * - Sorting by date, aktenzeichen, priority
 * - Pagination
 * - Quick actions
 * - WCAG 2.1 AA compliant table
 */
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

import {
  HinschgService,
  HinweisCase,
  FallStatus,
  STATUS_CONFIG,
  KATEGORIE_LABELS,
} from '../../../services/hinschg.service';

@Component({
  selector: 'app-hinschg-cases-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <main class="cases-list" role="main" id="main-content">
      <header class="page-header">
        <h1>Faelle</h1>
        <button class="btn btn-primary" routerLink="/hinschg/cases/new"
                aria-label="Neuen Fall anlegen">
          + Neuer Fall
        </button>
      </header>

      <!-- Filters -->
      <section class="filters" aria-label="Fallliste filtern" role="search">
        <div class="filter-group">
          <label for="filter-search" class="sr-only">Suche</label>
          <input id="filter-search"
                 type="search"
                 [(ngModel)]="searchTerm"
                 (ngModelChange)="onSearchChange($event)"
                 placeholder="Aktenzeichen oder Beschreibung suchen..."
                 class="form-control search-input"
                 aria-label="Faelle durchsuchen">
        </div>
        
        <div class="filter-group">
          <label for="filter-status">Status</label>
          <select id="filter-status" [(ngModel)]="filterStatus"
                  (ngModelChange)="applyFilters()" class="form-control">
            <option value="">Alle Status</option>
            <option *ngFor="let s of statusOptions" [value]="s.value">
              {{ s.label }}
            </option>
          </select>
        </div>

        <div class="filter-group">
          <label for="filter-priority">Prioritaet</label>
          <select id="filter-priority" [(ngModel)]="filterPriority"
                  (ngModelChange)="applyFilters()" class="form-control">
            <option value="">Alle Prioritaeten</option>
            <option value="kritisch">Kritisch</option>
            <option value="hoch">Hoch</option>
            <option value="mittel">Mittel</option>
            <option value="niedrig">Niedrig</option>
          </select>
        </div>

        <div class="filter-group">
          <label for="filter-category">Kategorie</label>
          <select id="filter-category" [(ngModel)]="filterCategory"
                  (ngModelChange)="applyFilters()" class="form-control">
            <option value="">Alle Kategorien</option>
            <option *ngFor="let k of categoryOptions" [value]="k.value">
              {{ k.label }}
            </option>
          </select>
        </div>

        <button class="btn btn-secondary" (click)="resetFilters()"
                aria-label="Filter zuruecksetzen"
                *ngIf="hasActiveFilters()">
          Filter zuruecksetzen
        </button>
      </section>

      <!-- Results count -->
      <div class="results-info" role="status" aria-live="polite">
        {{ filteredCases.length }} von {{ allCases.length }} Faellen
        <span *ngIf="hasActiveFilters()">(gefiltert)</span>
      </div>

      <!-- Cases Table -->
      <div class="table-wrapper" role="region" aria-label="Falltabelle" tabindex="0">
        <table class="cases-table" aria-label="Faelle">
          <thead>
            <tr>
              <th scope="col">
                <button class="sort-btn" (click)="sort('aktenzeichen')"
                        [attr.aria-sort]="getSortDir('aktenzeichen')">
                  Aktenzeichen
                  <span class="sort-icon" aria-hidden="true">{{ getSortIcon('aktenzeichen') }}</span>
                </button>
              </th>
              <th scope="col">Status</th>
              <th scope="col">Kategorie</th>
              <th scope="col">
                <button class="sort-btn" (click)="sort('prioritaet')"
                        [attr.aria-sort]="getSortDir('prioritaet')">
                  Prioritaet
                  <span class="sort-icon" aria-hidden="true">{{ getSortIcon('prioritaet') }}</span>
                </button>
              </th>
              <th scope="col">
                <button class="sort-btn" (click)="sort('eingangsdatum')"
                        [attr.aria-sort]="getSortDir('eingangsdatum')">
                  Eingang
                  <span class="sort-icon" aria-hidden="true">{{ getSortIcon('eingangsdatum') }}</span>
                </button>
              </th>
              <th scope="col">Naechste Frist</th>
              <th scope="col"><span class="sr-only">Aktionen</span></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let c of paginatedCases; trackBy: trackByCase"
                [class.row-overdue]="hasOverdueFrist(c)"
                [class.row-critical]="c.prioritaet === 'kritisch'">
              <td>
                <a [routerLink]="['/hinschg/cases', c.id]"
                   [attr.aria-label]="'Fall ' + c.aktenzeichen + ' oeffnen'">
                  {{ c.aktenzeichen }}
                </a>
              </td>
              <td>
                <span class="status-badge"
                      [style.background-color]="getStatusColor(c.status)">
                  {{ getStatusLabel(c.status) }}
                </span>
              </td>
              <td>{{ getKategorieLabel(c.kategorie) }}</td>
              <td>
                <span class="priority-badge"
                      [class]="'priority--' + c.prioritaet">
                  {{ c.prioritaet | titlecase }}
                </span>
              </td>
              <td>{{ c.eingangsdatum | date:'dd.MM.yyyy' }}</td>
              <td>
                <span *ngIf="getNextFrist(c) as frist"
                      [class.frist-overdue]="isFristOverdue(frist)"
                      [class.frist-soon]="isFristSoon(frist)">
                  {{ frist | date:'dd.MM.yyyy' }}
                </span>
                <span *ngIf="!getNextFrist(c)" class="text-muted">-</span>
              </td>
              <td>
                <a [routerLink]="['/hinschg/cases', c.id]"
                   class="btn btn-sm"
                   aria-label="Details">
                  Details
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty state -->
      <div *ngIf="filteredCases.length === 0 && !loading" class="empty-state">
        <p *ngIf="hasActiveFilters()">
          Keine Faelle fuer die gewaehlten Filter gefunden.
        </p>
        <p *ngIf="!hasActiveFilters()">
          Noch keine Faelle vorhanden.
        </p>
      </div>

      <!-- Pagination -->
      <nav *ngIf="totalPages > 1" class="pagination" aria-label="Seitennavigation">
        <button class="btn btn-sm" (click)="goToPage(currentPage - 1)"
                [disabled]="currentPage === 1"
                aria-label="Vorherige Seite">
          &larr; Zurueck
        </button>
        <span class="page-info" aria-current="page">
          Seite {{ currentPage }} von {{ totalPages }}
        </span>
        <button class="btn btn-sm" (click)="goToPage(currentPage + 1)"
                [disabled]="currentPage === totalPages"
                aria-label="Naechste Seite">
          Weiter &rarr;
        </button>
      </nav>

      <div *ngIf="loading" class="loading" role="status">Laden...</div>
    </main>
  `,
  styles: [`
    :host { display: block; padding: 1.5rem; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .page-header h1 { font-size: 1.5rem; margin: 0; }
    
    .filters { display: flex; gap: 1rem; flex-wrap: wrap; align-items: flex-end; margin-bottom: 1rem; padding: 1rem; background: #fff; border-radius: 0.5rem; border: 1px solid #e5e7eb; }
    .filter-group { display: flex; flex-direction: column; gap: 0.25rem; }
    .filter-group label { font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase; }
    .form-control { padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 0.875rem; min-height: 44px; }
    .form-control:focus { outline: 2px solid #2563eb; border-color: #2563eb; }
    .search-input { min-width: 280px; }
    
    .results-info { font-size: 0.875rem; color: #6b7280; margin-bottom: 0.75rem; }
    
    .table-wrapper { overflow-x: auto; }
    .cases-table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 0.5rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .cases-table th { background: #f9fafb; padding: 0.75rem 1rem; text-align: left; font-size: 0.875rem; color: #374151; border-bottom: 2px solid #e5e7eb; }
    .cases-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #f3f4f6; font-size: 0.875rem; }
    .cases-table tr:hover { background: #f9fafb; }
    .cases-table a { color: #2563eb; text-decoration: none; }
    .cases-table a:hover { text-decoration: underline; }
    .cases-table a:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; border-radius: 2px; }
    
    .sort-btn { background: none; border: none; font: inherit; font-weight: 600; color: #374151; cursor: pointer; display: flex; align-items: center; gap: 0.25rem; padding: 0; min-height: auto; min-width: auto; }
    .sort-btn:hover { color: #111827; }
    .sort-btn:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
    .sort-icon { font-size: 0.75rem; }
    
    .row-overdue { background: #fef2f2; }
    .row-critical { border-left: 3px solid #dc2626; }
    
    .status-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; color: #fff; font-size: 0.75rem; font-weight: 600; }
    .priority--kritisch { color: #dc2626; font-weight: 700; }
    .priority--hoch { color: #ea580c; }
    .priority--mittel { color: #ca8a04; }
    .priority--niedrig { color: #65a30d; }
    .frist-overdue { color: #dc2626; font-weight: 700; }
    .frist-soon { color: #ca8a04; font-weight: 600; }
    .text-muted { color: #9ca3af; }
    
    .btn { padding: 0.5rem 1rem; border-radius: 0.375rem; font-size: 0.875rem; cursor: pointer; border: 1px solid #d1d5db; background: #fff; min-height: 44px; }
    .btn:hover { background: #f9fafb; }
    .btn:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
    .btn-primary { background: #2563eb; color: #fff; border-color: #2563eb; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-secondary { background: #f3f4f6; }
    .btn-sm { padding: 0.375rem 0.75rem; font-size: 0.75rem; min-height: 36px; }
    
    .pagination { display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 1.5rem; }
    .page-info { font-size: 0.875rem; color: #6b7280; }
    
    .empty-state { text-align: center; padding: 3rem; color: #9ca3af; }
    .loading { text-align: center; padding: 3rem; color: #6b7280; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border-width: 0; }
    
    @media (max-width: 768px) {
      .filters { flex-direction: column; }
      .search-input { min-width: auto; width: 100%; }
    }
  `],
})
export class HinschgCasesListComponent implements OnInit, OnDestroy {
  allCases: HinweisCase[] = [];
  filteredCases: HinweisCase[] = [];
  paginatedCases: HinweisCase[] = [];
  loading = true;

  searchTerm = '';
  filterStatus = '';
  filterPriority = '';
  filterCategory = '';

  sortField = 'eingangsdatum';
  sortDirection: 'asc' | 'desc' = 'desc';

  currentPage = 1;
  pageSize = 20;
  totalPages = 1;

  statusOptions: { value: string; label: string }[] = [];
  categoryOptions: { value: string; label: string }[] = [];

  private destroy$ = new Subject<void>();
  private search$ = new Subject<string>();

  constructor(private hinschgService: HinschgService) {
    this.statusOptions = Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
      value: key,
      label: (cfg as any).label,
    }));
    this.categoryOptions = Object.entries(KATEGORIE_LABELS).map(([key, label]) => ({
      value: key,
      label: label as string,
    }));
  }

  ngOnInit(): void {
    this.loadCases();
    this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(() => this.applyFilters());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCases(): void {
    this.hinschgService.getCases().pipe(takeUntil(this.destroy$)).subscribe({
      next: (cases) => {
        this.allCases = cases;
        this.applyFilters();
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  onSearchChange(term: string): void {
    this.search$.next(term);
  }

  applyFilters(): void {
    let filtered = [...this.allCases];

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.aktenzeichen.toLowerCase().includes(term)
      );
    }
    if (this.filterStatus) {
      filtered = filtered.filter(c => c.status === this.filterStatus);
    }
    if (this.filterPriority) {
      filtered = filtered.filter(c => c.prioritaet === this.filterPriority);
    }
    if (this.filterCategory) {
      filtered = filtered.filter(c => c.kategorie === this.filterCategory);
    }

    this.filteredCases = this.sortCases(filtered);
    this.totalPages = Math.max(1, Math.ceil(this.filteredCases.length / this.pageSize));
    this.currentPage = Math.min(this.currentPage, this.totalPages);
    this.updatePagination();
  }

  sortCases(cases: HinweisCase[]): HinweisCase[] {
    return cases.sort((a, b) => {
      let valA: any = (a as any)[this.sortField];
      let valB: any = (b as any)[this.sortField];
      if (this.sortField === 'eingangsdatum') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }
      const cmp = valA < valB ? -1 : valA > valB ? 1 : 0;
      return this.sortDirection === 'asc' ? cmp : -cmp;
    });
  }

  sort(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.applyFilters();
  }

  getSortDir(field: string): string {
    if (this.sortField !== field) return 'none';
    return this.sortDirection === 'asc' ? 'ascending' : 'descending';
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return '\u21C5';
    return this.sortDirection === 'asc' ? '\u2191' : '\u2193';
  }

  updatePagination(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedCases = this.filteredCases.slice(start, start + this.pageSize);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.filterStatus = '';
    this.filterPriority = '';
    this.filterCategory = '';
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.filterStatus || this.filterPriority || this.filterCategory);
  }

  getStatusLabel(s: string): string { return this.hinschgService.getStatusLabel(s as any); }
  getStatusColor(s: string): string { return this.hinschgService.getStatusColor(s as any); }
  getKategorieLabel(k: string): string { return this.hinschgService.getKategorieLabel(k as any); }

  getNextFrist(c: HinweisCase): string | null {
    if (!c.fristen) return null;
    const pending = c.fristen.filter((f: any) => !f.erledigt).sort(
      (a: any, b: any) => new Date(a.frist_datum).getTime() - new Date(b.frist_datum).getTime()
    );
    return pending.length > 0 ? pending[0].frist_datum : null;
  }

  hasOverdueFrist(c: HinweisCase): boolean {
    const f = this.getNextFrist(c);
    return f ? new Date(f) < new Date() : false;
  }

  isFristOverdue(datum: string): boolean {
    return new Date(datum) < new Date();
  }

  isFristSoon(datum: string): boolean {
    const days = (new Date(datum).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days > 0 && days <= 3;
  }

  trackByCase(index: number, c: HinweisCase): string {
    return c.id;
  }
}
