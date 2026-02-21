/**
 * aitema|Hinweis - D3: HinSchG-Fristenampel Badge
 * Standalone-Komponente fuer die Anzeige des Fristenstatus.
 *
 * Status-Farben (aitema Design-System):
 *   green  -> emerald (> 14 Tage)
 *   yellow -> amber   (0-14 Tage)
 *   red    -> red + animate-pulse (ueberfaellig)
 *   done   -> slate   (abgeschlossen)
 */
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type DeadlineStatusType = 'green' | 'yellow' | 'red' | 'done';

export interface DeadlineSummary {
  green: number;
  yellow: number;
  red: number;
  done: number;
  total: number;
}

export interface DeadlineStatusData {
  status: DeadlineStatusType;
  label: string;
  deadline_type: string | null;
  deadline_type_label: string | null;
  days_remaining: number | null;
  deadline: string | null;
  ack_done: boolean;
  resolve_done: boolean;
  ack_deadline: string;
  resolve_deadline: string;
}

@Component({
  selector: 'hw-deadline-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      [ngClass]="badgeClasses"
      class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
      [title]="tooltipText"
      role="status"
      [attr.aria-label]="'Fristenstatus: ' + label"
    >
      <span class="w-2 h-2 rounded-full inline-block" [ngClass]="dotClass"></span>
      {{ label }}
    </span>
  `,
})
export class DeadlineBadgeComponent {
  @Input({ required: true }) status: DeadlineStatusType = 'green';
  @Input({ required: true }) label = '';
  @Input() deadlineData: DeadlineStatusData | null = null;

  get badgeClasses(): Record<string, boolean> {
    return {
      'bg-emerald-100 text-emerald-800 border border-emerald-200':
        this.status === 'green',
      'bg-amber-100 text-amber-800 border border-amber-200':
        this.status === 'yellow',
      'bg-red-100 text-red-800 border border-red-200 animate-pulse':
        this.status === 'red',
      'bg-slate-100 text-slate-500 border border-slate-200':
        this.status === 'done',
    };
  }

  get dotClass(): Record<string, boolean> {
    return {
      'bg-emerald-500': this.status === 'green',
      'bg-amber-500': this.status === 'yellow',
      'bg-red-500': this.status === 'red',
      'bg-slate-400': this.status === 'done',
    };
  }

  get tooltipText(): string {
    if (!this.deadlineData) return this.label;
    const d = this.deadlineData;
    const ack = d.ack_done ? 'erledigt' : 'ausstehend';
    const res = d.resolve_done ? 'erledigt' : 'ausstehend';
    return [
      'Eingangsbestaetigung: ' + ack,
      'Abschluss-Rueckmeldung: ' + res,
      d.days_remaining !== null
        ? d.days_remaining >= 0
          ? d.days_remaining + ' Tage verbleibend'
          : Math.abs(d.days_remaining) + ' Tage ueberfaellig'
        : '',
    ]
      .filter(Boolean)
      .join(' | ');
  }
}
