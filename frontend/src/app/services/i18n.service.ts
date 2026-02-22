import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Language {
  code: string;
  label: string;
  flag: string;
  dir: 'ltr' | 'rtl';
  nativeLabel: string;
}

@Injectable({ providedIn: 'root' })
export class I18nService {
  private translations: Record<string, string> = {};
  private currentLang$ = new BehaviorSubject<string>('de');

  readonly availableLangs: Language[] = [
    { code: 'de', label: 'DE', flag: '🇩🇪', dir: 'ltr', nativeLabel: 'Deutsch' },
    { code: 'en', label: 'EN', flag: '🇬🇧', dir: 'ltr', nativeLabel: 'English' },
    { code: 'tr', label: 'TR', flag: '🇹🇷', dir: 'ltr', nativeLabel: 'Türkçe' },
    { code: 'ru', label: 'RU', flag: '🇷🇺', dir: 'ltr', nativeLabel: 'Русский' },
  ];

  constructor(private http: HttpClient) {
    const saved = localStorage.getItem('aitema_lang') ||
      navigator.language.split('-')[0] || 'de';
    const validLang = this.availableLangs.find(l => l.code === saved) ? saved : 'de';
    this.setLang(validLang);
  }

  setLang(langCode: string): void {
    const lang = this.availableLangs.find(l => l.code === langCode);
    if (!lang) return;

    this.http.get<Record<string, string>>(`/assets/i18n/${langCode}.json`).subscribe(t => {
      this.translations = t;
      this.currentLang$.next(langCode);
      localStorage.setItem('aitema_lang', langCode);
      document.documentElement.lang = langCode;
      document.documentElement.dir = lang.dir;
      document.body.classList.toggle('rtl', lang.dir === 'rtl');
    });
  }

  get(key: string, params?: Record<string, string | number>): string {
    let text = this.translations[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
      });
    }
    return text;
  }

  get currentLang(): string {
    return this.currentLang$.value;
  }

  get currentLangObj(): Language | undefined {
    return this.availableLangs.find(l => l.code === this.currentLang$.value);
  }

  get lang$(): Observable<string> {
    return this.currentLang$.asObservable();
  }

  get isRtl(): boolean {
    return this.currentLangObj?.dir === 'rtl';
  }
}
