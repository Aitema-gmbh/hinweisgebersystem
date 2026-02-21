/**
 * aitema|Hinweis - API Service
 * Zentraler HTTP-Client fuer Backend-Kommunikation.
 */
import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    pages: number;
  };
}

export interface SubmissionCreate {
  titel: string;
  beschreibung: string;
  kategorie: string;
  is_anonymous: boolean;
  melder_name?: string;
  melder_email?: string;
  melder_phone?: string;
  preferred_channel?: string;
  betroffene_personen?: string;
  betroffene_abteilung?: string;
  zeitraum_von?: string;
  zeitraum_bis?: string;
  tags?: string[];
}

export interface SubmissionResponse {
  message: string;
  reference_code: string;
  access_code: string;
  eingangsbestaetigung_bis: string;
}

export interface Submission {
  id: string;
  reference_code: string;
  titel: string;
  kategorie: string;
  prioritaet: string;
  status: string;
  is_anonymous: boolean;
  eingegangen_am: string;
  tage_seit_eingang: number;
  eingangsbestaetigung_ueberfaellig: boolean;
  rueckmeldung_ueberfaellig: boolean;
}

export interface Case {
  id: string;
  case_number: string;
  titel: string;
  status: string;
  schweregrad: string | null;
  assignee_id: string | null;
  bearbeitungsdauer_tage: number;
  opened_at: string;
  updated_at: string;
}

@Injectable({ providedIn: "root" })
export class ApiService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // === Submissions ===

  createSubmission(data: SubmissionCreate): Observable<SubmissionResponse> {
    return this.http.post<SubmissionResponse>(`${this.baseUrl}/submissions/`, data);
  }

  checkStatus(accessCode: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/submissions/status/${accessCode}`);
  }

  getSubmissions(params?: {
    page?: number;
    per_page?: number;
    status?: string;
    kategorie?: string;
  }): Observable<PaginatedResponse<Submission>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }
    return this.http.get<PaginatedResponse<Submission>>(
      `${this.baseUrl}/submissions/`,
      { params: httpParams }
    );
  }

  getSubmission(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/submissions/${id}`);
  }

  // === Cases ===

  createCase(data: { hinweis_id: string; titel: string; assignee_id?: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/cases/`, data);
  }

  getCases(params?: {
    page?: number;
    per_page?: number;
    status?: string;
  }): Observable<PaginatedResponse<Case>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }
    return this.http.get<PaginatedResponse<Case>>(
      `${this.baseUrl}/cases/`,
      { params: httpParams }
    );
  }

  updateCaseStatus(caseId: string, status: string, kommentar?: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/cases/${caseId}/status`, { status, kommentar });
  }

  assignCase(caseId: string, assigneeId: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/cases/${caseId}/assign`, { assignee_id: assigneeId });
  }

  // === Admin ===

  getDashboardStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/dashboard`);
  }

  getUsers(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/users`);
  }

  createUser(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/users`, data);
  }

  updateUser(userId: string, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/admin/users/${userId}`, data);
  }

  // === Health ===

  // === Analytics ===

  getDashboardAnalytics(): Observable<any> {
    return this.http.get(`${this.baseUrl}/analytics/dashboard`);
  }

  // === Health ===

  getHealth(): Observable<any> {
    return this.http.get(`${this.baseUrl}/health`);
  }

  // === Generische Methoden fuer D3/D4 ===

  get<T>(path: string, params?: Record<string, string>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) httpParams = httpParams.set(k, v);
      });
    }
    return this.http.get<T>(this.baseUrl + path, { params: httpParams });
  }

  post<T = any>(path: string, body: any): Observable<T> {
    return this.http.post<T>(this.baseUrl + path, body);
  }

  // === D3: Fristenampel ===

  acknowledgeCase(caseId: string): Observable<any> {
    return this.http.post(this.baseUrl + '/cases/' + caseId + '/acknowledge', {});
  }

  resolveCase(caseId: string, kommentar?: string): Observable<any> {
    return this.http.post(this.baseUrl + '/cases/' + caseId + '/resolve', { kommentar });
  }

  getDeadlineSummary(): Observable<any> {
    return this.http.get(this.baseUrl + '/cases/deadline-summary');
  }

  // === D4: Ombudsperson ===

  forwardCaseToOmbudsperson(caseId: string, kommentar?: string): Observable<any> {
    return this.http.post(this.baseUrl + '/cases/' + caseId + '/forward-to-ombudsperson', { kommentar });
  }

  getOmbudspersonCases(params?: { reviewed?: string }): Observable<any> {
    let httpParams = new HttpParams();
    if (params?.reviewed !== undefined) httpParams = httpParams.set('reviewed', params.reviewed);
    return this.http.get(this.baseUrl + '/ombudsperson/cases', { params: httpParams });
  }

  submitOmbudspersonRecommendation(caseId: string, recommendation: string, notes?: string): Observable<any> {
    return this.http.post(this.baseUrl + '/ombudsperson/cases/' + caseId + '/recommendation', { recommendation, notes });
  }

}
