import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { I18nService, Language } from "../../../services/i18n.service";

@Component({
  selector: "hw-language-switcher",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="lang-switcher"
      role="navigation"
      aria-label="Sprachauswahl / Language Selection"
    >
      <button
        class="lang-toggle"
        [attr.aria-expanded]="open"
        [attr.aria-haspopup]="'listbox'"
        (click)="toggle()"
        (keydown.escape)="close()"
        type="button"
        [title]="currentLang?.nativeLabel"
        [attr.aria-label]="'Sprache: ' + currentLang?.nativeLabel"
      >
        <span class="lang-flag" aria-hidden="true">{{ currentLang?.flag }}</span>
        <span class="lang-code">{{ currentLang?.label }}</span>
        <span class="lang-chevron" [class.open]="open" aria-hidden="true">&#9660;</span>
      </button>

      @if (open) {
        <ul
          class="lang-dropdown"
          role="listbox"
          [attr.aria-label]="'Sprachen'"
          (mouseleave)="close()"
        >
          @for (lang of languages; track lang.code) {
            <li
              role="option"
              [attr.aria-selected]="currentLang?.code === lang.code"
              class="lang-option"
              [class.lang-option--active]="currentLang?.code === lang.code"
              (click)="switchLang(lang)"
              (keydown.enter)="switchLang(lang)"
              (keydown.space)="switchLang(lang)"
              [tabindex]="0"
              [title]="lang.nativeLabel"
            >
              <span class="lang-flag" aria-hidden="true">{{ lang.flag }}</span>
              <span class="lang-native">{{ lang.nativeLabel }}</span>
              <span class="lang-abbr">{{ lang.label }}</span>
              @if (currentLang?.code === lang.code) {
                <span class="lang-check" aria-hidden="true">&#10003;</span>
              }
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    :host { display: inline-block; position: relative; }
    .lang-switcher { position: relative; }
    .lang-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.375rem 0.75rem;
      border: 1.5px solid rgba(255,255,255,0.25);
      border-radius: 0.5rem;
      background: rgba(255,255,255,0.1);
      color: inherit;
      font-family: inherit;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.18s ease;
      white-space: nowrap;
    }
    .lang-toggle:hover { background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.4); }
    .lang-toggle:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }
    .lang-flag { font-size: 1rem; line-height: 1; }
    .lang-code { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.04em; }
    .lang-chevron { font-size: 0.5rem; transition: transform 0.18s ease; display: inline-block; }
    .lang-chevron.open { transform: rotate(180deg); }
    .lang-dropdown {
      position: absolute;
      top: calc(100% + 0.375rem);
      right: 0;
      min-width: 160px;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 0.625rem;
      box-shadow: 0 8px 32px rgba(15,23,42,0.14), 0 2px 8px rgba(15,23,42,0.06);
      list-style: none;
      margin: 0;
      padding: 0.375rem;
      z-index: 1000;
      animation: dropIn 0.15s ease;
    }
    @keyframes dropIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
    .lang-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      border-radius: 0.375rem;
      cursor: pointer;
      transition: background 0.12s ease;
      font-size: 0.875rem;
      color: #334155;
    }
    .lang-option:hover { background: #f1f5f9; }
    .lang-option:focus-visible { outline: 2px solid #3b82f6; outline-offset: -2px; }
    .lang-option--active { background: rgba(59,130,246,0.08); color: #1e40af; font-weight: 600; }
    .lang-native { flex: 1; }
    .lang-abbr { font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.05em; color: #94a3b8; }
    .lang-option--active .lang-abbr { color: #3b82f6; }
    .lang-check { color: #3b82f6; font-weight: 700; }
    @media (prefers-reduced-motion: reduce) {
      .lang-toggle, .lang-chevron { transition: none; }
      .lang-dropdown { animation: none; }
    }
  `]
})
export class LanguageSwitcherComponent implements OnInit {
  languages: Language[] = [];
  currentLang: Language | undefined;
  open = false;

  constructor(private i18n: I18nService) {}

  ngOnInit(): void {
    this.languages = this.i18n.availableLangs;
    this.i18n.lang$.subscribe(code => {
      this.currentLang = this.languages.find(l => l.code === code);
    });
  }

  toggle(): void { this.open = !this.open; }
  close(): void { this.open = false; }

  switchLang(lang: Language): void {
    this.i18n.setLang(lang.code);
    this.open = false;
  }
}
