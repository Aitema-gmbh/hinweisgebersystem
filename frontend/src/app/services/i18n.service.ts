import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private translations: Record<string, string> = {};
  private currentLang$ = new BehaviorSubject<string>('de');

  readonly availableLangs = [
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'en', label: 'English', flag: '🇬🇧' }
  ];

  constructor(private http: HttpClient) {
    const saved = localStorage.getItem('aitema_lang') ||
      navigator.language.split('-')[0] || 'de';
    this.setLang(this.availableLangs.find(l => l.code === saved) ? saved : 'de');
  }

  setLang(lang: string): void {
    this.http.get<Record<string, string>>(`/assets/i18n/${lang}.json`).subscribe(t => {
      this.translations = t;
      this.currentLang$.next(lang);
      localStorage.setItem('aitema_lang', lang);
      document.documentElement.lang = lang;
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

  get lang$(): Observable<string> {
    return this.currentLang$.asObservable();
  }
}
