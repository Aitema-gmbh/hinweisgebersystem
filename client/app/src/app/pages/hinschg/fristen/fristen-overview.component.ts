/**
 * HinSchG Fristen Overview Component
 * 
 * Displays all deadlines across cases with:
 * - Overdue/upcoming/completed grouping
 * - Color-coded urgency indicators
 * - ARIA live region for deadline changes
 */
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { HinschgService, Frist } from '../../../services/hinschg.service';

@Component({
  selector: 'app-hinschg-fristen',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <main class="fristen-page" role="main" id="main-content">
      <h1>Fristenuebersicht</h1>
      
      <!-- Summary -->
      <div class="fristen-summary" role="status" aria-live="polite">
        <div class="summary-card summary-overdue" *ngIf="overdueFristen.length > 0">
          <span class="summary-icon" aria-hidden="true">&#9888;</span>
          <strong>{{ overdueFristen.length }}</strong> ueberfaellige Fristen
        </div>
        <div class="summary-card summary-upcoming" *ngIf="upcomingFristen.length > 0">
          <span class="summary-icon" aria-hidden="true">&#9200;</span>
          <strong>{{ upcomingFristen.length }}</strong> bald ablaufende Fristen
        </div>
        <div class="summary-card summary-ok" *ngIf="overdueFristen.length === 0">
          <span class="summary-icon" aria-hidden="true">&#10003;</span>
          Keine ueberfaelligen Fristen
        </div>
      </div>

      <!-- Overdue -->
      <section *ngIf="overdueFristen.length > 0" aria-label="Ueberfaellige Fristen">
        <h2 class="section-title section-title--danger">
          &#9888; Ueberfaellig ({{ overdueFristen.length }})
        </h2>
        <div class="frist-list">
          <div *ngFor="let f of overdueFristen" class="frist-item frist-item--overdue"
               role="alert">
            <div class="frist-main">
              <a [routerLink]="['/hinschg/cases', f.case_id]" class="frist-case">
                {{ f.aktenzeichen }}
              </a>
              <span class="frist-type">{{ getFristLabel(f.frist_typ) }}</span>
            </div>
            <div class="frist-meta">
              <time [attr.datetime]="f.frist_datum">
                {{ f.frist_datum | date:'dd.MM.yyyy HH:mm' }}
              </time>
              <span class="frist-days frist-days--overdue">
                {{ getDaysOverdue(f.frist_datum) }} Tage ueberfaellig
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- Upcoming (next 7 days) -->
      <section *ngIf="upcomingFristen.length > 0" aria-label="Bald ablaufende Fristen">
        <h2 class="section-title section-title--warning">
          &#9200; Bald ablaufend ({{ upcomingFristen.length }})
        </h2>
        <div class="frist-list">
          <div *ngFor="let f of upcomingFristen" class="frist-item frist-item--upcoming">
            <div class="frist-main">
              <a [routerLink]="['/hinschg/cases', f.case_id]" class="frist-case">
                {{ f.aktenzeichen }}
              </a>
              <span class="frist-type">{{ getFristLabel(f.frist_typ) }}</span>
            </div>
            <div class="frist-meta">
              <time [attr.datetime]="f.frist_datum">
                {{ f.frist_datum | date:'dd.MM.yyyy HH:mm' }}
              </time>
              <span class="frist-days frist-days--upcoming">
                noch {{ getDaysRemaining(f.frist_datum) }} Tage
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- Future -->
      <section *ngIf="futureFristen.length > 0" aria-label="Zukuenftige Fristen">
        <h2 class="section-title">
          Zukuenftige Fristen ({{ futureFristen.length }})
        </h2>
        <div class="frist-list">
          <div *ngFor="let f of futureFristen" class="frist-item">
            <div class="frist-main">
              <a [routerLink]="['/hinschg/cases', f.case_id]" class="frist-case">
                {{ f.aktenzeichen }}
              </a>
              <span class="frist-type">{{ getFristLabel(f.frist_typ) }}</span>
            </div>
            <div class="frist-meta">
              <time [attr.datetime]="f.frist_datum">
                {{ f.frist_datum | date:'dd.MM.yyyy HH:mm' }}
              </time>
              <span class="frist-days">
                noch {{ getDaysRemaining(f.frist_datum) }} Tage
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- Completed -->
      <section *ngIf="completedFristen.length > 0" aria-label="Erledigte Fristen">
        <h2 class="section-title section-title--success">
          &#10003; Erledigt ({{ completedFristen.length }})
        </h2>
        <details>
          <summary class="show-completed-btn">Erledigte Fristen anzeigen</summary>
          <div class="frist-list">
            <div *ngFor="let f of completedFristen" class="frist-item frist-item--done">
              <div class="frist-main">
                <a [routerLink]="['/hinschg/cases', f.case_id]" class="frist-case">
                  {{ f.aktenzeichen }}
                </a>
                <span class="frist-type">{{ getFristLabel(f.frist_typ) }}</span>
              </div>
              <div class="frist-meta">
                <time [attr.datetime]="f.frist_datum">
                  {{ f.frist_datum | date:'dd.MM.yyyy' }}
                </time>
                <span class="frist-done-badge">Erledigt</span>
              </div>
            </div>
          </div>
        </details>
      </section>

      <div *ngIf="loading" class="loading" role="status">Laden...</div>
    </main>
  `,
  styles: [`
    :host { display: block; padding: 1.5rem; }
    h1 { font-size: 1.5rem; margin-bottom: 1.5rem; }
    
    .fristen-summary { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 2rem; }
    .summary-card { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.25rem; border-radius: 0.5rem; font-size: 1rem; }
    .summary-overdue { background: #fef2f2; border: 1px solid #fca5a5; color: #991b1b; }
    .summary-upcoming { background: #fffbeb; border: 1px solid #fcd34d; color: #92400e; }
    .summary-ok { background: #f0fdf4; border: 1px solid #86efac; color: #166534; }
    .summary-icon { font-size: 1.25rem; }
    
    .section-title { font-size: 1.125rem; font-weight: 600; margin: 1.5rem 0 0.75rem; padding-bottom: 0.5rem; border-bottom: 2px solid #e5e7eb; }
    .section-title--danger { color: #991b1b; border-color: #fca5a5; }
    .section-title--warning { color: #92400e; border-color: #fcd34d; }
    .section-title--success { color: #166534; border-color: #86efac; }
    
    .frist-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .frist-item { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background: #fff; border: 1px solid #e5e7eb; border-radius: 0.5rem; }
    .frist-item--overdue { background: #fef2f2; border-color: #fca5a5; border-left: 4px solid #dc2626; }
    .frist-item--upcoming { background: #fffbeb; border-color: #fcd34d; border-left: 4px solid #f59e0b; }
    .frist-item--done { opacity: 0.7; }
    
    .frist-main { display: flex; flex-direction: column; gap: 0.25rem; }
    .frist-case { color: #2563eb; text-decoration: none; font-weight: 600; font-size: 0.875rem; }
    .frist-case:hover { text-decoration: underline; }
    .frist-case:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
    .frist-type { font-size: 0.75rem; color: #6b7280; }
    
    .frist-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 0.25rem; }
    .frist-days { font-size: 0.75rem; font-weight: 600; }
    .frist-days--overdue { color: #dc2626; }
    .frist-days--upcoming { color: #f59e0b; }
    .frist-done-badge { font-size: 0.75rem; color: #16a34a; font-weight: 600; }
    
    .show-completed-btn { cursor: pointer; font-size: 0.875rem; color: #6b7280; padding: 0.5rem 0; }
    .show-completed-btn:hover { color: #374151; }
    
    .loading { text-align: center; padding: 3rem; color: #6b7280; }
    
    @media (max-width: 768px) {
      .frist-item { flex-direction: column; align-items: flex-start; gap: 0.5rem; }
      .frist-meta { align-items: flex-start; }
    }
  `],
})
export class HinschgFristenComponent implements OnInit, OnDestroy {
  overdueFristen: any[] = [];
  upcomingFristen: any[] = [];
  futureFristen: any[] = [];
  completedFristen: any[] = [];
  loading = true;

  private destroy$ = new Subject<void>();

  constructor(private hinschgService: HinschgService) {}

  ngOnInit(): void {
    this.hinschgService.getFristen().pipe(takeUntil(this.destroy$)).subscribe({
      next: (fristen) => {
        this.categorizeFristen(fristen);
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  categorizeFristen(fristen: any[]): void {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    this.completedFristen = fristen.filter(f => f.erledigt);
    
    const pending = fristen.filter(f => !f.erledigt);
    this.overdueFristen = pending.filter(f => new Date(f.frist_datum) < now)
      .sort((a, b) => new Date(a.frist_datum).getTime() - new Date(b.frist_datum).getTime());
    
    this.upcomingFristen = pending.filter(f => {
      const d = new Date(f.frist_datum);
      return d >= now && d <= sevenDaysFromNow;
    }).sort((a, b) => new Date(a.frist_datum).getTime() - new Date(b.frist_datum).getTime());
    
    this.futureFristen = pending.filter(f => new Date(f.frist_datum) > sevenDaysFromNow)
      .sort((a, b) => new Date(a.frist_datum).getTime() - new Date(b.frist_datum).getTime());
  }

  getFristLabel(typ: string): string {
    const labels: Record<string, string> = {
      eingangsbestaetigung_7t: 'Eingangsbestaetigung (7 Tage, \u00a78)',
      rueckmeldung_3m: 'Rueckmeldung (3 Monate, \u00a78)',
      archivierung_3j: 'Archivierung (3 Jahre, \u00a711)',
      loeschung: 'Loeschung',
    };
    return labels[typ] || typ;
  }

  getDaysOverdue(datum: string): number {
    return Math.ceil((Date.now() - new Date(datum).getTime()) / (1000 * 60 * 60 * 24));
  }

  getDaysRemaining(datum: string): number {
    return Math.ceil((new Date(datum).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }
}
