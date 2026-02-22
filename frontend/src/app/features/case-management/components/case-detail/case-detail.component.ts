/**
 * aitema|Hinweis - Case Detail Component
 * D3: Eingangsbestaetigung-Button, Abschluss-Rueckmeldung-Button, Fristenstatus
 * D4: An Ombudsperson weiterleiten, Ombudsperson-Empfehlung anzeigen
 * UI-Overhaul: aitema Design-System 2026
 */
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { KeycloakAuthService } from '../../../../core/services/keycloak-auth.service';
import { DeadlineBadgeComponent } from '../../../../shared/components/deadline-badge/deadline-badge.component';
import type { DeadlineStatusData } from '../../../../shared/components/deadline-badge/deadline-badge.component';

export interface CaseDetail {
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
  ombudsperson_reviewed_at: string | null;
  deadline_status: DeadlineStatusData;
}

@Component({
  selector: 'hw-case-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, DeadlineBadgeComponent],
  template: `
    <div class="case-detail-wrapper" role="main">

      <a routerLink="/faelle" class="back-link">
        &#8592; Zurück zur Übersicht
      </a>

      @if (loading()) {
        <div class="glass-card loading-card">
          <div class="spinner-ring"></div>
          <p class="loading-text">Falldetails werden geladen...</p>
        </div>
      } @else if (caseData()) {
        <div class="case-header">
          <div class="case-header__main">
            <div class="case-header__sup">
              <span class="case-header__id">{{ caseData()!.case_number }}</span>
              <span class="status-badge" [class]="'status-badge--' + caseData()!.status">
                {{ caseData()!.status | titlecase }}
              </span>
            </div>
            <h1 class="case-header__title">{{ caseData()!.titel }}</h1>
            <p class="case-header__meta">
              Geöffnet: {{ caseData()!.opened_at | date:'dd.MM.yyyy HH:mm' }}
              <span aria-hidden="true">&bull;</span>
              {{ caseData()!.bearbeitungsdauer_tage }} Tage in Bearbeitung
            </p>
          </div>
          @if (caseData()!.deadline_status) {
            <div class="case-header__aside">
              <hw-deadline-badge
                [status]="caseData()!.deadline_status.status"
                [label]="caseData()!.deadline_status.label"
                [deadlineData]="caseData()!.deadline_status"
              ></hw-deadline-badge>
            </div>
          }
        </div>

        <div class="content-grid">
          <div class="content-grid__main">
            <!-- Fristen -->
            <div class="glass-card">
              <h2 class="card-title">HinSchG §17 Fristen</h2>
              <div class="fristen-grid">
                <!-- Eingangsbestaetigung -->
                <div class="frist-card" [class.frist-card--done]="caseData()!.acknowledged_at">
                  <div class="frist-card__header">
                    <span class="frist-card__title">Eingangsbestätigung</span>
                    <span class="frist-card__tag" [class.frist-card__tag--done]="caseData()!.acknowledged_at">
                      {{ caseData()!.acknowledged_at ? 'Erledigt' : 'Ausstehend' }}
                    </span>
                  </div>
                  <p class="frist-card__desc">§17 Abs. 1: Innerhalb von 7 Tagen</p>
                  @if (caseData()!.acknowledged_at) {
                    <p class="frist-card__date">
                      Versendet: {{ caseData()!.acknowledged_at | date:'dd.MM.yyyy HH:mm' }}
                    </p>
                  } @else {
                    <p class="frist-card__date">
                      Frist: {{ caseData()!.deadline_status.ack_deadline | date:'dd.MM.yyyy' }}
                    </p>
                    @if (canAcknowledge()) {
                      <button (click)="acknowledge()" [disabled]="acknowledgeLoading()" class="btn-aitema btn-aitema--emerald btn-full mt-3">
                        @if (acknowledgeLoading()) {
                          <span class="spinner-sm"></span> Bestätigung...
                        } @else {
                          Eingang bestätigen
                        }
                      </button>
                    }
                  }
                </div>
                <!-- Abschluss-Rueckmeldung -->
                <div class="frist-card" [class.frist-card--done]="caseData()!.resolved_at">
                  <div class="frist-card__header">
                    <span class="frist-card__title">Abschluss-Rückmeldung</span>
                     <span class="frist-card__tag" [class.frist-card__tag--done]="caseData()!.resolved_at">
                      {{ caseData()!.resolved_at ? 'Erledigt' : 'Ausstehend' }}
                    </span>
                  </div>
                  <p class="frist-card__desc">§17 Abs. 2: Innerhalb von 3 Monaten</p>
                  @if (caseData()!.resolved_at) {
                    <p class="frist-card__date">
                      Versendet: {{ caseData()!.resolved_at | date:'dd.MM.yyyy HH:mm' }}
                    </p>
                  } @else {
                    <p class="frist-card__date">
                      Frist: {{ caseData()!.deadline_status.resolve_deadline | date:'dd.MM.yyyy' }}
                    </p>
                    @if (caseData()!.acknowledged_at && canAcknowledge()) {
                      <button (click)="resolve()" [disabled]="resolveLoading()" class="btn-aitema btn-aitema--primary btn-full mt-3">
                        @if (resolveLoading()) {
                           <span class="spinner-sm"></span> Abschluss...
                        } @else {
                          Abschluss melden
                        }
                      </button>
                    }
                  }
                </div>
              </div>
            </div>

            <!-- Ombudsperson -->
            <div class="glass-card">
              <h2 class="card-title">Ombudsperson-Workflow</h2>
               @if (caseData()!.forwarded_to_ombudsperson_at) {
                <div class="status-box status-box--forwarded">
                  <p>An Ombudsperson weitergeleitet am {{ caseData()!.forwarded_to_ombudsperson_at | date:'dd.MM.yyyy' }}</p>
                </div>
                @if (caseData()!.ombudsperson_recommendation) {
                   <div class="status-box" [class]="'status-box--' + caseData()!.ombudsperson_recommendation">
                      <strong class="status-box__title">Empfehlung der Ombudsperson:</strong>
                      <span>{{ recommendationLabel(caseData()!.ombudsperson_recommendation!) }}</span>
                      @if(caseData()!.ombudsperson_reviewed_at) {
                        <small>(am {{ caseData()!.ombudsperson_reviewed_at | date:'dd.MM.yyyy' }})</small>
                      }
                   </div>
                } @else {
                  <div class="status-box status-box--pending">
                    <p>Empfehlung der Ombudsperson ausstehend...</p>
                  </div>
                }
              } @else {
                <div class="status-box">
                  <p>Dieser Fall wurde noch nicht an die Ombudsperson weitergeleitet.</p>
                  @if (canForwardToOmbudsperson()) {
                    <button (click)="forwardToOmbudsperson()" [disabled]="forwardLoading()" class="btn-aitema btn-aitema--primary mt-3">
                       @if (forwardLoading()) {
                        <span class="spinner-sm"></span> Wird geleitet...
                      } @else {
                        An Ombudsperson weiterleiten
                      }
                    </button>
                  }
                </div>
              }
            </div>
          </div>

          <aside class="content-grid__sidebar">
            <div class="glass-card">
              <h2 class="card-title">Stammdaten</h2>
              <ul class="stammdaten-list">
                <li><span>Status</span> <strong>{{ caseData()?.status | titlecase }}</strong></li>
                <li><span>Schweregrad</span> <strong>{{ caseData()?.schweregrad | titlecase }}</strong></li>
                <li><span>Zuständig</span> <strong>{{ caseData()?.assignee_id || 'N/A' }}</strong></li>
                <li><span>Letzte Aktivität</span> <strong>{{ caseData()?.updated_at | date:'dd.MM.yyyy' }}</strong></li>
              </ul>
            </div>
             @if (actionMessage()) {
              <div class="action-feedback" [class.action-feedback--success]="actionSuccess()" [class.action-feedback--error]="!actionSuccess()">
                {{ actionMessage() }}
              </div>
            }
          </aside>
        </div>
      } @else {
        <div class="glass-card empty-state-card">
          <p class="empty-state-text">Fall nicht gefunden.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      background-color: #f8fafc;
      min-height: 100vh;
    }

    .case-detail-wrapper {
      max-width: 1280px;
      margin: 0 auto;
      padding: 1.5rem;
      font-family: "Inter", system-ui, sans-serif;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: #64748b;
      text-decoration: none;
      margin-bottom: 1.5rem;
      transition: color 0.2s;
    }
    .back-link:hover {
      color: #0f172a;
    }

    .case-header {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
    }
    @media (min-width: 768px) {
      .case-header {
        flex-direction: row;
        align-items: flex-start;
      }
    }

    .case-header__main { flex: 1; }
    .case-header__sup { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
    .case-header__id { font-family: monospace; font-size: 0.8125rem; color: #64748b; background: #f1f5f9; padding: 0.2rem 0.5rem; border-radius: 0.25rem; }
    .case-header__title { font-size: 1.5rem; font-weight: 700; color: #1e293b; margin: 0; }
    .case-header__meta { font-size: 0.8125rem; color: #64748b; margin: 0.25rem 0 0; }
    .case-header__meta span { margin: 0 0.5rem; }
    .case-header__aside { margin-top: 0.5rem; }

    .content-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
    @media (min-width: 1024px) {
      .content-grid {
        grid-template-columns: 1fr 320px;
      }
    }

    .glass-card {
      background: rgba(255, 255, 255, 0.97);
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .loading-card, .empty-state-card { text-align: center; padding: 3rem 1.5rem; }
    .spinner-ring {
      width: 2.5rem; height: 2.5rem;
      border: 3px solid #e2e8f0;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.9s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading-text, .empty-state-text { color: #64748b; font-size: 0.9375rem; font-weight: 500; }

    .card-title {
      font-size: 1rem;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0 0 1rem 0;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 0.75rem;
    }

    .fristen-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
    }
    @media (min-width: 640px) {
      .fristen-grid { grid-template-columns: 1fr 1fr; }
    }
    .frist-card {
      background: #fefce8;
      border: 1px solid #fde047;
      border-radius: 0.75rem;
      padding: 1rem;
    }
    .frist-card--done {
      background: #f0fdf4;
      border-color: #bbf7d0;
    }
    .frist-card__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .frist-card__title { font-size: 0.875rem; font-weight: 600; color: #1e293b; }
    .frist-card__tag {
      font-size: 0.75rem; font-weight: 700;
      background: #fef9c3; color: #854d0e;
      padding: 0.2rem 0.5rem; border-radius: 99px;
    }
    .frist-card__tag--done {
      background: #dcfce7; color: #166534;
    }
    .frist-card__desc { font-size: 0.75rem; color: #64748b; margin: 0 0 0.5rem; }
    .frist-card__date { font-size: 0.75rem; font-weight: 500; color: #475569; margin: 0; }
    .frist-card--done .frist-card__date { color: #16a34a; }

    .status-box {
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      padding: 1rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      color: #475569;
    }
    .status-box--forwarded { background-color: #f5f3ff; border-color: #e9d5ff; color: #581c87; }
    .status-box--pending { background-color: #fffbeb; border-color: #fde68a; color: #78350f; }
    .status-box--pursue { background-color: #eff6ff; border-color: #bfdbfe; color: #1e40af; }
    .status-box--close { background-color: #f8fafc; border-color: #e2e8f0; color: #334155; }
    .status-box--escalate { background-color: #fef2f2; border-color: #fecaca; color: #991b1b; }
    .status-box__title { font-weight: 700; display: block; margin-bottom: 0.25rem; }
    .status-box p { margin: 0; }
    .status-box small { display: block; margin-top: 0.25rem; opacity: 0.8; }

    .stammdaten-list {
      list-style: none;
      padding: 0;
      margin: 0;
      font-size: 0.875rem;
    }
    .stammdaten-list li {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .stammdaten-list li:last-child { border: none; }
    .stammdaten-list li span { color: #64748b; }
    .stammdaten-list li strong { color: #1e293b; }

    .action-feedback {
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.8125rem;
      font-weight: 600;
      margin-top: 1.5rem;
    }
    .action-feedback--success { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
    .action-feedback--error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }

    /* SHARED BADGE & BUTTONS */
    .status-badge {
      display: inline-flex; align-items: center; padding: 0.25rem 0.75rem;
      border-radius: 9999px; font-size: 0.75rem; font-weight: 700;
    }
    .status-badge--offen { background: #e2e8f0; color: #475569; }
    .status-badge--in_pruefung { background: #fef3c7; color: #92400e; }
    .status-badge--in_bearbeitung { background: #dbeafe; color: #1e40af; }
    .status-badge--abgeschlossen { background: #f1f5f9; color: #475569; }

    .btn-aitema {
      display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
      padding: 0.5rem 1rem; border: 1.5px solid transparent; border-radius: 0.5rem;
      font-family: inherit; font-size: 0.875rem; font-weight: 600;
      cursor: pointer; transition: all 0.2s ease;
    }
    .btn-aitema:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-full { width: 100%; }
    .mt-3 { margin-top: 0.75rem; }
    .btn-aitema--primary { background: #3b82f6; color: #fff; }
    .btn-aitema--primary:hover:not(:disabled) { background: #2563eb; }
    .btn-aitema--emerald { background: #10b981; color: #fff; }
    .btn-aitema--emerald:hover:not(:disabled) { background: #059669; }

    .spinner-sm {
      display: inline-block; width: 0.875rem; height: 0.875rem;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
  `]
})
export class CaseDetailComponent implements OnInit {
  caseData = signal<CaseDetail | null>(null);
  loading = signal(true);
  acknowledgeLoading = signal(false);
  resolveLoading = signal(false);
  forwardLoading = signal(false);
  actionMessage = signal('');
  actionSuccess = signal(true);

  private caseId = '';

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private keycloak: KeycloakAuthService,
  ) {}

  ngOnInit(): void {
    this.caseId = this.route.snapshot.paramMap.get('id') || '';
    this.loadCase();
  }

  loadCase(): void {
    this.loading.set(true);
    this.api.get<{ case: CaseDetail }>(`/cases/${this.caseId}`).subscribe({
      next: (resp) => {
        const c = (resp as any).case || resp;
        this.caseData.set(c);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  canAcknowledge(): boolean {
    const roles = this.keycloak.currentUser()?.roles || [];
    return roles.some(r =>
      ['hinweis-admin', 'hinweis-ombudsperson', 'hinweis-fallbearbeiter'].includes(r)
    );
  }

  canForwardToOmbudsperson(): boolean {
    const roles = this.keycloak.currentUser()?.roles || [];
    return roles.some(r =>
      ['hinweis-admin', 'hinweis-fallbearbeiter', 'hinweis-ombudsperson'].includes(r)
    );
  }

  acknowledge(): void {
    this.acknowledgeLoading.set(true);
    this.actionMessage.set('');
    this.api.post(`/cases/${this.caseId}/acknowledge`, {}).subscribe({
      next: () => {
        this.acknowledgeLoading.set(false);
        this.actionMessage.set('Eingangsbestätigung erfolgreich gesetzt.');
        this.actionSuccess.set(true);
        this.loadCase();
      },
      error: (err) => {
        this.acknowledgeLoading.set(false);
        this.actionMessage.set(err?.error?.error || 'Fehler beim Setzen der Eingangsbestätigung.');
        this.actionSuccess.set(false);
      },
    });
  }

  resolve(): void {
    this.resolveLoading.set(true);
    this.actionMessage.set('');
    this.api.post(`/cases/${this.caseId}/resolve`, {}).subscribe({
      next: () => {
        this.resolveLoading.set(false);
        this.actionMessage.set('Abschluss-Rückmeldung erfolgreich gesetzt.');
        this.actionSuccess.set(true);
        this.loadCase();
      },
      error: (err) => {
        this.resolveLoading.set(false);
        this.actionMessage.set(err?.error?.error || 'Fehler beim Setzen der Abschluss-Rückmeldung.');
        this.actionSuccess.set(false);
      },
    });
  }

  forwardToOmbudsperson(): void {
    this.forwardLoading.set(true);
    this.actionMessage.set('');
    this.api.post(`/cases/${this.caseId}/forward-to-ombudsperson`, {}).subscribe({
      next: () => {
        this.forwardLoading.set(false);
        this.actionMessage.set('Fall erfolgreich an Ombudsperson weitergeleitet.');
        this.actionSuccess.set(true);
        this.loadCase();
      },
      error: (err) => {
        this.forwardLoading.set(false);
        this.actionMessage.set(err?.error?.error || 'Fehler beim Weiterleiten.');
        this.actionSuccess.set(false);
      },
    });
  }

  recommendationLabel(r: string): string {
    const labels: Record<string, string> = {
      pursue: 'Fall weiterverfolgen',
      close: 'Fall schliessen',
      escalate: 'An externe Stelle eskalieren',
    };
    return labels[r] || r;
  }
}
