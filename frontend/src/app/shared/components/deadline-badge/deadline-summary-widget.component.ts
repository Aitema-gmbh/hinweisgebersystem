/**
 * aitema|Hinweis - D3: Dashboard-Widget Fristenuebersicht
 * Zeigt Ampel-Zusammenfassung aller Faelle (Gruen/Gelb/Rot/Done).
 */
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

export interface DeadlineSummary {
  green: number;
  yellow: number;
  red: number;
  done: number;
  total: number;
}

@Component({
  selector: 'hw-deadline-summary-widget',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-semibold text-slate-700 uppercase tracking-wide">
          HinSchG-Fristenstatus
        </h3>
        <a
          routerLink="/faelle"
          [queryParams]="{ deadline_filter: 'urgent' }"
          class="text-xs text-emerald-600 hover:text-emerald-800 font-medium"
        >
          Alle anzeigen
        </a>
      </div>

      @if (summary) {
        <!-- Ampel-Kacheln -->
        <div class="grid grid-cols-2 gap-3 mb-4">
          <!-- Rot: Ueberfaellig -->
          <div
            class="rounded-lg p-3 border"
            [class]="summary.red > 0
              ? 'bg-red-50 border-red-200 animate-pulse'
              : 'bg-slate-50 border-slate-200'"
          >
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full"
                [class]="summary.red > 0 ? 'bg-red-500' : 'bg-slate-300'">
              </span>
              <span class="text-xs font-medium"
                [class]="summary.red > 0 ? 'text-red-700' : 'text-slate-500'">
                Ueberfaellig
              </span>
            </div>
            <div class="text-2xl font-bold mt-1"
              [class]="summary.red > 0 ? 'text-red-700' : 'text-slate-400'">
              {{ summary.red }}
            </div>
          </div>

          <!-- Gelb: Warnung -->
          <div
            class="rounded-lg p-3 border"
            [class]="summary.yellow > 0
              ? 'bg-amber-50 border-amber-200'
              : 'bg-slate-50 border-slate-200'"
          >
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full"
                [class]="summary.yellow > 0 ? 'bg-amber-500' : 'bg-slate-300'">
              </span>
              <span class="text-xs font-medium"
                [class]="summary.yellow > 0 ? 'text-amber-700' : 'text-slate-500'">
                Warnung (&le;14 Tage)
              </span>
            </div>
            <div class="text-2xl font-bold mt-1"
              [class]="summary.yellow > 0 ? 'text-amber-700' : 'text-slate-400'">
              {{ summary.yellow }}
            </div>
          </div>

          <!-- Gruen: Im Plan -->
          <div class="rounded-lg p-3 bg-emerald-50 border border-emerald-200">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span class="text-xs font-medium text-emerald-700">Im Plan</span>
            </div>
            <div class="text-2xl font-bold mt-1 text-emerald-700">
              {{ summary.green }}
            </div>
          </div>

          <!-- Done: Abgeschlossen -->
          <div class="rounded-lg p-3 bg-slate-50 border border-slate-200">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-slate-400"></span>
              <span class="text-xs font-medium text-slate-500">Abgeschlossen</span>
            </div>
            <div class="text-2xl font-bold mt-1 text-slate-400">
              {{ summary.done }}
            </div>
          </div>
        </div>

        <!-- Gesamt-Info -->
        <div class="text-xs text-slate-400 text-center">
          {{ summary.total }} Faelle gesamt
        </div>

        <!-- HinSchG-Hinweis bei roten Faellen -->
        @if (summary.red > 0) {
          <div class="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-xs text-red-700 font-medium">
              {{ summary.red }} Fall/Faelle ueberschreiten die HinSchG §17 Fristen.
              Sofortiger Handlungsbedarf!
            </p>
          </div>
        }
      } @else {
        <!-- Skeleton-Loader -->
        <div class="space-y-2">
          @for (i of [1,2,3,4]; track i) {
            <div class="h-12 bg-slate-100 rounded-lg animate-pulse"></div>
          }
        </div>
      }
    </div>
  `,
})
export class DeadlineSummaryWidgetComponent {
  @Input() summary: DeadlineSummary | null = null;
}
