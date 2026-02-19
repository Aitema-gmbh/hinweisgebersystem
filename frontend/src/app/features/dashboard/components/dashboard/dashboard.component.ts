import { Component, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { ApiService } from "../../../../core/services/api.service";
import { AuthService } from "../../../../core/services/auth.service";

@Component({
  selector: "hw-dashboard",
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatIconModule, MatButtonModule],
  template: `
    <div class="dashboard" role="main" aria-label="Dashboard">
      <h1>Dashboard</h1>
      <p>Willkommen, {{ authService.currentUser()?.name }}</p>

      @if (stats()) {
        <div class="stats-grid" role="list" aria-label="Statistik-Uebersicht">
          <mat-card role="listitem">
            <mat-card-header><mat-card-title>Neue Meldungen</mat-card-title></mat-card-header>
            <mat-card-content>
              <span class="stat-number">{{ stats()!.hinweise?.eingegangen || 0 }}</span>
            </mat-card-content>
          </mat-card>

          <mat-card role="listitem">
            <mat-card-header><mat-card-title>In Bearbeitung</mat-card-title></mat-card-header>
            <mat-card-content>
              <span class="stat-number">{{ stats()!.hinweise?.in_bearbeitung || 0 }}</span>
            </mat-card-content>
          </mat-card>

          <mat-card role="listitem" class="warning-card">
            <mat-card-header><mat-card-title>Ueberfaellige Fristen</mat-card-title></mat-card-header>
            <mat-card-content>
              <span class="stat-number stat-warning">
                {{ (stats()!.fristen?.ueberfaellige_eingangsbestaetigung || 0) +
                   (stats()!.fristen?.ueberfaellige_rueckmeldung || 0) }}
              </span>
            </mat-card-content>
          </mat-card>

          <mat-card role="listitem">
            <mat-card-header><mat-card-title>Offene Faelle</mat-card-title></mat-card-header>
            <mat-card-content>
              <span class="stat-number">{{ stats()!.cases?.offen || 0 }}</span>
            </mat-card-content>
          </mat-card>
        </div>

        <div class="quick-actions">
          <h2>Schnellzugriff</h2>
          <a mat-raised-button color="primary" routerLink="/meldungen">Meldungen ansehen</a>
          <a mat-raised-button routerLink="/faelle">Faelle bearbeiten</a>
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard { max-width: 1200px; margin: 2rem auto; padding: 0 1rem; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin: 2rem 0; }
    .stat-number { font-size: 2.5rem; font-weight: bold; color: #1565c0; }
    .stat-warning { color: #d32f2f; }
    .warning-card { border-left: 4px solid #d32f2f; }
    .quick-actions { margin-top: 2rem; display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; }
    .quick-actions h2 { width: 100%; }
  `],
})
export class DashboardComponent implements OnInit {
  stats = signal<any>(null);

  constructor(
    private apiService: ApiService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.apiService.getDashboardStats().subscribe({
      next: (data) => this.stats.set(data),
      error: () => {},
    });
  }
}
