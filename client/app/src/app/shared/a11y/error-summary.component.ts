/**
 * Error Summary Component
 * WCAG 3.3.1 / 3.3.3: Error Identification and Suggestion
 * 
 * Displays form validation errors in an accessible summary
 * that is announced to screen readers and focusable.
 */
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface FormError {
  field: string;
  fieldLabel: string;
  message: string;
}

@Component({
  selector: 'app-error-summary',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="errors.length > 0"
         class="error-summary"
         role="alert"
         aria-live="assertive"
         tabindex="-1"
         #errorSummary>
      <h3 class="error-summary-title" id="error-summary-heading">
        {{ errors.length }} Fehler gefunden
      </h3>
      <ul class="error-summary-list"
          aria-labelledby="error-summary-heading">
        <li *ngFor="let error of errors">
          <a [href]="'#' + error.field"
             class="error-summary-link"
             (click)="focusField($event, error.field)">
            {{ error.fieldLabel }}: {{ error.message }}
          </a>
        </li>
      </ul>
    </div>
  `,
  styles: [`
    .error-summary {
      border: 2px solid var(--color-error, #991b1b);
      border-radius: 0.5rem;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
      background: #fef2f2;
    }
    .error-summary:focus {
      outline: 3px solid #2563eb;
      outline-offset: 2px;
    }
    .error-summary-title {
      color: var(--color-error, #991b1b);
      font-size: 1.125rem;
      font-weight: 700;
      margin: 0 0 0.75rem;
    }
    .error-summary-list {
      margin: 0;
      padding-left: 1.25rem;
    }
    .error-summary-list li {
      margin-bottom: 0.25rem;
    }
    .error-summary-link {
      color: var(--color-error, #991b1b);
      text-decoration: underline;
      font-weight: 500;
    }
    .error-summary-link:hover {
      color: #7f1d1d;
    }
    .error-summary-link:focus-visible {
      outline: 3px solid #2563eb;
      outline-offset: 2px;
    }
  `],
})
export class ErrorSummaryComponent {
  @Input() errors: FormError[] = [];

  focusField(event: Event, fieldId: string): void {
    event.preventDefault();
    const el = document.getElementById(fieldId);
    if (el) {
      el.focus();
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}
