import { Component, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { ApiService } from "../../../../core/services/api.service";
import { AuthService } from "../../../../core/services/auth.service";

@Component({
  selector: "hw-dashboard",
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="db-root" role="main" aria-label="aitema Hinweis Dashboard">

      <!-- Hero Header -->
      <div class="db-hero">
        <div class="db-hero-content">
          <div class="db-hero-badge">&#128200; Dashboard</div>
          <h1 class="db-hero-title">Willkommen, {{ authService.currentUser()?.name || 'Ombudsperson' }}</h1>
          <p class="db-hero-sub">aitema | Hinweis &mdash; HinSchG-konformes Meldesystem</p>
        </div>
        <div class="db-hero-time">
          <span class="db-time-label">Stand</span>
          <span class="db-time-value">{{ now | date:'dd.MM.yyyy HH:mm' }}</span>
        </div>
      </div>

      <!-- Overdue Alert -->
      @if (stats() && getOverdueFristen() > 0) {
        <div class="db-alert db-alert--danger" role="alert" aria-live="assertive">
          <span class="db-alert-icon">&#9888;&#65039;</span>
          <div>
            <strong>{{ getOverdueFristen() }} Frist(en) ueberschritten</strong> &mdash;
            sofortiger Handlungsbedarf gemaess HinSchG.
            <a routerLink="/meldungen" class="db-alert-link">Meldungen anzeigen &rarr;</a>
          </div>
        </div>
      }

      @if (stats()) {
        <!-- Stats Grid -->
        <section class="db-stats" aria-label="Fallstatistiken">
          <div class="stat-card stat-card--primary">
            <div class="stat-card-top-bar"></div>
            <div class="stat-card-icon">&#128229;</div>
            <div class="stat-value">{{ stats()!.hinweise?.eingegangen || 0 }}</div>
            <div class="stat-label">Neue Meldungen</div>
            <div class="stat-sub">Eingegangen, unbearbeitet</div>
          </div>

          <div class="stat-card stat-card--warning">
            <div class="stat-card-top-bar"></div>
            <div class="stat-card-icon">&#9200;</div>
            <div class="stat-value">{{ stats()!.hinweise?.in_bearbeitung || 0 }}</div>
            <div class="stat-label">In Bearbeitung</div>
            <div class="stat-sub">Aktive F&auml;lle</div>
          </div>

          <div class="stat-card" [class.stat-card--danger]="getOverdueFristen() > 0" [class.stat-card--neutral]="getOverdueFristen() === 0">
            <div class="stat-card-top-bar"></div>
            <div class="stat-card-icon">{{ getOverdueFristen() > 0 ? '&#128680;' : '&#10003;' }}</div>
            <div class="stat-value" [class.stat-value--danger]="getOverdueFristen() > 0">
              {{ getOverdueFristen() }}
            </div>
            <div class="stat-label">&Uuml;berf&auml;llige Fristen</div>
            <div class="stat-sub">HinSchG-Fristen verletzt</div>
          </div>

          <div class="stat-card stat-card--emerald">
            <div class="stat-card-top-bar"></div>
            <div class="stat-card-icon">&#128196;</div>
            <div class="stat-value">{{ stats()!.cases?.offen || 0 }}</div>
            <div class="stat-label">Offene F&auml;lle</div>
            <div class="stat-sub">Noch nicht abgeschlossen</div>
          </div>
        </section>

        <!-- Quick Actions -->
        <section class="db-section" aria-label="Schnellzugriff">
          <div class="db-section-header">
            <h2 class="db-section-title">Schnellzugriff</h2>
          </div>
          <div class="db-actions-grid">
            <a routerLink="/meldungen" class="action-tile action-tile--blue">
              <div class="action-tile-icon">&#128229;</div>
              <div class="action-tile-content">
                <div class="action-tile-title">Meldungen</div>
                <div class="action-tile-sub">Alle Hinweise &uuml;berblicken</div>
              </div>
              <span class="action-tile-arrow">&#8594;</span>
            </a>

            <a routerLink="/faelle" class="action-tile action-tile--navy">
              <div class="action-tile-icon">&#128204;</div>
              <div class="action-tile-content">
                <div class="action-tile-title">F&auml;lle bearbeiten</div>
                <div class="action-tile-sub">Offene F&auml;lle verwalten</div>
              </div>
              <span class="action-tile-arrow">&#8594;</span>
            </a>

            <a routerLink="/meldung" class="action-tile action-tile--emerald">
              <div class="action-tile-icon">&#128221;</div>
              <div class="action-tile-content">
                <div class="action-tile-title">Neue Meldung</div>
                <div class="action-tile-sub">Hinweis erfassen</div>
              </div>
              <span class="action-tile-arrow">&#8594;</span>
            </a>

            <a routerLink="/status" class="action-tile action-tile--amber">
              <div class="action-tile-icon">&#128269;</div>
              <div class="action-tile-content">
                <div class="action-tile-title">Status pr&uuml;fen</div>
                <div class="action-tile-sub">Meldungsstatus abrufen</div>
              </div>
              <span class="action-tile-arrow">&#8594;</span>
            </a>
          </div>
        </section>

        <!-- Fristen Status -->
        <section class="db-section" aria-label="Fristenstatus">
          <div class="db-section-header">
            <h2 class="db-section-title">Gesetzliche Fristen (HinSchG)</h2>
          </div>
          <div class="frist-grid">
            <div class="frist-item" [class.frist-item--ok]="(stats()!.fristen?.ueberfaellige_eingangsbestaetigung || 0) === 0"
                 [class.frist-item--danger]="(stats()!.fristen?.ueberfaellige_eingangsbestaetigung || 0) > 0">
              <div class="frist-icon">{{ (stats()!.fristen?.ueberfaellige_eingangsbestaetigung || 0) > 0 ? '&#9888;' : '&#10003;' }}</div>
              <div>
                <div class="frist-name">Eingangsbestaetigung (7 Tage)</div>
                <div class="frist-count">
                  <strong>{{ stats()!.fristen?.ueberfaellige_eingangsbestaetigung || 0 }}</strong>
                  &uuml;berf&auml;llig
                </div>
              </div>
            </div>
            <div class="frist-item" [class.frist-item--ok]="(stats()!.fristen?.ueberfaellige_rueckmeldung || 0) === 0"
                 [class.frist-item--danger]="(stats()!.fristen?.ueberfaellige_rueckmeldung || 0) > 0">
              <div class="frist-icon">{{ (stats()!.fristen?.ueberfaellige_rueckmeldung || 0) > 0 ? '&#9888;' : '&#10003;' }}</div>
              <div>
                <div class="frist-name">R&uuml;ckmeldung (3 Monate)</div>
                <div class="frist-count">
                  <strong>{{ stats()!.fristen?.ueberfaellige_rueckmeldung || 0 }}</strong>
                  &uuml;berf&auml;llig
                </div>
              </div>
            </div>
          </div>
        </section>
      }

      <!-- Loading State -->
      @if (!stats()) {
        <div class="db-loading" aria-busy="true" aria-label="Daten werden geladen">
          <div class="db-spinner"></div>
          <p>Lade Dashboard-Daten &hellip;</p>
        </div>
      }

    </div>
  `,
  styles: [`
    :host { display: block; }

    .db-root {
      max-width: 1100px;
      margin: 0 auto;
      padding: 0 1.25rem 3rem;
      font-family: "Inter", system-ui, sans-serif;
    }

    /* HERO */
    .db-hero {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1e40af 100%);
      border-radius: 0 0 1.25rem 1.25rem;
      padding: 2rem 2rem 2.5rem;
      margin: 0 -1.25rem 2rem;
      color: #fff;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 1rem;
      position: relative;
      overflow: hidden;
    }
    .db-hero::after {
      content: "";
      position: absolute;
      top: -30%;
      right: -5%;
      width: 350px;
      height: 350px;
      background: radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%);
      pointer-events: none;
    }
    .db-hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      background: rgba(59,130,246,0.2);
      border: 1px solid rgba(59,130,246,0.4);
      border-radius: 9999px;
      padding: 0.25rem 0.875rem;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #93c5fd;
      margin-bottom: 0.75rem;
    }
    .db-hero-title {
      font-size: 1.625rem;
      font-weight: 800;
      margin: 0 0 0.375rem;
      letter-spacing: -0.02em;
      position: relative;
      z-index: 1;
    }
    .db-hero-sub {
      color: rgba(255,255,255,0.6);
      font-size: 0.875rem;
      margin: 0;
      position: relative;
      z-index: 1;
    }
    .db-hero-time {
      text-align: right;
      flex-shrink: 0;
      position: relative;
      z-index: 1;
    }
    .db-time-label {
      display: block;
      font-size: 0.6875rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: rgba(255,255,255,0.45);
      margin-bottom: 0.25rem;
    }
    .db-time-value {
      font-size: 0.875rem;
      font-weight: 600;
      color: rgba(255,255,255,0.85);
      font-variant-numeric: tabular-nums;
    }

    /* ALERT */
    .db-alert {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      border-radius: 0.75rem;
      margin-bottom: 1.5rem;
      font-size: 0.9375rem;
    }
    .db-alert--danger {
      background: #fef2f2;
      border: 1px solid #fca5a5;
      color: #991b1b;
    }
    .db-alert-icon { font-size: 1.125rem; flex-shrink: 0; }
    .db-alert-link { color: inherit; font-weight: 700; text-decoration: underline; margin-left: 0.375rem; }

    /* STATS GRID */
    .db-stats {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 1.5rem;
      position: relative;
      overflow: hidden;
      transition: box-shadow 0.2s ease, transform 0.2s ease;
    }
    .stat-card:hover {
      box-shadow: 0 8px 24px rgba(15,23,42,0.1);
      transform: translateY(-2px);
    }
    .stat-card-top-bar {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
    }
    .stat-card--primary .stat-card-top-bar { background: linear-gradient(90deg, #3b82f6, #2563eb); }
    .stat-card--warning .stat-card-top-bar { background: linear-gradient(90deg, #f59e0b, #d97706); }
    .stat-card--danger  .stat-card-top-bar { background: linear-gradient(90deg, #ef4444, #dc2626); }
    .stat-card--emerald .stat-card-top-bar { background: linear-gradient(90deg, #059669, #047857); }
    .stat-card--neutral .stat-card-top-bar { background: linear-gradient(90deg, #64748b, #475569); }
    .stat-card-icon { font-size: 1.375rem; margin-bottom: 0.75rem; opacity: 0.7; }
    .stat-value {
      font-size: 2.5rem;
      font-weight: 800;
      color: #0f172a;
      line-height: 1;
      letter-spacing: -0.04em;
      margin-bottom: 0.25rem;
    }
    .stat-value--danger { color: #dc2626; }
    .stat-label { font-size: 0.875rem; font-weight: 600; color: #334155; margin-bottom: 0.25rem; }
    .stat-sub   { font-size: 0.75rem; color: #94a3b8; }

    /* SECTION */
    .db-section {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgba(15,23,42,0.06);
      margin-bottom: 1.5rem;
      overflow: hidden;
    }
    .db-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #f1f5f9;
    }
    .db-section-title {
      font-size: 1rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    /* ACTION TILES */
    .db-actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 1px;
      background: #f1f5f9;
    }
    .action-tile {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      padding: 1.25rem 1.5rem;
      background: #fff;
      text-decoration: none;
      color: #0f172a;
      transition: all 0.15s ease;
    }
    .action-tile:hover {
      background: #f8fafc;
      color: #0f172a;
    }
    .action-tile--blue:hover  { background: #eff6ff; }
    .action-tile--navy:hover  { background: #f0f4ff; }
    .action-tile--emerald:hover { background: #f0fdf4; }
    .action-tile--amber:hover { background: #fffbeb; }
    .action-tile-icon { font-size: 1.5rem; flex-shrink: 0; }
    .action-tile-content { flex: 1; }
    .action-tile-title { font-weight: 700; font-size: 0.9375rem; margin-bottom: 0.125rem; }
    .action-tile-sub   { font-size: 0.75rem; color: #64748b; }
    .action-tile-arrow { color: #94a3b8; font-size: 1rem; transition: transform 0.15s ease; }
    .action-tile:hover .action-tile-arrow { transform: translateX(3px); color: #3b82f6; }

    /* FRIST GRID */
    .frist-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1px;
      background: #f1f5f9;
    }
    .frist-item {
      display: flex;
      align-items: flex-start;
      gap: 0.875rem;
      padding: 1.25rem 1.5rem;
      background: #fff;
    }
    .frist-item--ok .frist-icon   { color: #059669; font-size: 1.25rem; }
    .frist-item--danger .frist-icon { color: #dc2626; font-size: 1.25rem; }
    .frist-name  { font-weight: 600; font-size: 0.875rem; color: #334155; margin-bottom: 0.25rem; }
    .frist-count { font-size: 0.8125rem; color: #64748b; }
    .frist-item--danger .frist-count { color: #dc2626; font-weight: 600; }

    /* LOADING */
    .db-loading {
      text-align: center;
      padding: 4rem 2rem;
      color: #64748b;
    }
    .db-spinner {
      width: 3rem;
      height: 3rem;
      border: 3px solid #e2e8f0;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.9s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 768px) {
      .db-hero { flex-direction: column; align-items: flex-start; }
      .db-hero-time { text-align: left; }
      .db-stats { grid-template-columns: repeat(2, 1fr); }
      .stat-value { font-size: 2rem; }
    }

    @media (max-width: 480px) {
      .db-stats { grid-template-columns: 1fr; }
      .db-actions-grid { grid-template-columns: 1fr; }
    }

    @media (prefers-reduced-motion: reduce) {
      .stat-card, .action-tile { transition: none; }
      .db-spinner { animation: none; }
    }

    @media (prefers-color-scheme: dark) {
      .db-root { background: transparent; }
      .stat-card, .db-section, .action-tile, .frist-item {
        background: #1e293b;
        border-color: #334155;
        color: #f1f5f9;
      }
      .db-stats, .db-actions-grid, .frist-grid { background: #334155; }
      .stat-value { color: #f1f5f9; }
      .action-tile:hover { background: #263248; }
      .action-tile--blue:hover  { background: #1e3a5f; }
      .action-tile--emerald:hover { background: #064e3b; }
      .db-section-header { border-color: #334155; }
      .db-alert--danger { background: #450a0a; border-color: #7f1d1d; color: #fca5a5; }
    }
  `],
})
export class DashboardComponent implements OnInit {
  stats = signal<any>(null);
  now = new Date();

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

  getOverdueFristen(): number {
    if (!this.stats()) return 0;
    return (this.stats()!.fristen?.ueberfaellige_eingangsbestaetigung || 0) +
           (this.stats()!.fristen?.ueberfaellige_rueckmeldung || 0);
  }
}
