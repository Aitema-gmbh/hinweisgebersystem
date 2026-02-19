/**
 * aitema|Hinweis - Auth Service
 * Authentifizierung und Session-Management.
 */
import { Injectable, signal, computed } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { Observable, tap, catchError, throwError } from "rxjs";
import { environment } from "../../../environments/environment";

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tenant_id: string;
  mfa_enabled: boolean;
  must_change_password: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
  mfa_code?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  // Reactive state mit Signals
  private currentUserSignal = signal<User | null>(null);
  private tokenSignal = signal<string | null>(null);

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUserSignal() \!== null);
  readonly userRole = computed(() => this.currentUserSignal()?.role ?? null);

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    const token = localStorage.getItem("access_token");
    const userJson = localStorage.getItem("current_user");
    if (token && userJson) {
      try {
        this.tokenSignal.set(token);
        this.currentUserSignal.set(JSON.parse(userJson));
      } catch {
        this.clearSession();
      }
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((response) => {
        localStorage.setItem("access_token", response.access_token);
        localStorage.setItem("refresh_token", response.refresh_token);
        localStorage.setItem("current_user", JSON.stringify(response.user));
        this.tokenSignal.set(response.access_token);
        this.currentUserSignal.set(response.user);
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    this.http.post(`${this.apiUrl}/logout`, {}).subscribe({
      complete: () => this.clearSession(),
      error: () => this.clearSession(),
    });
  }

  refreshToken(): Observable<{ access_token: string }> {
    const refreshToken = localStorage.getItem("refresh_token");
    return this.http
      .post<{ access_token: string }>(`${this.apiUrl}/refresh`, {}, {
        headers: { Authorization: `Bearer ${refreshToken}` },
      })
      .pipe(
        tap((response) => {
          localStorage.setItem("access_token", response.access_token);
          this.tokenSignal.set(response.access_token);
        })
      );
  }

  getToken(): string | null {
    return this.tokenSignal();
  }

  hasRole(roles: string[]): boolean {
    const userRole = this.userRole();
    return userRole \!== null && roles.includes(userRole);
  }

  private clearSession(): void {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("current_user");
    this.tokenSignal.set(null);
    this.currentUserSignal.set(null);
    this.router.navigate(["/login"]);
  }
}
