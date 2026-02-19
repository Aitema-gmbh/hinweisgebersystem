/**
 * aitema|Hinweis - Accessibility Service
 * Barrierefreiheit nach WCAG 2.1 AA / BITV 2.0.
 */
import { Injectable } from "@angular/core";
import { Title } from "@angular/platform-browser";

@Injectable({ providedIn: "root" })
export class A11yService {
  constructor(private titleService: Title) {}

  announceToScreenReader(message: string, priority: "polite" | "assertive" = "polite"): void {
    const announcement = document.createElement("div");
    announcement.setAttribute("role", "status");
    announcement.setAttribute("aria-live", priority);
    announcement.setAttribute("aria-atomic", "true");
    announcement.classList.add("sr-only");
    announcement.textContent = message;
    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
  }

  setPageTitle(title: string): void {
    this.titleService.setTitle(`${title} | aitema|Hinweis`);
  }

  trapFocus(element: HTMLElement): () => void {
    const focusableSelector =
      "button, [href], input, select, textarea, [tabindex]:not([tabindex=\"-1\"])";
    const focusableElements = element.querySelectorAll(focusableSelector);
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (event: KeyboardEvent) => {
      if (event.key \!== "Tab") return;
      if (event.shiftKey) {
        if (document.activeElement === firstFocusable) {
          lastFocusable.focus();
          event.preventDefault();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          firstFocusable.focus();
          event.preventDefault();
        }
      }
    };

    element.addEventListener("keydown", handleTab);
    firstFocusable?.focus();
    return () => element.removeEventListener("keydown", handleTab);
  }
}
