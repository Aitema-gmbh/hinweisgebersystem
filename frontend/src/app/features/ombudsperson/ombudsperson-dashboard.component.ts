/**
 * aitema|Hinweis - D4: Ombudsperson-Dashboard
 * Zeigt weitergeleitete Faelle OHNE Identitaetsdaten des Melders.
 * Empfehlung-Workflow: pursue | close | escalate
 *
 * Zugriffsschutz: Keycloak-Rolle 'hinweis-ombudsperson'
 */
import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface OmbudspersonCase {
  id: string;
  case_number: string;
  titel: string;
  status: string;
  schweregrad: string | null;
  opened_at: string;
  forwarded_to_ombudsperson_at: string;
  ombudsperson_recommendation: string | null;
  ombudsperson_reviewed_at: string | null;
  hinweis: {
    reference_code: string;
    titel: string;
    kategorie: string | null;
    prioritaet: string | null;
    betroffene_abteilung: string | null;
    eingegangen_am: string | null;
  } | null;
}

@Component({
  selector: 'hw-ombudsperson-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div role="main" class="p-6 max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-6">
        <div class="flex items-center gap-3 mb-2">
          <span class="w-8 h-8 bg-purple-100 text-purple-700 rounded-lg flex items-center justify-center text-sm font-bold">O</span>
          <h1 class="text-2xl font-bold text-slate-800">Ombudsperson-Portal</h1>
        </div>
        <p class="text-sm text-slate-500 ml-11">
          Weitergeleitete Faelle zur vertraulichen Pruefung.
          Identitaetsdaten der Melder sind aus Datenschutzgruenden nicht sichtbar.
        </p>
      </div>

      <!-- Info-Banner: Datenschutz -->
      <div class="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
        <div class="flex items-start gap-3">
          <span class="text-purple-600 font-bold text-sm mt-0.5">Datenschutz</span>
          <p class="text-xs text-purple-700">
            Alle angezeigten Faelle wurden durch den Sachbearbeiter zur Pruefung weitergeleitet.
            Name, E-Mail, Telefon und IP-Adressen der Melder sind gemaess HinSchG §8 maskiert.
          </p>
        </div>
      </div>

      <!-- Statistiken -->
      <div class="grid grid-cols-3 gap-4 mb-6">
        <div class="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div class="text-2xl font-bold text-purple-700">{{ totalCases() }}</div>
          <div class="text-xs text-slate-500 mt-1">Weitergeleitet gesamt</div>
        </div>
        <div class="bg-amber-50 rounded-xl border border-amber-200 p-4 text-center">
          <div class="text-2xl font-bold text-amber-700">{{ pendingCount() }}</div>
          <div class="text-xs text-slate-500 mt-1">Empfehlung ausstehend</div>
        </div>
        <div class="bg-emerald-50 rounded-xl border border-emerald-200 p-4 text-center">
          <div class="text-2xl font-bold text-emerald-700">{{ reviewedCount() }}</div>
          <div class="text-xs text-slate-500 mt-1">Empfehlung abgegeben</div>
        </div>
      </div>

      <!-- Filter -->
      <div class="flex items-center gap-3 mb-4">
        <span class="text-sm text-slate-600">Anzeigen:</span>
        @for (f of filterOptions; track f.value) {
          <button
            (click)="setFilter(f.value)"
            [class]="activeFilter() === f.value ? f.activeClass : 'px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50'"
          >
            {{ f.label }}
          </button>
        }
      </div>

      <!-- Faelle-Liste + Detail -->
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <!-- Liste -->
        <div>
          @if (loading()) {
            <div class="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <div class="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p class="text-sm text-slate-500">Faelle werden geladen...</p>
            </div>
          } @else if (cases().length === 0) {
            <div class="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <p class="text-slate-500 text-sm">Keine weitergeleitetenFaelle gefunden.</p>
            </div>
          } @else {
            <div class="space-y-3">
              @for (c of cases(); track c.id) {
                <div
                  (click)="selectCase(c)"
                  class="bg-white rounded-xl border shadow-sm p-4 cursor-pointer transition-all hover:shadow-md"
                  [class]="selectedCase()?.id === c.id
                    ? 'border-purple-400 ring-2 ring-purple-200'
                    : 'border-slate-200'"
                >
                  <div class="flex items-start justify-between mb-2">
                    <div>
                      <span class="text-xs font-mono text-slate-500">{{ c.case_number }}</span>
                      <h3 class="text-sm font-semibold text-slate-800 mt-0.5">{{ c.titel }}</h3>
                    </div>
                    @if (c.ombudsperson_recommendation) {
                      <span class="inline-flex px-2 py-1 rounded-full text-xs font-medium"
                        [class]="recommendationBadgeClass(c.ombudsperson_recommendation)">
                        {{ recommendationLabel(c.ombudsperson_recommendation) }}
                      </span>
                    } @else {
                      <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        <span class="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                        Ausstehend
                      </span>
                    }
                  </div>
                  <div class="flex items-center gap-3 text-xs text-slate-500">
                    @if (c.hinweis?.kategorie) {
                      <span>{{ c.hinweis!.kategorie | titlecase }}</span>
                    }
                    @if (c.schweregrad) {
                      <span>&bull; {{ c.schweregrad | titlecase }}</span>
                    }
                    <span>&bull; {{ c.forwarded_to_ombudsperson_at | date:'dd.MM.yyyy' }}</span>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- Detail + Empfehlung -->
        @if (selectedCase()) {
          <div class="bg-white rounded-xl border border-purple-200 shadow-sm p-6">
            <h2 class="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
              Fall {{ selectedCase()!.case_number }}
            </h2>

            <!-- Fallinhalt maskiert -->
            <div class="space-y-3 mb-6">
              <div>
                <span class="text-xs text-slate-400 uppercase tracking-wide">Titel</span>
                <p class="text-sm text-slate-800 mt-1">{{ selectedCase()!.titel }}</p>
              </div>
              @if (selectedCase()!.hinweis) {
                <div>
                  <span class="text-xs text-slate-400 uppercase tracking-wide">Kategorie</span>
                  <p class="text-sm text-slate-800 mt-1">{{ selectedCase()!.hinweis!.kategorie | titlecase }}</p>
                </div>
                <div>
                  <span class="text-xs text-slate-400 uppercase tracking-wide">Betroffene Abteilung</span>
                  <p class="text-sm text-slate-800 mt-1">{{ selectedCase()!.hinweis!.betroffene_abteilung || '-' }}</p>
                </div>
              }
              <div class="p-2 bg-purple-50 border border-purple-100 rounded-lg">
                <p class="text-xs text-purple-600">Melder: [vertraulich] - gemaess HinSchG §8</p>
              </div>
            </div>

            <!-- Empfehlung abgeben -->
            @if (!selectedCase()!.ombudsperson_recommendation) {
              <div class="border-t border-slate-200 pt-4">
                <h3 class="text-sm font-semibold text-slate-700 mb-3">Empfehlung abgeben</h3>
                <div class="grid grid-cols-3 gap-2 mb-4">
                  @for (opt of recommendationOptions; track opt.value) {
                    <button
                      (click)="selectedRecommendation.set(opt.value)"
                      class="p-3 rounded-lg border text-xs font-medium transition-colors text-center"
                      [class]="selectedRecommendation() === opt.value ? opt.activeClass : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
                    >
                      <div class="font-bold mb-1">{{ opt.label }}</div>
                      <div class="text-xs opacity-75">{{ opt.description }}</div>
                    </button>
                  }
                </div>
                <textarea
                  [(ngModel)]="recommendationNotes"
                  rows="3"
                  placeholder="Optionale Begruendung..."
                  class="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 resize-none mb-3"
                ></textarea>
                <button
                  (click)="submitRecommendation()"
                  [disabled]="!selectedRecommendation() || submittingRecommendation()"
                  class="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  @if (submittingRecommendation()) { <span>Wird gespeichert...</span> }
                  @else { <span>Empfehlung abgeben</span> }
                </button>
                @if (recommendationMessage()) {
                  <div class="mt-3 p-3 rounded-lg text-xs font-medium"
                    [class]="recommendationSuccess() ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'">
                    {{ recommendationMessage() }}
                  </div>
                }
              </div>
            } @else {
              <div class="border-t border-slate-200 pt-4">
                <h3 class="text-sm font-semibold text-slate-700 mb-3">Abgegebene Empfehlung</h3>
                <div class="p-3 rounded-lg" [class]="recommendationBg(selectedCase()!.ombudsperson_recommendation!)">
                  <p class="font-bold text-sm">{{ recommendationLabel(selectedCase()!.ombudsperson_recommendation!) }}</p>
                  @if (selectedCase()!.ombudsperson_reviewed_at) {
                    <p class="text-xs mt-1 opacity-75">{{ selectedCase()!.ombudsperson_reviewed_at | date:'dd.MM.yyyy HH:mm' }}</p>
                  }
                </div>
              </div>
            }
          </div>
        } @else {
          <div class="bg-slate-50 rounded-xl border border-slate-200 p-8 text-center">
            <p class="text-sm text-slate-400">Fall auswaehlen um Details anzuzeigen</p>
          </div>
        }
      </div>
    </div>
  `,
})
export class OmbudspersonDashboardComponent implements OnInit {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  cases = signal<OmbudspersonCase[]>([]);
  selectedCase = signal<OmbudspersonCase | null>(null);
  loading = signal(true);
  activeFilter = signal<string>('all');

  totalCases = signal(0);
  pendingCount = signal(0);
  reviewedCount = signal(0);

  selectedRecommendation = signal<string>('');
  recommendationNotes = '';
  submittingRecommendation = signal(false);
  recommendationMessage = signal('');
  recommendationSuccess = signal(true);

  filterOptions = [
    { value: 'all', label: 'Alle', activeClass: 'px-3 py-1.5 text-xs font-medium bg-slate-800 text-white rounded-lg' },
    { value: 'pending', label: 'Ausstehend', activeClass: 'px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-lg' },
    { value: 'reviewed', label: 'Erledigt', activeClass: 'px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg' },
  ];

  recommendationOptions = [
    { value: 'pursue', label: 'Verfolgen', description: 'Weiter bearbeiten', activeClass: 'border-blue-400 bg-blue-50 text-blue-800' },
    { value: 'close', label: 'Schliessen', description: 'Fall beenden', activeClass: 'border-slate-400 bg-slate-100 text-slate-800' },
    { value: 'escalate', label: 'Eskalieren', description: 'Extern melden', activeClass: 'border-red-400 bg-red-50 text-red-800' },
  ];

  ngOnInit(): void {
    this.loadCases();
  }

  setFilter(val: string): void {
    this.activeFilter.set(val);
    this.loadCases();
  }

  loadCases(): void {
    this.loading.set(true);
    let httpParams = new HttpParams();
    if (this.activeFilter() === 'pending') httpParams = httpParams.set('reviewed', 'false');
    if (this.activeFilter() === 'reviewed') httpParams = httpParams.set('reviewed', 'true');

    this.http.get<{ items: OmbudspersonCase[]; pending_review: number; pagination: { total: number } }>(
      this.baseUrl + '/ombudsperson/cases',
      { params: httpParams }
    ).subscribe({
      next: (resp: any) => {
        this.cases.set(resp.items);
        this.totalCases.set(resp.pagination.total);
        this.pendingCount.set(resp.pending_review);
        this.reviewedCount.set(resp.pagination.total - resp.pending_review);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); },
    });
  }

  selectCase(c: OmbudspersonCase): void {
    this.selectedCase.set(c);
    this.selectedRecommendation.set('');
    this.recommendationNotes = '';
    this.recommendationMessage.set('');
  }

  submitRecommendation(): void {
    const c = this.selectedCase();
    if (!c || !this.selectedRecommendation()) return;

    this.submittingRecommendation.set(true);
    this.recommendationMessage.set('');

    this.http.post(
      this.baseUrl + '/ombudsperson/cases/' + c.id + '/recommendation',
      { recommendation: this.selectedRecommendation(), notes: this.recommendationNotes }
    ).subscribe({
      next: () => {
        this.submittingRecommendation.set(false);
        this.recommendationMessage.set('Empfehlung erfolgreich abgegeben.');
        this.recommendationSuccess.set(true);
        this.selectedCase.set(null);
        this.loadCases();
      },
      error: (err: any) => {
        this.submittingRecommendation.set(false);
        this.recommendationMessage.set(err?.error?.error || 'Fehler beim Speichern.');
        this.recommendationSuccess.set(false);
      },
    });
  }

  recommendationLabel(r: string): string {
    return ({ pursue: 'Weiterverfolgen', close: 'Schliessen', escalate: 'Eskalieren' } as Record<string, string>)[r] || r;
  }

  recommendationBadgeClass(r: string): string {
    return ({ pursue: 'bg-blue-100 text-blue-800', close: 'bg-slate-100 text-slate-700', escalate: 'bg-red-100 text-red-800' } as Record<string, string>)[r] || 'bg-slate-100 text-slate-700';
  }

  recommendationBg(r: string): string {
    return ({ pursue: 'bg-blue-50 border border-blue-200 text-blue-800', close: 'bg-slate-100 border border-slate-200 text-slate-700', escalate: 'bg-red-50 border border-red-200 text-red-800' } as Record<string, string>)[r] || 'bg-slate-50 border border-slate-200';
  }
}
