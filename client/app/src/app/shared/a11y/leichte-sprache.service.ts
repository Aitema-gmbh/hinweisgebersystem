/**
 * Leichte Sprache Service (Easy Language)
 * 
 * BITV 2.0 §4: Information in Leichter Sprache
 * Provides simplified German text alternatives for complex legal terms
 * used in HinSchG context.
 */
import { Injectable } from '@angular/core';

export interface LeichteSpracheText {
  standard: string;
  leicht: string;
  erklaerung?: string;
}

@Injectable({ providedIn: 'root' })
export class LeichteSpracheService {
  private active = false;
  
  private texte: Record<string, LeichteSpracheText> = {
    'hinweisgeber': {
      standard: 'Hinweisgeber',
      leicht: 'Person, die etwas meldet',
      erklaerung: 'Eine Person, die bei der Arbeit etwas Schlimmes bemerkt hat und das melden moechte.'
    },
    'meldestelle': {
      standard: 'Interne Meldestelle',
      leicht: 'Stelle fuer Meldungen',
      erklaerung: 'Eine Stelle in Ihrer Gemeinde, die Meldungen entgegen nimmt.'
    },
    'eingangsbestaetigung': {
      standard: 'Eingangsbestaetigung',
      leicht: 'Bestaetigung: Wir haben Ihre Meldung bekommen',
      erklaerung: 'Sie bekommen eine Nachricht, dass Ihre Meldung angekommen ist. Das passiert innerhalb von 7 Tagen.'
    },
    'rueckmeldung': {
      standard: 'Rueckmeldung zu ergriffenen Massnahmen',
      leicht: 'Antwort: Das haben wir gemacht',
      erklaerung: 'Sie bekommen eine Nachricht, was mit Ihrer Meldung passiert ist. Das passiert innerhalb von 3 Monaten.'
    },
    'ombudsperson': {
      standard: 'Ombudsperson',
      leicht: 'Vertrauens-Person',
      erklaerung: 'Eine Person, der Sie vertrauen koennen. Diese Person kuemmert sich um Ihre Meldung.'
    },
    'vertraulichkeit': {
      standard: 'Vertraulichkeitsgebot',
      leicht: 'Ihr Name bleibt geheim',
      erklaerung: 'Niemand erfaehrt, dass Sie die Meldung gemacht haben. Das ist gesetzlich geschuetzt.'
    },
    'repressalien': {
      standard: 'Schutz vor Repressalien',
      leicht: 'Schutz vor Bestrafung',
      erklaerung: 'Wenn Sie etwas melden, darf Ihnen dafuer nichts Schlimmes passieren. Zum Beispiel duerfen Sie nicht gekuendigt werden.'
    },
    'stichhaltig': {
      standard: 'Stichhaltigkeit',
      leicht: 'Stimmt die Meldung?',
      erklaerung: 'Wir pruefen, ob die Meldung berechtigt ist.'
    },
    'folgemassnahme': {
      standard: 'Folgemassnahme',
      leicht: 'Das machen wir als naechstes',
      erklaerung: 'Wir erklaeren Ihnen, was wir tun werden.'
    },
    'datenschutz': {
      standard: 'Datenschutzhinweis',
      leicht: 'So schuetzen wir Ihre Daten',
      erklaerung: 'Ihre Daten sind sicher. Wir halten uns an die Gesetze zum Datenschutz.'
    },
  };

  isActive(): boolean {
    return this.active;
  }

  toggle(): void {
    this.active = !this.active;
  }

  activate(): void {
    this.active = true;
  }

  deactivate(): void {
    this.active = false;
  }

  getText(key: string): string {
    const text = this.texte[key];
    if (!text) return key;
    return this.active ? text.leicht : text.standard;
  }

  getErklaerung(key: string): string | undefined {
    return this.texte[key]?.erklaerung;
  }

  getAllTexte(): Record<string, LeichteSpracheText> {
    return { ...this.texte };
  }
}
