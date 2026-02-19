/**
 * HinSchG Case Detail Component
 * 
 * Displays full case details with:
 * - Case metadata and deadlines
 * - Status change workflow buttons
 * - Case history timeline
 * - Deadline tracking with visual indicators
 */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import {
  HinschgService,
  HinweisCase,
  FallStatus,
  STATUS_CONFIG,
  KATEGORIE_LABELS,
} from '../../../services/hinschg.service';

// Valid transitions for UI button rendering
const VALID_TRANSITIONS: Record<string, string[]> = {
  eingegangen: ['eingangsbestaetigung'],
  eingangsbestaetigung: ['in_pruefung'],
  in_pruefung: ['in_bearbeitung', 'abgeschlossen'],
  in_bearbeitung: ['folgemassnahme', 'rueckmeldung'],
  folgemassnahme: ['rueckmeldung', 'abgeschlossen'],
  rueckmeldung: ['abgeschlossen', 'in_bearbeitung'],
  abgeschlossen: ['archiviert', 'in_bearbeitung'],
};

@Component({
  selector: 'app-hinschg-case-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <main class="case-detail" *ngIf="caseData" role="main"
          [attr.aria-label]="'Fall ' + caseData.aktenzeichen">
      
      <!-- Header -->
      <header class="case-header">
        <div class="case-header-left">
          <a routerLink="/hinschg/cases" class="back-link"
             aria-label="Zurueck zur Falluebersicht">
            &larr; Zurueck
          </a>
          <h1>{{ caseData.aktenzeichen }}</h1>
          <span class="status-badge"
                [style.background-color]="getStatusColor(caseData.status)">
            {{ getStatusLabel(caseData.status) }}
          </span>
          <span class="priority-badge"
                [class]="'priority--' + caseData.prioritaet">
            {{ caseData.prioritaet | titlecase }}
          </span>
        </div>
      </header>

      <!-- Deadline Warnings -->
      <div *ngFor="let f of caseData.fristen"
           class="frist-card"
           [class.frist-overdue]="!f.erledigt && isOverdue(f.frist_datum)"
           [class.frist-soon]="!f.erledigt && isSoon(f.frist_datum)"
           [class.frist-done]="f.erledigt"
           role="status">
        <div class="frist-type">{{ getFristLabel(f.frist_typ) }}</div>
        <div class="frist-date">
          {{ f.frist_datum | date:'dd.MM.yyyy HH:mm' }}
          <span *ngIf="f.erledigt" class="frist-check" aria-label="Erledigt">&#10003;</span>
          <span *ngIf="!f.erledigt && isOverdue(f.frist_datum)" class="frist-warn"
                aria-label="Ueberfaellig">&#9888; Ueberfaellig!</span>
        </div>
      </div>

      <!-- Case Info Grid -->
      <section class="info-grid" aria-label="Falldetails">
        <div class="info-item">
          <label>Kategorie</label>
          <span>{{ getKategorieLabel(caseData.kategorie) }}</span>
        </div>
        <div class="info-item">
          <label>Meldekanal</label>
          <span>{{ caseData.meldekanal | titlecase }}</span>
        </div>
        <div class="info-item">
          <label>Eingangsdatum</label>
          <span>{{ caseData.eingangsdatum | date:'dd.MM.yyyy HH:mm' }}</span>
        </div>
        <div class="info-item">
          <label>Stichhaltig</label>
          <span *ngIf="caseData.stichhaltig === null">Noch nicht geprueft</span>
          <span *ngIf="caseData.stichhaltig === true" class="text-success">Ja</span>
          <span *ngIf="caseData.stichhaltig === false" class="text-danger">Nein</span>
        </div>
        <div class="info-item" *ngIf="caseData.folgemassnahme_beschreibung">
          <label>Folgemassnahmen</label>
          <span>{{ caseData.folgemassnahme_beschreibung }}</span>
        </div>
        <div class="info-item" *ngIf="caseData.begruendung">
          <label>Begruendung</label>
          <span>{{ caseData.begruendung }}</span>
        </div>
      </section>

      <!-- Status Actions -->
      <section class="actions" aria-label="Statusaenderung"
               *ngIf="getNextStatuses().length > 0">
        <h2>Naechster Schritt</h2>
        <div class="action-buttons">
          <button *ngFor="let next of getNextStatuses()"
                  class="btn btn-action"
                  [style.border-color]="getStatusColor(next)"
                  (click)="openStatusDialog(next)"
                  [attr.aria-label]="'Status aendern zu: ' + getStatusLabel(next)">
            &rarr; {{ getStatusLabel(next) }}
          </button>
        </div>
        
        <!-- Status Change Dialog -->
        <div *ngIf="showStatusDialog" class="dialog-overlay" role="dialog"
             aria-label="Status aendern">
          <div class="dialog">
            <h3>Status aendern: {{ getStatusLabel(pendingStatus!) }}</h3>
            <div class="form-group">
              <label for="kommentar">Kommentar</label>
              <textarea id="kommentar" [(ngModel)]="kommentar"
                        rows="3" class="form-control"
                        placeholder="Optionaler Kommentar..."></textarea>
            </div>
            <div class="form-group" *ngIf="pendingStatus === 'abgeschlossen'">
              <label for="begruendung">Begruendung (Pflicht bei Abschluss)</label>
              <textarea id="begruendung" [(ngModel)]="begruendung"
                        rows="3" class="form-control" required
                        placeholder="Begruendung fuer den Abschluss..."></textarea>
            </div>
            <div class="dialog-actions">
              <button class="btn btn-secondary" (click)="closeStatusDialog()">
                Abbrechen
              </button>
              <button class="btn btn-primary" (click)="confirmStatusChange()"
                      [disabled]="pendingStatus === 'abgeschlossen' && !begruendung">
                Bestaetigen
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Case History Timeline -->
      <section class="history" aria-label="Fallverlauf">
        <h2>Verlauf</h2>
        <ol class="timeline">
          <li *ngFor="let h of caseData.history" class="timeline-item">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
              <div class="timeline-header">
                <span class="timeline-action">{{ h.aktion }}</span>
                <time class="timeline-date">
                  {{ h.created_at | date:'dd.MM.yyyy HH:mm' }}
                </time>
              </div>
              <div class="timeline-body" *ngIf="h.alter_status || h.neuer_status">
                <span *ngIf="h.alter_status" class="status-badge-sm"
                      [style.background-color]="getStatusColor(h.alter_status)">
                  {{ getStatusLabel(h.alter_status) }}
                </span>
                <span *ngIf="h.alter_status"> &rarr; </span>
                <span class="status-badge-sm"
                      [style.background-color]="getStatusColor(h.neuer_status)">
                  {{ getStatusLabel(h.neuer_status) }}
                </span>
              </div>
              <p *ngIf="h.kommentar" class="timeline-comment">{{ h.kommentar }}</p>
            </div>
          </li>
        </ol>
      </section>
    </main>

    <div *ngIf="!caseData && !loading" class="empty-state">
      <p>Fall nicht gefunden.</p>
    </div>
    <div *ngIf="loading" class="loading" role="status" aria-label="Laden...">
      Laden...
    </div>
  `,
  styles: [`
    :host { display: block; padding: 1.5rem; }
    .case-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
    .case-header h1 { font-size: 1.5rem; margin: 0.5rem 0; }
    .back-link { color: #6b7280; text-decoration: none; font-size: 0.875rem; }
    .back-link:hover { color: #374151; }
    .status-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; color: #fff; font-size: 0.75rem; font-weight: 600; margin-right: 0.5rem; }
    .status-badge-sm { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 9999px; color: #fff; font-size: 0.625rem; }
    .priority--kritisch { color: #dc2626; font-weight: 700; }
    .priority--hoch { color: #ea580c; }

    .frist-card { display: flex; justify-content: space-between; padding: 0.75rem 1rem; border-radius: 0.5rem; margin-bottom: 0.5rem; border: 1px solid #e5e7eb; background: #fff; }
    .frist-overdue { background: #fef2f2; border-color: #fca5a5; }
    .frist-soon { background: #fffbeb; border-color: #fcd34d; }
    .frist-done { background: #f0fdf4; border-color: #86efac; opacity: 0.7; }
    .frist-check { color: #16a34a; font-weight: 700; }
    .frist-warn { color: #dc2626; font-weight: 700; }
    .frist-type { font-weight: 600; }

    .info-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; margin: 1.5rem 0; background: #fff; padding: 1.5rem; border-radius: 0.5rem; border: 1px solid #e5e7eb; }
    .info-item label { display: block; font-size: 0.75rem; color: #6b7280; text-transform: uppercase; margin-bottom: 0.25rem; }
    .info-item span { font-weight: 500; }
    .text-success { color: #16a34a; }
    .text-danger { color: #dc2626; }

    .actions { margin: 1.5rem 0; }
    .action-buttons { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .btn { padding: 0.5rem 1rem; border-radius: 0.375rem; font-size: 0.875rem; cursor: pointer; border: 1px solid #d1d5db; background: #fff; }
    .btn:hover { background: #f9fafb; }
    .btn:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
    .btn-action { border-width: 2px; font-weight: 600; }
    .btn-primary { background: #2563eb; color: #fff; border-color: #2563eb; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-secondary { background: #f3f4f6; }

    .dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 50; }
    .dialog { background: #fff; border-radius: 0.75rem; padding: 2rem; max-width: 500px; width: 90%; }
    .dialog h3 { margin-top: 0; }
    .form-group { margin: 1rem 0; }
    .form-group label { display: block; font-weight: 600; margin-bottom: 0.5rem; }
    .form-control { width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 0.875rem; }
    .form-control:focus { outline: 2px solid #2563eb; border-color: #2563eb; }
    .dialog-actions { display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.5rem; }

    .timeline { list-style: none; padding: 0; margin: 0; }
    .timeline-item { display: flex; gap: 1rem; padding-bottom: 1.5rem; position: relative; }
    .timeline-item::before { content: ''; position: absolute; left: 7px; top: 20px; bottom: 0; width: 2px; background: #e5e7eb; }
    .timeline-item:last-child::before { display: none; }
    .timeline-marker { width: 16px; height: 16px; border-radius: 50%; background: #3b82f6; flex-shrink: 0; margin-top: 4px; }
    .timeline-header { display: flex; justify-content: space-between; }
    .timeline-action { font-weight: 600; font-size: 0.875rem; text-transform: capitalize; }
    .timeline-date { font-size: 0.75rem; color: #6b7280; }
    .timeline-comment { font-size: 0.875rem; color: #4b5563; margin: 0.5rem 0 0; }

    h2 { font-size: 1.25rem; font-weight: 600; margin: 2rem 0 1rem; }
    .loading { text-align: center; padding: 3rem; color: #6b7280; }
    .empty-state { text-align: center; padding: 3rem; color: #9ca3af; }

    @media (max-width: 768px) {
      .info-grid { grid-template-columns: 1fr; }
      .action-buttons { flex-direction: column; }
    }
  `],
})
export class HinschgCaseDetailComponent implements OnInit {
  caseData: HinweisCase | null = null;
  loading = true;
  
  showStatusDialog = false;
  pendingStatus: FallStatus | null = null;
  kommentar = '';
  begruendung = '';

  constructor(
    private route: ActivatedRoute,
    private hinschgService: HinschgService,
  ) {}

  ngOnInit(): void {
    const caseId = this.route.snapshot.paramMap.get('id');
    if (caseId) {
      this.hinschgService.getCase(caseId).subscribe({
        next: (data) => { this.caseData = data; this.loading = false; },
        error: () => { this.loading = false; },
      });
    }
  }

  getStatusLabel(status: string): string {
    return this.hinschgService.getStatusLabel(status as FallStatus);
  }

  getStatusColor(status: string): string {
    return this.hinschgService.getStatusColor(status as FallStatus);
  }

  getKategorieLabel(kategorie: string): string {
    return this.hinschgService.getKategorieLabel(kategorie as any);
  }

  getFristLabel(typ: string): string {
    const labels: Record<string, string> = {
      eingangsbestaetigung_7t: 'Eingangsbestaetigung (7 Tage, §8)',
      rueckmeldung_3m: 'Rueckmeldung (3 Monate, §8)',
      archivierung_3j: 'Archivierung (3 Jahre, §11)',
      loeschung: 'Loeschung',
    };
    return labels[typ] || typ;
  }

  isOverdue(datum: string): boolean {
    return new Date(datum) < new Date();
  }

  isSoon(datum: string): boolean {
    const diff = new Date(datum).getTime() - Date.now();
    const days = diff / (1000 * 60 * 60 * 24);
    return days > 0 && days <= 3;
  }

  getNextStatuses(): FallStatus[] {
    if (!this.caseData) return [];
    return (VALID_TRANSITIONS[this.caseData.status] || []) as FallStatus[];
  }

  openStatusDialog(status: FallStatus): void {
    this.pendingStatus = status;
    this.kommentar = '';
    this.begruendung = '';
    this.showStatusDialog = true;
  }

  closeStatusDialog(): void {
    this.showStatusDialog = false;
    this.pendingStatus = null;
  }

  confirmStatusChange(): void {
    if (!this.caseData || !this.pendingStatus) return;

    this.hinschgService.changeStatus(this.caseData.id, {
      status: this.pendingStatus,
      kommentar: this.kommentar,
      begruendung: this.begruendung,
    }).subscribe({
      next: (updated) => {
        this.caseData = { ...this.caseData!, ...updated };
        this.closeStatusDialog();
        // Reload full case to get updated history and fristen
        this.hinschgService.getCase(this.caseData!.id).subscribe({
          next: (full) => this.caseData = full,
        });
      },
      error: (err) => console.error('Status change failed:', err),
    });
  }
}
