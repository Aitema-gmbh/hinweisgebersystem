/**
 * aitema|Hinweis Accessibility Module
 * 
 * BITV 2.0 / WCAG 2.1 AA Compliance Utilities
 * 
 * Provides:
 * - Skip navigation
 * - Focus management
 * - Live region announcements
 * - High contrast mode detection
 * - Reduced motion support
 * - Keyboard trap prevention
 */
import { Injectable, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class A11yService {
  private liveRegion: HTMLElement | null = null;

  /** Initialize ARIA live region for screen reader announcements */
  initLiveRegion(): void {
    if (this.liveRegion) return;
    
    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('role', 'status');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.classList.add('sr-only');
    this.liveRegion.id = 'a11y-live-region';
    document.body.appendChild(this.liveRegion);
  }

  /** Announce message to screen readers */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.liveRegion) this.initLiveRegion();
    
    this.liveRegion!.setAttribute('aria-live', priority);
    // Clear first to ensure re-announcement of same message
    this.liveRegion!.textContent = '';
    setTimeout(() => {
      this.liveRegion!.textContent = message;
    }, 100);
  }

  /** Announce urgent deadline warnings */
  announceFristWarning(aktenzeichen: string, fristTyp: string, tage: number): void {
    if (tage <= 0) {
      this.announce(
        `Achtung: Frist ${fristTyp} fuer Fall ${aktenzeichen} ist ueberschritten!`,
        'assertive'
      );
    } else if (tage <= 2) {
      this.announce(
        `Warnung: Frist ${fristTyp} fuer Fall ${aktenzeichen} laeuft in ${tage} Tagen ab.`,
        'assertive'
      );
    }
  }

  /** Move focus to element, with retry for async rendering */
  focusElement(selector: string, retries = 3): void {
    const el = document.querySelector<HTMLElement>(selector);
    if (el) {
      el.focus();
      return;
    }
    if (retries > 0) {
      setTimeout(() => this.focusElement(selector, retries - 1), 200);
    }
  }

  /** Check if user prefers reduced motion */
  prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /** Check if forced/high contrast mode is active */
  isHighContrastMode(): boolean {
    return window.matchMedia('(forced-colors: active)').matches;
  }

  /** Trap focus within a dialog/modal */
  trapFocus(containerEl: HTMLElement): () => void {
    const focusableSelector = [
      'a[href]', 'button:not([disabled])', 'input:not([disabled])',
      'textarea:not([disabled])', 'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');
    
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      const focusable = containerEl.querySelectorAll<HTMLElement>(focusableSelector);
      if (focusable.length === 0) return;
      
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    
    containerEl.addEventListener('keydown', handleKeydown);
    
    // Focus first focusable element
    const firstFocusable = containerEl.querySelector<HTMLElement>(focusableSelector);
    if (firstFocusable) firstFocusable.focus();
    
    // Return cleanup function
    return () => containerEl.removeEventListener('keydown', handleKeydown);
  }
}

@NgModule({
  imports: [CommonModule],
  providers: [A11yService],
})
export class A11yModule {}
