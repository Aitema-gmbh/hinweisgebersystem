/**
 * Skip Navigation Component
 * BITV 2.0 Anforderung: Mechanismus zum Ueberspringen von Navigationsbloecken
 */
import { Component } from '@angular/core';

@Component({
  selector: 'app-skip-nav',
  standalone: true,
  template: `
    <nav class="skip-nav" aria-label="Sprungnavigation">
      <a href="#main-content" class="skip-link">
        Zum Hauptinhalt springen
      </a>
      <a href="#main-navigation" class="skip-link">
        Zur Navigation springen
      </a>
      <a href="#search" class="skip-link" *ngIf="hasSearch">
        Zur Suche springen
      </a>
    </nav>
  `,
  styles: [`
    .skip-nav {
      position: absolute;
      top: -100%;
      left: 0;
      width: 100%;
      z-index: 9999;
    }
    .skip-link {
      position: absolute;
      top: -100%;
      left: 50%;
      transform: translateX(-50%);
      padding: 0.75rem 1.5rem;
      background: #1e3a5f;
      color: #ffffff;
      text-decoration: none;
      font-weight: 600;
      border-radius: 0 0 0.5rem 0.5rem;
      z-index: 9999;
      transition: top 0.2s ease;
    }
    .skip-link:focus {
      top: 0;
      outline: 3px solid #fbbf24;
      outline-offset: 2px;
    }
    @media (prefers-reduced-motion: reduce) {
      .skip-link { transition: none; }
    }
  `],
})
export class SkipNavComponent {
  hasSearch = true;
}
