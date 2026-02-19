/**
 * Ombudsperson Management Component (§15 HinSchG)
 * 
 * Manage internal and external Ombudspersonen for the Meldestelle.
 * Features:
 * - Add/edit/deactivate Ombudspersonen
 * - Role assignment (intern/extern)
 * - Qualification tracking
 * - Case load overview
 */
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { HinschgService } from '../../../services/hinschg.service';

interface Ombudsperson {
  id: string;
  name: string;
  email: string;
  telefon: string;
  typ: 'intern' | 'extern';
  qualifikation: string;
  aktiv: boolean;
  zugewiesene_faelle: number;
  max_faelle: number;
  created_at: string;
}

@Component({
  selector: 'app-hinschg-ombudsperson',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="ombudsperson-page" role="main" id="main-content">
      <header class="page-header">
        <h1>Ombudspersonen (§15 HinSchG)</h1>
        <button class="btn btn-primary" (click)="showAddDialog = true"
                aria-label="Neue Ombudsperson anlegen">
          + Ombudsperson hinzufuegen
        </button>
      </header>

      <p class="legal-hint">
        Gemaess §15 HinSchG muss die interne Meldestelle mit einer oder mehreren
        Personen besetzt werden, die ueber die erforderliche Fachkunde verfuegen.
      </p>

      <!-- Ombudsperson Cards -->
      <div class="ombudsperson-grid">
        <div *ngFor="let op of ombudspersonen"
             class="op-card"
             [class.op-card--inactive]="!op.aktiv"
             [class.op-card--overloaded]="op.zugewiesene_faelle >= op.max_faelle">
          <div class="op-header">
            <div>
              <h3>{{ op.name }}</h3>
              <span class="op-type" [class]="'op-type--' + op.typ">
                {{ op.typ === 'intern' ? 'Intern' : 'Extern' }}
              </span>
              <span *ngIf="!op.aktiv" class="op-inactive-badge">Inaktiv</span>
            </div>
          </div>
          <div class="op-details">
            <div class="op-detail">
              <label>E-Mail</label>
              <span>{{ op.email }}</span>
            </div>
            <div class="op-detail" *ngIf="op.telefon">
              <label>Telefon</label>
              <span>{{ op.telefon }}</span>
            </div>
            <div class="op-detail">
              <label>Qualifikation</label>
              <span>{{ op.qualifikation || 'Nicht angegeben' }}</span>
            </div>
            <div class="op-detail">
              <label>Faelle</label>
              <span [class.text-danger]="op.zugewiesene_faelle >= op.max_faelle">
                {{ op.zugewiesene_faelle }} / {{ op.max_faelle }}
              </span>
            </div>
          </div>
          <div class="op-actions">
            <button class="btn btn-sm" (click)="editOmbudsperson(op)"
                    aria-label="Bearbeiten">
              Bearbeiten
            </button>
            <button class="btn btn-sm"
                    (click)="toggleActive(op)"
                    [attr.aria-label]="op.aktiv ? 'Deaktivieren' : 'Aktivieren'">
              {{ op.aktiv ? 'Deaktivieren' : 'Aktivieren' }}
            </button>
          </div>
        </div>
      </div>

      <div *ngIf="ombudspersonen.length === 0 && !loading" class="empty-state">
        <p>Noch keine Ombudspersonen konfiguriert.</p>
        <p class="text-muted">Gemaess §15 HinSchG muss mindestens eine Ombudsperson benannt werden.</p>
      </div>

      <!-- Add/Edit Dialog -->
      <div *ngIf="showAddDialog" class="dialog-overlay" role="dialog"
           aria-label="Ombudsperson hinzufuegen">
        <div class="dialog">
          <h3>{{ editingOp ? 'Ombudsperson bearbeiten' : 'Neue Ombudsperson' }}</h3>
          <div class="form-group">
            <label for="op-name">Name *</label>
            <input id="op-name" type="text" [(ngModel)]="formData.name"
                   class="form-control" required>
          </div>
          <div class="form-group">
            <label for="op-email">E-Mail *</label>
            <input id="op-email" type="email" [(ngModel)]="formData.email"
                   class="form-control" required>
          </div>
          <div class="form-group">
            <label for="op-telefon">Telefon</label>
            <input id="op-telefon" type="tel" [(ngModel)]="formData.telefon"
                   class="form-control">
          </div>
          <div class="form-group">
            <label for="op-typ">Typ *</label>
            <select id="op-typ" [(ngModel)]="formData.typ" class="form-control">
              <option value="intern">Intern (§15 Abs. 1)</option>
              <option value="extern">Extern (§15 Abs. 2 - Dritte)</option>
            </select>
          </div>
          <div class="form-group">
            <label for="op-qualifikation">Qualifikation / Fachkunde (§15 Abs. 2)</label>
            <textarea id="op-qualifikation" [(ngModel)]="formData.qualifikation"
                      class="form-control" rows="2"
                      placeholder="z.B. Rechtsanwalt, Compliance-Beauftragter..."></textarea>
          </div>
          <div class="form-group">
            <label for="op-max">Max. gleichzeitige Faelle</label>
            <input id="op-max" type="number" [(ngModel)]="formData.max_faelle"
                   class="form-control" min="1" max="100">
          </div>
          <div class="dialog-actions">
            <button class="btn btn-secondary" (click)="closeDialog()">
              Abbrechen
            </button>
            <button class="btn btn-primary" (click)="saveOmbudsperson()"
                    [disabled]="!formData.name || !formData.email">
              {{ editingOp ? 'Speichern' : 'Hinzufuegen' }}
            </button>
          </div>
        </div>
      </div>

      <div *ngIf="loading" class="loading" role="status">Laden...</div>
    </main>
  `,
  styles: [`
    :host { display: block; padding: 1.5rem; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .page-header h1 { font-size: 1.5rem; margin: 0; }
    .legal-hint { font-size: 0.875rem; color: #6b7280; background: #f9fafb; padding: 0.75rem 1rem; border-radius: 0.5rem; border-left: 3px solid #3b82f6; margin-bottom: 1.5rem; }
    
    .ombudsperson-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem; }
    .op-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1.25rem; }
    .op-card--inactive { opacity: 0.6; border-style: dashed; }
    .op-card--overloaded { border-color: #fca5a5; background: #fef2f2; }
    .op-header { display: flex; justify-content: space-between; margin-bottom: 1rem; }
    .op-header h3 { font-size: 1.125rem; margin: 0; }
    .op-type { font-size: 0.75rem; padding: 0.125rem 0.5rem; border-radius: 9999px; font-weight: 600; }
    .op-type--intern { background: #dbeafe; color: #1e40af; }
    .op-type--extern { background: #fef3c7; color: #92400e; }
    .op-inactive-badge { font-size: 0.75rem; color: #9ca3af; margin-left: 0.5rem; }
    
    .op-details { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem; }
    .op-detail label { display: block; font-size: 0.625rem; color: #6b7280; text-transform: uppercase; }
    .op-detail span { font-size: 0.875rem; font-weight: 500; }
    .text-danger { color: #dc2626; }
    
    .op-actions { display: flex; gap: 0.5rem; }
    
    .btn { padding: 0.5rem 1rem; border-radius: 0.375rem; font-size: 0.875rem; cursor: pointer; border: 1px solid #d1d5db; background: #fff; min-height: 44px; }
    .btn:hover { background: #f9fafb; }
    .btn:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
    .btn-primary { background: #2563eb; color: #fff; border-color: #2563eb; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-secondary { background: #f3f4f6; }
    .btn-sm { padding: 0.375rem 0.75rem; font-size: 0.75rem; min-height: 36px; }
    
    .dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 50; }
    .dialog { background: #fff; border-radius: 0.75rem; padding: 2rem; max-width: 500px; width: 90%; }
    .dialog h3 { margin-top: 0; }
    .form-group { margin: 1rem 0; }
    .form-group label { display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.875rem; }
    .form-control { width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 0.875rem; min-height: 44px; box-sizing: border-box; }
    .form-control:focus { outline: 2px solid #2563eb; border-color: #2563eb; }
    .dialog-actions { display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.5rem; }
    
    .empty-state { text-align: center; padding: 3rem; color: #9ca3af; }
    .text-muted { color: #9ca3af; font-size: 0.875rem; }
    .loading { text-align: center; padding: 3rem; color: #6b7280; }
    
    @media (max-width: 768px) {
      .ombudsperson-grid { grid-template-columns: 1fr; }
      .op-details { grid-template-columns: 1fr; }
    }
  `],
})
export class HinschgOmbudspersonComponent implements OnInit, OnDestroy {
  ombudspersonen: Ombudsperson[] = [];
  loading = true;
  showAddDialog = false;
  editingOp: Ombudsperson | null = null;
  
  formData = {
    name: '',
    email: '',
    telefon: '',
    typ: 'intern' as 'intern' | 'extern',
    qualifikation: '',
    max_faelle: 20,
  };

  private destroy$ = new Subject<void>();

  constructor(private hinschgService: HinschgService) {}

  ngOnInit(): void {
    this.hinschgService.getOmbudspersonen()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => { this.ombudspersonen = data; this.loading = false; },
        error: () => { this.loading = false; },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  editOmbudsperson(op: Ombudsperson): void {
    this.editingOp = op;
    this.formData = {
      name: op.name,
      email: op.email,
      telefon: op.telefon,
      typ: op.typ,
      qualifikation: op.qualifikation,
      max_faelle: op.max_faelle,
    };
    this.showAddDialog = true;
  }

  closeDialog(): void {
    this.showAddDialog = false;
    this.editingOp = null;
    this.formData = { name: '', email: '', telefon: '', typ: 'intern', qualifikation: '', max_faelle: 20 };
  }

  saveOmbudsperson(): void {
    // In a real app, call the service
    console.log('Saving:', this.formData);
    this.closeDialog();
  }

  toggleActive(op: Ombudsperson): void {
    op.aktiv = !op.aktiv;
  }
}
