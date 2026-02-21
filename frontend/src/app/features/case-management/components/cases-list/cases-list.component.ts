import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService, Case, PaginatedResponse } from '../../../../core/services/api.service';
import { FormsModule } from '@angular/forms';

type FilterStatus = 'alle' | 'offen' | 'in_bearbeitung' | 'kritisch' | 'abgeschlossen';

@Component({
  selector: 'hw-cases-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <main class="cases-page" role="main" aria-label="Fallverwaltung">

      <!-- Header -->
      <header class="cases-header">
        <div class="cases-header__title-group">
          <h1 class="cases-header__title">
            <span class="cases-header__icon" aria-hidden="true">📋</span>
            Faelle
          </h1>
          <span class="cases-header__count" *ngIf="!loading()">
            {{ filteredCases().length }} {{ filteredCases().length === 1 ? 'Fall' : 'Faelle' }}
          </span>
        </div>
        <button class="btn-refresh" (click)="loadCases()" [disabled]="loading()" aria-label="Faelle neu laden">
          <span class="btn-refresh__icon" [class.spinning]="loading()" aria-hidden="true">&#x21BB;</span>
          Aktualisieren
        </button>
      </header>

      <!-- Filter Pills -->
      <nav class="filter-pills" role="navigation" aria-label="Faelle filtern">
        <button
          *ngFor="let pill of filterPills"
          class="filter-pill"
          [class.filter-pill--active]="activeFilter() === pill.value"
          (click)="setFilter(pill.value)"
          [attr.aria-pressed]="activeFilter() === pill.value"
        >
          <span class="filter-pill__dot" [style.background]="pill.color" aria-hidden="true"></span>
          {{ pill.label }}
          <span class="filter-pill__badge" *ngIf="getCountForFilter(pill.value) > 0">
            {{ getCountForFilter(pill.value) }}
          </span>
        </button>
      </nav>

      <!-- Fehler -->
      <div class="error-banner" *ngIf="error()" role="alert">
        <span aria-hidden="true">&#x26A0;&#xFE0F;</span>
        {{ error() }}
        <button class="error-banner__retry" (click)="loadCases()">Erneut versuchen</button>
      </div>

      <!-- Ladezustand -->
      <div class="loading-grid" *ngIf="loading()" aria-busy="true" aria-label="Laedt...">
        <div class="loading-card" *ngFor="let i of [1,2,3,4,5]">
          <div class="loading-bar loading-bar--short"></div>
          <div class="loading-bar loading-bar--long"></div>
          <div class="loading-bar loading-bar--medium"></div>
        </div>
      </div>

      <!-- Leerer Zustand -->
      <div class="empty-state" *ngIf="!loading() && filteredCases().length === 0 && !error()" role="status">
        <div class="empty-state__illustration" aria-hidden="true">&#x1F4C2;</div>
        <h2 class="empty-state__title">Keine Faelle gefunden</h2>
        <p class="empty-state__text">
          {{ activeFilter() === 'alle'
            ? 'Es sind noch keine Faelle vorhanden.'
            : 'Keine Faelle mit dem gewaehlten Filter gefunden.' }}
        </p>
        <button class="btn-secondary" *ngIf="activeFilter() !== 'alle'" (click)="setFilter('alle')">
          Alle Faelle anzeigen
        </button>
      </div>

      <!-- Faelle-Liste -->
      <section class="cases-grid" *ngIf="!loading() && filteredCases().length > 0" aria-label="Faelle-Liste">
        <article
          *ngFor="let c of filteredCases(); trackBy: trackById"
          class="case-card"
          [class.case-card--critical]="c.schweregrad === 'kritisch' || c.schweregrad === 'hoch'"
          [routerLink]="['/faelle', c.id]"
          tabindex="0"
          role="link"
          [attr.aria-label]="'Fall ' + c.case_number + ': ' + c.titel"
        >
          <!-- Card Header -->
          <header class="case-card__header">
            <div class="case-card__meta">
              <code class="case-card__id">{{ c.case_number }}</code>
              <span class="case-card__severity-icon" *ngIf="c.schweregrad">
                {{ getSeverityIcon(c.schweregrad) }}
              </span>
            </div>
            <span
              class="status-badge"
              [class]="'status-badge--' + getStatusClass(c.status)"
              [attr.aria-label]="'Status: ' + getStatusLabel(c.status)"
            >
              {{ getStatusLabel(c.status) }}
            </span>
          </header>

          <!-- Card Body -->
          <div class="case-card__body">
            <h3 class="case-card__title">{{ c.titel }}</h3>
          </div>

          <!-- Card Footer -->
          <footer class="case-card__footer">
            <div class="case-card__date">
              <span class="case-card__date-icon" aria-hidden="true">&#x1F4C5;</span>
              <time [dateTime]="c.opened_at" [class.case-card__date--urgent]="isUrgent(c)">
                {{ formatDate(c.opened_at) }}
              </time>
              <span class="case-card__date-badge" *ngIf="isUrgent(c)" aria-label="Dringend">!</span>
            </div>
            <div class="case-card__duration" *ngIf="c.bearbeitungsdauer_tage > 0">
              <span aria-hidden="true">&#x23F1;</span>
              {{ c.bearbeitungsdauer_tage }}d
            </div>
          </footer>
        </article>
      </section>

      <!-- Pagination -->
      <nav class="pagination" *ngIf="totalPages() > 1" aria-label="Seitennavigation">
        <button
          class="pagination__btn"
          (click)="goToPage(currentPage() - 1)"
          [disabled]="currentPage() === 1"
          aria-label="Vorherige Seite"
        >&#x2190; Zurueck</button>
        <span class="pagination__info" aria-live="polite">
          Seite {{ currentPage() }} von {{ totalPages() }}
        </span>
        <button
          class="pagination__btn"
          (click)="goToPage(currentPage() + 1)"
          [disabled]="currentPage() === totalPages()"
          aria-label="Naechste Seite"
        >Weiter &#x2192;</button>
      </nav>
    </main>
  `,
  styles: [`
    .cases-page {
      max-width: 1100px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
    }
    .cases-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .cases-header__title-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .cases-header__title {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--aitema-navy);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .cases-header__icon { font-size: 1.5rem; }
    .cases-header__count {
      background: var(--aitema-slate-100);
      color: var(--aitema-muted);
      font-size: 0.85rem;
      font-weight: 600;
      padding: 0.25rem 0.65rem;
      border-radius: 999px;
    }
    .btn-refresh {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      background: white;
      border: 1px solid var(--aitema-slate-200);
      color: var(--aitema-text);
      font-size: 0.875rem;
      font-weight: 500;
      padding: 0.5rem 1rem;
      border-radius: var(--radius-btn);
      cursor: pointer;
      transition: all var(--transition-fast);
    }
    .btn-refresh:hover:not(:disabled) {
      border-color: var(--aitema-accent);
      color: var(--aitema-accent);
    }
    .btn-refresh:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-refresh__icon { font-size: 1rem; display: inline-block; }
    .btn-refresh__icon.spinning { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .btn-secondary {
      background: white;
      border: 1px solid var(--aitema-slate-200);
      color: var(--aitema-accent);
      padding: 0.6rem 1.2rem;
      border-radius: var(--radius-btn);
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition-fast);
    }
    .btn-secondary:hover { background: var(--aitema-slate-50); }
    .filter-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }
    .filter-pill {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.4rem 0.9rem;
      border: 1.5px solid var(--aitema-slate-200);
      background: white;
      color: var(--aitema-muted);
      font-size: 0.875rem;
      font-weight: 500;
      border-radius: 999px;
      cursor: pointer;
      transition: all var(--transition-fast);
    }
    .filter-pill:hover {
      border-color: var(--aitema-accent);
      color: var(--aitema-accent);
    }
    .filter-pill--active {
      background: var(--aitema-accent);
      border-color: var(--aitema-accent);
      color: white;
    }
    .filter-pill--active:hover { background: var(--aitema-accent-hover); }
    .filter-pill__dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .filter-pill--active .filter-pill__dot { background: rgba(255,255,255,0.7) !important; }
    .filter-pill__badge {
      background: rgba(0,0,0,0.1);
      font-size: 0.75rem;
      padding: 0.1rem 0.45rem;
      border-radius: 999px;
      min-width: 1.4rem;
      text-align: center;
    }
    .filter-pill--active .filter-pill__badge { background: rgba(255,255,255,0.25); }
    .error-banner {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
      padding: 1rem 1.25rem;
      border-radius: var(--radius-card);
      margin-bottom: 1.5rem;
      font-size: 0.9rem;
    }
    .error-banner__retry {
      margin-left: auto;
      background: none;
      border: 1px solid #fca5a5;
      color: #991b1b;
      padding: 0.3rem 0.8rem;
      border-radius: var(--radius-btn);
      cursor: pointer;
      font-size: 0.85rem;
    }
    .error-banner__retry:hover { background: #fee2e2; }
    .loading-grid { display: grid; gap: 1rem; }
    .loading-card {
      background: white;
      border: 1px solid var(--aitema-slate-200);
      border-radius: var(--radius-card);
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      animation: pulse 1.5s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
    .loading-bar {
      height: 0.875rem;
      border-radius: 4px;
      background: var(--aitema-slate-200);
    }
    .loading-bar--short { width: 30%; }
    .loading-bar--medium { width: 55%; }
    .loading-bar--long { width: 85%; }
    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      color: var(--aitema-muted);
    }
    .empty-state__illustration {
      font-size: 4rem;
      margin-bottom: 1rem;
      display: block;
    }
    .empty-state__title {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--aitema-navy);
      margin: 0 0 0.5rem;
    }
    .empty-state__text {
      font-size: 0.95rem;
      margin: 0 0 1.5rem;
      color: var(--aitema-muted);
    }
    .cases-grid { display: grid; gap: 0.875rem; }
    .case-card {
      background: white;
      border: 1px solid var(--aitema-slate-200);
      border-radius: var(--radius-card);
      padding: 1.25rem 1.5rem;
      cursor: pointer;
      transition: box-shadow var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast);
      text-decoration: none;
      color: inherit;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .case-card:hover, .case-card:focus-visible {
      box-shadow: var(--shadow-md);
      border-color: var(--aitema-accent);
      transform: translateY(-1px);
      outline: none;
    }
    .case-card:focus-visible {
      outline: 2px solid var(--aitema-accent);
      outline-offset: 2px;
    }
    .case-card--critical { border-left: 4px solid var(--aitema-red); }
    .case-card__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .case-card__meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .case-card__id {
      font-family: 'Courier New', Courier, monospace;
      font-size: 0.8rem;
      font-weight: 600;
      background: var(--aitema-slate-100);
      color: var(--aitema-muted);
      padding: 0.2rem 0.55rem;
      border-radius: 4px;
      letter-spacing: 0.03em;
    }
    .case-card__severity-icon { font-size: 1rem; }
    .case-card__title {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--aitema-navy);
      line-height: 1.4;
    }
    .case-card__footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .case-card__date {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.825rem;
      color: var(--aitema-muted);
    }
    .case-card__date-icon { font-size: 0.85rem; }
    .case-card__date--urgent { color: var(--aitema-red); font-weight: 600; }
    .case-card__date-badge {
      background: var(--aitema-red);
      color: white;
      font-size: 0.7rem;
      font-weight: 700;
      width: 1.1rem;
      height: 1.1rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .case-card__duration {
      font-size: 0.8rem;
      color: var(--aitema-muted);
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      font-size: 0.775rem;
      font-weight: 600;
      padding: 0.3rem 0.7rem;
      border-radius: 999px;
      white-space: nowrap;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    .status-badge--offen { background: #dbeafe; color: #1d4ed8; }
    .status-badge--in-bearbeitung { background: #fef3c7; color: #b45309; }
    .status-badge--kritisch { background: #fee2e2; color: #991b1b; }
    .status-badge--abgeschlossen { background: #d1fae5; color: #065f46; }
    .status-badge--default { background: var(--aitema-slate-100); color: var(--aitema-muted); }
    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      margin-top: 2rem;
    }
    .pagination__btn {
      background: white;
      border: 1px solid var(--aitema-slate-200);
      color: var(--aitema-accent);
      padding: 0.5rem 1rem;
      border-radius: var(--radius-btn);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition-fast);
    }
    .pagination__btn:hover:not(:disabled) {
      background: var(--aitema-accent);
      color: white;
      border-color: var(--aitema-accent);
    }
    .pagination__btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .pagination__info {
      font-size: 0.875rem;
      color: var(--aitema-muted);
      font-weight: 500;
    }
    @media (max-width: 640px) {
      .cases-page { padding: 1.25rem 1rem; }
      .cases-header__title { font-size: 1.35rem; }
      .case-card { padding: 1rem; }
    }
  `]
})
export class CasesListComponent implements OnInit {
  cases = signal<Case[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  activeFilter = signal<FilterStatus>('alle');
  currentPage = signal(1);
  totalPages = signal(1);

  filteredCases = computed(() => {
    const filter = this.activeFilter();
    const all = this.cases();
    if (filter === 'alle') return all;
    if (filter === 'kritisch') {
      return all.filter(c => c.schweregrad === 'kritisch' || c.schweregrad === 'hoch');
    }
    if (filter === 'offen') {
      return all.filter(c => ['offen','neu','eingegangen'].includes(c.status.toLowerCase()));
    }
    if (filter === 'in_bearbeitung') {
      return all.filter(c => ['in_bearbeitung','in_pruefung','zugewiesen'].includes(c.status.toLowerCase()));
    }
    if (filter === 'abgeschlossen') {
      return all.filter(c => ['abgeschlossen','geschlossen','abgelehnt','archiviert'].includes(c.status.toLowerCase()));
    }
    return all;
  });

  filterPills: { label: string; value: FilterStatus; color: string }[] = [
    { label: 'Alle',           value: 'alle',          color: '#94a3b8' },
    { label: 'Offen',          value: 'offen',         color: '#3b82f6' },
    { label: 'In Bearbeitung', value: 'in_bearbeitung', color: '#d97706' },
    { label: 'Kritisch',       value: 'kritisch',      color: '#dc2626' },
    { label: 'Abgeschlossen',  value: 'abgeschlossen', color: '#059669' },
  ];

  constructor(private api: ApiService) {}

  ngOnInit(): void { this.loadCases(); }

  loadCases(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getCases({ page: this.currentPage(), per_page: 50 }).subscribe({
      next: (res: PaginatedResponse<Case>) => {
        this.cases.set(res.items);
        this.totalPages.set(res.pagination.pages);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.error.set('Faelle konnten nicht geladen werden. Bitte versuche es erneut.');
        this.loading.set(false);
        console.error('[CasesListComponent] Ladefehler:', err);
      }
    });
  }

  setFilter(filter: FilterStatus): void { this.activeFilter.set(filter); }

  getCountForFilter(filter: FilterStatus): number {
    const all = this.cases();
    if (filter === 'alle') return all.length;
    if (filter === 'kritisch') return all.filter(c => c.schweregrad === 'kritisch' || c.schweregrad === 'hoch').length;
    if (filter === 'offen') return all.filter(c => ['offen','neu','eingegangen'].includes(c.status.toLowerCase())).length;
    if (filter === 'in_bearbeitung') return all.filter(c => ['in_bearbeitung','in_pruefung','zugewiesen'].includes(c.status.toLowerCase())).length;
    if (filter === 'abgeschlossen') return all.filter(c => ['abgeschlossen','geschlossen','abgelehnt','archiviert'].includes(c.status.toLowerCase())).length;
    return 0;
  }

  getStatusClass(status: string): string {
    const s = status.toLowerCase();
    if (['offen','neu','eingegangen'].includes(s)) return 'offen';
    if (['in_bearbeitung','in_pruefung','zugewiesen'].includes(s)) return 'in-bearbeitung';
    if (['kritisch','eskaliert'].includes(s)) return 'kritisch';
    if (['abgeschlossen','geschlossen','abgelehnt','archiviert'].includes(s)) return 'abgeschlossen';
    return 'default';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      offen: 'Offen', neu: 'Neu', eingegangen: 'Eingegangen',
      in_bearbeitung: 'In Bearbeitung', in_pruefung: 'In Pruefung',
      zugewiesen: 'Zugewiesen', kritisch: 'Kritisch', eskaliert: 'Eskaliert',
      abgeschlossen: 'Abgeschlossen', geschlossen: 'Geschlossen',
      abgelehnt: 'Abgelehnt', archiviert: 'Archiviert',
    };
    return map[status.toLowerCase()] ?? status;
  }

  getSeverityIcon(severity: string | null): string {
    if (!severity) return '';
    const map: Record<string, string> = {
      kritisch: '🔴', hoch: '🟠', mittel: '🟡', niedrig: '🟢',
    };
    return map[severity.toLowerCase()] ?? '';
  }

  isUrgent(c: Case): boolean {
    const opened = new Date(c.opened_at);
    const diff = (Date.now() - opened.getTime()) / (1000 * 60 * 60 * 24);
    return diff > 7 && !['abgeschlossen','geschlossen','abgelehnt','archiviert'].includes(c.status.toLowerCase());
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('de-DE', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });
    } catch { return dateStr; }
  }

  trackById(_: number, c: Case): string { return c.id; }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadCases();
  }
}
