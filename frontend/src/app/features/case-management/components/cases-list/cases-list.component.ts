/**
 * aitema|Hinweis - Cases List Component
 * D3: Frist-Ampel-Spalte mit hw-deadline-badge
 * D4: Weiterleitungs-Status-Anzeige
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
    <div role="main" class="p-6 max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">Faelle</h1>
          <p class="text-sm text-slate-500 mt-1">HinSchG-konforme Fallbearbeitung</p>
        </div>
        <div class="flex items-center gap-3">
          <!-- Status-Filter -->
          <select
            [(ngModel)]="statusFilter"
            (change)="loadCases()"
            class="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Alle Status</option>
            <option value="offen">Offen</option>
            <option value="zugewiesen">Zugewiesen</option>
            <option value="in_ermittlung">In Ermittlung</option>
            <option value="abgeschlossen">Abgeschlossen</option>
          </select>

          <!-- Fristenfilter -->
          <select
            [(ngModel)]="deadlineFilter"
            (change)="loadCases()"
            class="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Alle Fristen</option>
            <option value="urgent">Dringend (gelb/rot)</option>
          </select>
        </div>
      </div>

      <!-- 2-Spalten-Layout: Widget + Tabelle -->
      <div class="grid grid-cols-1 xl:grid-cols-4 gap-6">

        <!-- D3: Fristenuebersicht-Widget (Sidebar) -->
        <div class="xl:col-span-1">
          <hw-deadline-summary-widget [summary]="deadlineSummary()"></hw-deadline-summary-widget>
        </div>

        <!-- Faelle-Tabelle -->
        <div class="xl:col-span-3">
          @if (loading()) {
            <div class="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <div class="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p class="text-sm text-slate-500">Faelle werden geladen...</p>
            </div>
          } @else if (cases().length === 0) {
            <div class="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <p class="text-slate-500">Keine Faelle gefunden.</p>
            </div>
          } @else {
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-slate-200 bg-slate-50">
                    <th class="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Fall</th>
                    <th class="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</th>
                    <th class="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Schwere</th>
                    <th class="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      HinSchG §17 Frist
                    </th>
                    <th class="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Ombudsperson</th>
                    <th class="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Tage</th>
                    <th class="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (c of cases(); track c.id) {
                    <tr
                      class="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      [class.bg-red-50]="c.deadline_status?.status === 'red'"
                      [class.bg-amber-50]="c.deadline_status?.status === 'yellow'"
                    >
                      <!-- Fall-Nummer + Titel -->
                      <td class="px-4 py-3">
                        <div class="font-medium text-slate-800">{{ c.case_number }}</div>
                        <div class="text-xs text-slate-500 truncate max-w-40">{{ c.titel }}</div>
                      </td>

                      <!-- Fall-Status -->
                      <td class="px-4 py-3">
                        <span class="inline-flex px-2 py-1 rounded-full text-xs font-medium"
                          [ngClass]="statusBadgeClass(c.status)">
                          {{ c.status | titlecase }}
                        </span>
                      </td>

                      <!-- Schweregrad -->
                      <td class="px-4 py-3">
                        @if (c.schweregrad) {
                          <span class="text-xs font-medium"
                            [ngClass]="schwereradClass(c.schweregrad)">
                            {{ c.schweregrad | titlecase }}
                          </span>
                        } @else {
                          <span class="text-xs text-slate-400">-</span>
                        }
                      </td>

                      <!-- D3: Fristenampel -->
                      <td class="px-4 py-3">
                        @if (c.deadline_status) {
                          <hw-deadline-badge
                            [status]="c.deadline_status.status"
                            [label]="c.deadline_status.label"
                            [deadlineData]="c.deadline_status"
                          ></hw-deadline-badge>
                        }
                      </td>

                      <!-- D4: Ombudsperson-Status -->
                      <td class="px-4 py-3">
                        @if (c.forwarded_to_ombudsperson_at) {
                          @if (c.ombudsperson_recommendation) {
                            <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {{ recommendationLabel(c.ombudsperson_recommendation) }}
                            </span>
                          } @else {
                            <span class="inline-flex items-center gap-1 text-xs text-purple-600">
                              <span class="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></span>
                              Weitergeleitet
                            </span>
                          }
                        } @else {
                          <span class="text-xs text-slate-400">-</span>
                        }
                      </td>

                      <!-- Bearbeitungsdauer -->
                      <td class="px-4 py-3 text-xs text-slate-500">
                        {{ c.bearbeitungsdauer_tage }}d
                      </td>

                      <!-- Link -->
                      <td class="px-4 py-3">
                        <a
                          [routerLink]="['/faelle', c.id]"
                          class="text-xs font-medium text-emerald-600 hover:text-emerald-800"
                        >
                          Details
                        </a>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>

              <!-- Pagination -->
              @if (pagination()) {
                <div class="px-4 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50">
                  <span class="text-xs text-slate-500">
                    {{ pagination()!.total }} Faelle gesamt
                  </span>
                  <div class="flex gap-2">
                    <button
                      (click)="prevPage()"
                      [disabled]="currentPage() === 1"
                      class="px-3 py-1 text-xs border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-100"
                    >
                      Zurueck
                    </button>
                    <span class="px-3 py-1 text-xs text-slate-600">
                      {{ currentPage() }} / {{ pagination()!.pages }}
                    </span>
                    <button
                      (click)="nextPage()"
                      [disabled]="currentPage() >= pagination()!.pages"
                      class="px-3 py-1 text-xs border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-100"
                    >
                      Weiter
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

  statusBadgeClass(status: string): Record<string, boolean> {
    return {
      'bg-emerald-100 text-emerald-700': status === 'abgeschlossen',
      'bg-amber-100 text-amber-700': status === 'in_ermittlung' || status === 'stellungnahme',
      'bg-blue-100 text-blue-700': status === 'zugewiesen',
      'bg-slate-100 text-slate-700': status === 'offen',
      'bg-red-100 text-red-700': status === 'eskaliert',
    };
  }

  schwereradClass(s: string): Record<string, boolean> {
    return {
      'text-emerald-600': s === 'gering',
      'text-amber-600': s === 'mittel',
      'text-orange-600': s === 'schwer',
      'text-red-700 font-bold': s === 'kritisch',
    };
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
