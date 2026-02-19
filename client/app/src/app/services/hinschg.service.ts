/**
 * HinSchG API Service for aitema|Hinweis
 * 
 * Angular service for communicating with the HinSchG backend API.
 * Handles case management, deadlines, and compliance reporting.
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// ============================================================
// Type Definitions
// ============================================================

export interface HinweisCase {
  id: string;
  tid: number;
  internaltip_id: string;
  aktenzeichen: string;
  kategorie: HinweisKategorie;
  status: FallStatus;
  prioritaet: FallPrioritaet;
  meldekanal: MeldeKanal;
  eingangsdatum: string;
  eingangsbestaetigung_datum: string | null;
  eingangsbestaetigung_frist: string | null;
  rueckmeldung_frist: string | null;
  rueckmeldung_datum: string | null;
  abschluss_datum: string | null;
  ombudsperson_id: string | null;
  fallbearbeiter_id: string | null;
  stichhaltig: boolean | null;
  folgemassnahme_beschreibung: string;
  begruendung: string;
  history?: CaseHistoryEntry[];
  fristen?: Frist[];
}

export interface CaseHistoryEntry {
  id: string;
  alter_status: string | null;
  neuer_status: string;
  kommentar: string;
  aktion: string;
  user_id: string | null;
  created_at: string;
}

export interface Frist {
  id: string;
  case_id: string;
  aktenzeichen?: string;
  frist_typ: FristTyp;
  frist_datum: string;
  erledigt: boolean;
  erledigt_datum: string | null;
  eskaliert: boolean;
  case_status?: string;
}

export interface Dashboard {
  status_counts: Record<FallStatus, number>;
  total_cases: number;
  overdue_fristen: number;
  upcoming_fristen: number;
  kategorien_verteilung: Record<string, number>;
  recent_cases: HinweisCase[];
}

export interface ComplianceReport {
  id: string;
  tid: number;
  berichtszeitraum_von: string;
  berichtszeitraum_bis: string;
  gesamt_meldungen: number;
  stichhaltige_meldungen: number;
  nicht_stichhaltige_meldungen: number;
  offene_faelle: number;
  abgeschlossene_faelle: number;
  durchschnittliche_bearbeitungszeit_tage: number;
  fristverstoesse_7t: number;
  fristverstoesse_3m: number;
  kategorien_verteilung: Record<string, number>;
  erstellt_von: string;
  created_at: string;
}

export interface Ombudsperson {
  id: string;
  user_id: string;
  ist_extern: boolean;
  organisation: string;
  qualifikation: string;
  vertretung_user_id: string | null;
  aktiv: boolean;
}

// Enums
export type FallStatus = 
  | 'eingegangen' | 'eingangsbestaetigung' | 'in_pruefung'
  | 'in_bearbeitung' | 'folgemassnahme' | 'rueckmeldung'
  | 'abgeschlossen' | 'archiviert';

export type HinweisKategorie =
  | 'straftat' | 'ordnungswidrigkeit' | 'verstoss_eu_recht'
  | 'verstoss_bundesrecht' | 'verstoss_landesrecht'
  | 'arbeitsschutz' | 'umweltschutz' | 'verbraucherschutz'
  | 'datenschutz' | 'korruption' | 'geldwaesche'
  | 'steuerbetrug' | 'sonstiges';

export type FallPrioritaet = 'niedrig' | 'mittel' | 'hoch' | 'kritisch';
export type MeldeKanal = 'online' | 'telefonisch' | 'persoenlich' | 'briefpost';
export type FristTyp = 'eingangsbestaetigung_7t' | 'rueckmeldung_3m' | 'archivierung_3j' | 'loeschung';

// Status display config
export const STATUS_CONFIG: Record<FallStatus, { label: string; color: string; icon: string }> = {
  eingegangen: { label: 'Eingegangen', color: '#2196F3', icon: 'inbox' },
  eingangsbestaetigung: { label: 'Bestaetigt', color: '#4CAF50', icon: 'check_circle' },
  in_pruefung: { label: 'In Pruefung', color: '#FF9800', icon: 'search' },
  in_bearbeitung: { label: 'In Bearbeitung', color: '#9C27B0', icon: 'work' },
  folgemassnahme: { label: 'Folgemassnahme', color: '#E91E63', icon: 'gavel' },
  rueckmeldung: { label: 'Rueckmeldung', color: '#00BCD4', icon: 'feedback' },
  abgeschlossen: { label: 'Abgeschlossen', color: '#607D8B', icon: 'done_all' },
  archiviert: { label: 'Archiviert', color: '#9E9E9E', icon: 'archive' },
};

export const KATEGORIE_LABELS: Record<HinweisKategorie, string> = {
  straftat: 'Straftat',
  ordnungswidrigkeit: 'Ordnungswidrigkeit',
  verstoss_eu_recht: 'Verstoss gegen EU-Recht',
  verstoss_bundesrecht: 'Verstoss gegen Bundesrecht',
  verstoss_landesrecht: 'Verstoss gegen Landesrecht',
  arbeitsschutz: 'Arbeitsschutz',
  umweltschutz: 'Umweltschutz',
  verbraucherschutz: 'Verbraucherschutz',
  datenschutz: 'Datenschutz',
  korruption: 'Korruption',
  geldwaesche: 'Geldwaesche',
  steuerbetrug: 'Steuerbetrug',
  sonstiges: 'Sonstiges',
};

// ============================================================
// Angular Service
// ============================================================

@Injectable({
  providedIn: 'root'
})
export class HinschgService {
  private readonly apiUrl = '/api/hinschg';

  constructor(private http: HttpClient) {}

  // ---- Dashboard ----
  getDashboard(): Observable<Dashboard> {
    return this.http.get<Dashboard>(`${this.apiUrl}/dashboard`);
  }

  // ---- Cases ----
  getCases(filters?: {
    status?: FallStatus;
    kategorie?: HinweisKategorie;
    prioritaet?: FallPrioritaet;
  }): Observable<HinweisCase[]> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.kategorie) params = params.set('kategorie', filters.kategorie);
    if (filters?.prioritaet) params = params.set('prioritaet', filters.prioritaet);
    return this.http.get<HinweisCase[]>(`${this.apiUrl}/cases`, { params });
  }

  getCase(caseId: string): Observable<HinweisCase> {
    return this.http.get<HinweisCase>(`${this.apiUrl}/cases/${caseId}`);
  }

  createCase(data: {
    internaltip_id: string;
    kategorie?: HinweisKategorie;
    meldekanal?: MeldeKanal;
    ombudsperson_id?: string;
  }): Observable<HinweisCase> {
    return this.http.post<HinweisCase>(`${this.apiUrl}/cases`, data);
  }

  updateCase(caseId: string, data: Partial<HinweisCase>): Observable<HinweisCase> {
    return this.http.put<HinweisCase>(`${this.apiUrl}/cases/${caseId}`, data);
  }

  changeStatus(caseId: string, data: {
    status: FallStatus;
    kommentar?: string;
    begruendung?: string;
  }): Observable<HinweisCase> {
    return this.http.post<HinweisCase>(`${this.apiUrl}/cases/${caseId}/status`, data);
  }

  // ---- Fristen (Deadlines) ----
  getFristen(): Observable<Frist[]> {
    return this.http.get<Frist[]>(`${this.apiUrl}/fristen`);
  }

  // ---- Reports ----
  getReports(): Observable<ComplianceReport[]> {
    return this.http.get<ComplianceReport[]>(`${this.apiUrl}/reports`);
  }

  generateReport(von: string, bis: string): Observable<ComplianceReport> {
    return this.http.post<ComplianceReport>(`${this.apiUrl}/reports`, { von, bis });
  }

  // ---- Ombudspersonen ----
  getOmbudspersonen(): Observable<Ombudsperson[]> {
    return this.http.get<Ombudsperson[]>(`${this.apiUrl}/ombudspersonen`);
  }

  addOmbudsperson(data: Partial<Ombudsperson>): Observable<Ombudsperson> {
    return this.http.post<Ombudsperson>(`${this.apiUrl}/ombudspersonen`, data);
  }

  // ---- Utility ----
  getStatusLabel(status: FallStatus): string {
    return STATUS_CONFIG[status]?.label || status;
  }

  getStatusColor(status: FallStatus): string {
    return STATUS_CONFIG[status]?.color || '#000';
  }

  getKategorieLabel(kategorie: HinweisKategorie): string {
    return KATEGORIE_LABELS[kategorie] || kategorie;
  }

  isFristUeberfaellig(frist: Frist): boolean {
    return !frist.erledigt && new Date(frist.frist_datum) < new Date();
  }

  getFristTageVerbleibend(frist: Frist): number {
    const diff = new Date(frist.frist_datum).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}
