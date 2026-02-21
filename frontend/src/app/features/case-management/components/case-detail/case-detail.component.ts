/**
 * aitema|Hinweis - Case Detail Component
 * D3: Eingangsbestaetigung-Button, Abschluss-Rueckmeldung-Button, Fristenstatus
 * D4: An Ombudsperson weiterleiten, Ombudsperson-Empfehlung anzeigen
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
    <div role="main" class="p-6 max-w-4xl mx-auto">
      <!-- Zurueck-Link -->
      <a routerLink="/faelle" class="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-6">
        &larr; Zurueck zur Uebersicht
      </a>

      @if (loading()) {
        <div class="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <div class="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p class="text-sm text-slate-500">Fall wird geladen...</p>
        </div>
      } @else if (caseData()) {
        <!-- Header-Card -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
          <div class="flex items-start justify-between">
            <div>
              <div class="flex items-center gap-3 mb-2">
                <span class="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">
                  {{ caseData()!.case_number }}
                </span>
                <span class="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {{ caseData()!.status | titlecase }}
                </span>
              </div>
              <h1 class="text-xl font-bold text-slate-800">{{ caseData()!.titel }}</h1>
              <p class="text-sm text-slate-500 mt-1">
                Geoeffnet: {{ caseData()!.opened_at | date:'dd.MM.yyyy HH:mm' }}
                &bull; {{ caseData()!.bearbeitungsdauer_tage }} Tage in Bearbeitung
              </p>
            </div>

            <!-- D3: Fristenampel prominent -->
            @if (caseData()!.deadline_status) {
              <hw-deadline-badge
                [status]="caseData()!.deadline_status.status"
                [label]="caseData()!.deadline_status.label"
                [deadlineData]="caseData()!.deadline_status"
              ></hw-deadline-badge>
            }
          </div>
        </div>

        <!-- D3: HinSchG-Fristenampel Detail-Card -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
          <h2 class="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
            HinSchG §17 Fristen
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Eingangsbestaetigung -->
            <div class="rounded-lg p-4 border"
              [class]="caseData()!.acknowledged_at
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-amber-50 border-amber-200'"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-semibold text-slate-700">Eingangsbestaetigung</span>
                @if (caseData()!.acknowledged_at) {
                  <span class="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Erledigt</span>
                } @else {
                  <span class="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Ausstehend</span>
                }
              </div>
              <p class="text-xs text-slate-500 mb-1">HinSchG §17 Abs. 1: Innerhalb von 7 Tagen</p>
              @if (caseData()!.acknowledged_at) {
                <p class="text-xs text-emerald-700">
                  Versendet: {{ caseData()!.acknowledged_at | date:'dd.MM.yyyy HH:mm' }}
                </p>
              } @else {
                <p class="text-xs text-slate-500">
                  Frist: {{ caseData()!.deadline_status?.ack_deadline | date:'dd.MM.yyyy' }}
                </p>
                <!-- Eingangsbestaetigung-Button -->
                @if (canAcknowledge()) {
                  <button
                    (click)="acknowledge()"
                    [disabled]="acknowledgeLoading()"
                    class="mt-3 w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    @if (acknowledgeLoading()) {
                      <span>Wird versendet...</span>
                    } @else {
                      <span>Eingangsbestaetigung senden</span>
                    }
                  </button>
                }
              }
            </div>

            <!-- Abschluss-Rueckmeldung -->
            <div class="rounded-lg p-4 border"
              [class]="caseData()!.resolved_at
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-slate-50 border-slate-200'"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-semibold text-slate-700">Abschluss-Rueckmeldung</span>
                @if (caseData()!.resolved_at) {
                  <span class="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Erledigt</span>
                } @else {
                  <span class="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Ausstehend</span>
                }
              </div>
              <p class="text-xs text-slate-500 mb-1">HinSchG §17 Abs. 2: Innerhalb von 3 Monaten</p>
              @if (caseData()!.resolved_at) {
                <p class="text-xs text-emerald-700">
                  Versendet: {{ caseData()!.resolved_at | date:'dd.MM.yyyy HH:mm' }}
                </p>
              } @else {
                <p class="text-xs text-slate-500">
                  Frist: {{ caseData()!.deadline_status?.resolve_deadline | date:'dd.MM.yyyy' }}
                </p>
                @if (caseData()!.acknowledged_at && canAcknowledge()) {
                  <button
                    (click)="resolve()"
                    [disabled]="resolveLoading()"
                    class="mt-3 w-full px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    @if (resolveLoading()) {
                      <span>Wird versendet...</span>
                    } @else {
                      <span>Abschluss-Rueckmeldung senden</span>
                    }
                  </button>
                }
              }
            </div>
          </div>

          <!-- Erfolgs-/Fehler-Meldung -->
          @if (actionMessage()) {
            <div class="mt-3 p-3 rounded-lg text-xs font-medium"
              [class]="actionSuccess()
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'"
            >
              {{ actionMessage() }}
            </div>
          }
        </div>

        <!-- D4: Ombudsperson-Card -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
          <h2 class="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
            Ombudsperson-Workflow
          </h2>

          @if (caseData()!.forwarded_to_ombudsperson_at) {
            <!-- Weitergeleitet -->
            <div class="flex items-start gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg mb-3">
              <span class="w-3 h-3 mt-0.5 rounded-full bg-purple-500 flex-shrink-0"></span>
              <div>
                <p class="text-xs font-semibold text-purple-800">An Ombudsperson weitergeleitet</p>
                <p class="text-xs text-purple-600">
                  {{ caseData()!.forwarded_to_ombudsperson_at | date:'dd.MM.yyyy HH:mm' }}
                </p>
              </div>
            </div>

            <!-- Empfehlung der Ombudsperson -->
            @if (caseData()!.ombudsperson_recommendation) {
              <div class="p-3 rounded-lg border"
                [class]="recommendationBg(caseData()!.ombudsperson_recommendation!)"
              >
                <p class="text-xs font-semibold mb-1">Empfehlung der Ombudsperson:</p>
                <p class="text-sm font-bold">
                  {{ recommendationLabel(caseData()!.ombudsperson_recommendation!) }}
                </p>
                @if (caseData()!.ombudsperson_reviewed_at) {
                  <p class="text-xs text-slate-500 mt-1">
                    Abgegeben: {{ caseData()!.ombudsperson_reviewed_at | date:'dd.MM.yyyy HH:mm' }}
                  </p>
                }
              </div>
            } @else {
              <p class="text-xs text-purple-600">Empfehlung der Ombudsperson ausstehend...</p>
            }
          } @else {
            <!-- Noch nicht weitergeleitet -->
            <p class="text-xs text-slate-500 mb-3">
              Dieser Fall wurde noch nicht an die Ombudsperson weitergeleitet.
            </p>
            @if (canForwardToOmbudsperson()) {
              <button
                (click)="forwardToOmbudsperson()"
                [disabled]="forwardLoading()"
                class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                @if (forwardLoading()) {
                  <span>Wird weitergeleitet...</span>
                } @else {
                  <span>An Ombudsperson weiterleiten</span>
                }
              </button>
            }
          }
        </div>
      } @else {
        <div class="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <p class="text-slate-500">Fall nicht gefunden.</p>
        </div>
      }
    </div>
  `,
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
        // API kann direkt CaseDetail oder {case: CaseDetail} liefern
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
        this.actionMessage.set('Eingangsbestaetigung erfolgreich gesetzt.');
        this.actionSuccess.set(true);
        this.loadCase();
      },
      error: (err) => {
        this.acknowledgeLoading.set(false);
        this.actionMessage.set(err?.error?.error || 'Fehler beim Setzen der Eingangsbestaetigung.');
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
        this.actionMessage.set('Abschluss-Rueckmeldung erfolgreich gesetzt.');
        this.actionSuccess.set(true);
        this.loadCase();
      },
      error: (err) => {
        this.resolveLoading.set(false);
        this.actionMessage.set(err?.error?.error || 'Fehler beim Setzen der Abschluss-Rueckmeldung.');
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

  recommendationBg(r: string): string {
    return {
      pursue: 'bg-blue-50 border border-blue-200 text-blue-800',
      close: 'bg-slate-50 border border-slate-200 text-slate-700',
      escalate: 'bg-red-50 border border-red-200 text-red-800',
    }[r] || 'bg-slate-50 border border-slate-200';
  }
}
