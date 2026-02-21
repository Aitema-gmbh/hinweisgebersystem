/**
 * aitema|Hinweis - Dashboard Component
 * Compliance-Dashboard mit Chart.js Charts (H1 Feature).
 *
 * Charts:
 *   1. Meldungsvolumen (Line Chart, 12 Monate)
 *   2. Kategorie-Verteilung (Doughnut Chart)
 *   3. Bearbeitungsstatus (Horizontal Bar Chart)
 *   4. Compliance-Rate (KPI-Card mit Gauge)
 */

import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
  signal,
  ChangeDetectorRef,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { ApiService } from "../../../../core/services/api.service";
import { AuthService } from "../../../../core/services/auth.service";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  BarController,
  BarElement,
  DoughnutController,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
  ChartConfiguration,
} from "chart.js";

// Chart.js Komponenten registrieren (tree-shaking-freundlich)
Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  BarController,
  BarElement,
  DoughnutController,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

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

      <!-- ===== NEU: Compliance-Charts Section (H1 Feature) ===== -->
      <section class="charts-section" aria-label="Compliance-Uebersicht">
        <div class="charts-section-header">
          <h2 class="charts-section-title">Compliance-&Uuml;bersicht</h2>
          <span class="charts-anon-badge">
            Anonymisiert (min. 3 Meldungen pro Kategorie)
          </span>
        </div>

        @if (analyticsLoading) {
          <div class="charts-loading" aria-busy="true">
            <div class="db-spinner"></div>
            <p>Lade Compliance-Daten &hellip;</p>
          </div>
        }

        @if (!analyticsLoading) {
          <div class="charts-grid">

            <!-- Chart 1: Meldungsvolumen (Line) -->
            <div class="chart-card">
              <h3 class="chart-card-title">Meldungsvolumen (12 Monate)</h3>
              <div class="chart-canvas-wrapper">
                <canvas #volumeChart aria-label="Meldungsvolumen letzte 12 Monate"></canvas>
              </div>
            </div>

            <!-- Chart 2: Kategorie-Verteilung (Doughnut) -->
            <div class="chart-card">
              <h3 class="chart-card-title">Kategorie-Verteilung</h3>
              @if (analytics && analytics.categories && analytics.categories.length === 0) {
                <div class="chart-empty">Nicht genug Daten (min. 3 Meldungen pro Kategorie)</div>
              }
              <div class="chart-canvas-wrapper">
                <canvas #categoryChart aria-label="Verteilung nach Kategorien"></canvas>
              </div>
            </div>

            <!-- Chart 3: Bearbeitungsstatus (Bar) -->
            <div class="chart-card">
              <h3 class="chart-card-title">Bearbeitungsstatus</h3>
              <div class="chart-canvas-wrapper">
                <canvas #statusChart aria-label="Meldungen nach Bearbeitungsstatus"></canvas>
              </div>
            </div>

            <!-- Chart 4: Compliance-Rate (KPI-Card) -->
            <div class="chart-card chart-card--kpi">
              <h3 class="chart-card-title chart-card-title--light">HinSchG-Fristeneinhaltung</h3>
              <div class="kpi-value">{{ analytics?.compliance_rate ?? 0 }}%</div>
              <div class="kpi-label">Fristgerecht bearbeitet</div>
              <div class="kpi-bar-bg">
                <div class="kpi-bar-fill"
                     [style.width.%]="analytics?.compliance_rate ?? 0"
                     [class.kpi-bar-fill--green]="(analytics?.compliance_rate ?? 0) >= 80"
                     [class.kpi-bar-fill--amber]="(analytics?.compliance_rate ?? 0) >= 50 && (analytics?.compliance_rate ?? 0) < 80"
                     [class.kpi-bar-fill--red]="(analytics?.compliance_rate ?? 0) < 50">
                </div>
              </div>
              <div class="kpi-total">
                Gesamt: {{ analytics?.total_cases ?? 0 }} Meldungen
              </div>
            </div>

          </div>

          <!-- PDF-Export -->
          <div class="charts-export">
            <button (click)="exportPDF()" class="btn-export" type="button">
              &#128196; Compliance-Bericht exportieren (PDF)
            </button>
          </div>
        }
      </section>
      <!-- ===== ENDE Compliance-Charts Section ===== -->

      <!-- Loading State (Hauptdashboard) -->
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

    /* ===== COMPLIANCE CHARTS SECTION (H1) ===== */
    .charts-section {
      margin-top: 2rem;
    }

    .charts-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .charts-section-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    .charts-anon-badge {
      font-size: 0.75rem;
      color: #64748b;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
    }

    .charts-loading {
      text-align: center;
      padding: 3rem 2rem;
      color: #64748b;
    }

    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
    }

    .chart-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(15,23,42,0.06);
    }

    .chart-card-title {
      font-size: 0.8125rem;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin: 0 0 1.25rem;
    }

    .chart-canvas-wrapper {
      position: relative;
      height: 220px;
    }

    .chart-canvas-wrapper canvas {
      max-height: 220px;
    }

    .chart-empty {
      font-size: 0.8125rem;
      color: #94a3b8;
      text-align: center;
      padding: 2rem 1rem;
      font-style: italic;
    }

    /* KPI Card */
    .chart-card--kpi {
      background: linear-gradient(135deg, #1e40af 0%, #0f172a 100%);
      color: #fff;
      border-color: transparent;
    }

    .chart-card-title--light {
      color: rgba(255,255,255,0.65);
    }

    .kpi-value {
      font-size: 3.5rem;
      font-weight: 800;
      line-height: 1;
      letter-spacing: -0.04em;
      margin-bottom: 0.375rem;
    }

    .kpi-label {
      font-size: 0.875rem;
      color: rgba(255,255,255,0.65);
      margin-bottom: 1.25rem;
    }

    .kpi-bar-bg {
      background: rgba(255,255,255,0.15);
      border-radius: 9999px;
      height: 10px;
      overflow: hidden;
      margin-bottom: 1rem;
    }

    .kpi-bar-fill {
      height: 100%;
      border-radius: 9999px;
      transition: width 1.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .kpi-bar-fill--green  { background: #34d399; }
    .kpi-bar-fill--amber  { background: #fbbf24; }
    .kpi-bar-fill--red    { background: #f87171; }

    .kpi-total {
      font-size: 0.8125rem;
      color: rgba(255,255,255,0.5);
    }

    /* Export Button */
    .charts-export {
      margin-top: 1.5rem;
      text-align: right;
    }

    .btn-export {
      background: #1e40af;
      color: #fff;
      border: none;
      padding: 0.625rem 1.25rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-export:hover { background: #1d4ed8; }
    .btn-export:active { background: #1e3a8a; }

    /* RESPONSIVE */
    @media (max-width: 768px) {
      .db-hero { flex-direction: column; align-items: flex-start; }
      .db-hero-time { text-align: left; }
      .db-stats { grid-template-columns: repeat(2, 1fr); }
      .stat-value { font-size: 2rem; }
      .charts-grid { grid-template-columns: 1fr; }
      .charts-section-header { flex-direction: column; align-items: flex-start; }
    }

    @media (max-width: 480px) {
      .db-stats { grid-template-columns: 1fr; }
      .db-actions-grid { grid-template-columns: 1fr; }
    }

    @media print {
      .db-hero, .db-actions-grid, .action-tile, .btn-export { display: none !important; }
      .charts-section { margin-top: 0; }
      .chart-card { break-inside: avoid; box-shadow: none; border: 1px solid #ccc; }
    }

    @media (prefers-reduced-motion: reduce) {
      .stat-card, .action-tile { transition: none; }
      .db-spinner { animation: none; }
      .kpi-bar-fill { transition: none; }
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
      .chart-card { background: #1e293b; border-color: #334155; }
      .chart-card-title { color: #94a3b8; }
      .charts-section-title { color: #f1f5f9; }
      .charts-anon-badge { background: #1e293b; border-color: #334155; color: #94a3b8; }
    }
  `],
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  // ===== Vorhandene Felder =====
  stats = signal<any>(null);
  now = new Date();

  // ===== Neue Chart-Felder (H1) =====
  analytics: any = null;
  analyticsLoading = true;
  chartsReady = false;

  // Chart-Referenzen fuer Cleanup
  private chartInstances: Chart[] = [];

  // ViewChild-Referenzen auf Canvas-Elemente
  @ViewChild("volumeChart") volumeCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild("categoryChart") categoryCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild("statusChart") statusCanvasRef!: ElementRef<HTMLCanvasElement>;

  constructor(
    private apiService: ApiService,
    public authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Dashboard-Stats laden (vorhanden)
    this.apiService.getDashboardStats().subscribe({
      next: (data) => this.stats.set(data),
      error: () => {},
    });

    // Analytics-Daten laden (neu H1)
    this.apiService.getDashboardAnalytics().subscribe({
      next: (data) => {
        this.analytics = data;
        this.analyticsLoading = false;
        this.cdr.detectChanges(); // Sicherstellen dass Canvas-Elemente gerendert sind
        // Nach detectChanges Canvase initialisieren
        setTimeout(() => this.initCharts(), 50);
      },
      error: (err) => {
        console.error("Analytics konnten nicht geladen werden:", err);
        // Leere Struktur damit Charts-Section trotzdem rendert
        this.analytics = {
          monthly_volume: [],
          categories: [],
          statuses: [],
          compliance_rate: 0,
          total_cases: 0,
        };
        this.analyticsLoading = false;
        this.cdr.detectChanges();
        setTimeout(() => this.initCharts(), 50);
      },
    });
  }

  ngAfterViewInit(): void {
    // Charts werden nach Analytics-Daten-Laden initialisiert (via subscribe)
  }

  ngOnDestroy(): void {
    // Charts sauber aufraeuemen
    this.chartInstances.forEach((c) => c.destroy());
    this.chartInstances = [];
  }

  getOverdueFristen(): number {
    if (!this.stats()) return 0;
    return (
      (this.stats()!.fristen?.ueberfaellige_eingangsbestaetigung || 0) +
      (this.stats()!.fristen?.ueberfaellige_rueckmeldung || 0)
    );
  }

  // ===== Chart-Initialisierung =====

  private initCharts(): void {
    if (!this.analytics) return;
    this.destroyCharts();
    this.buildVolumeChart();
    this.buildCategoryChart();
    this.buildStatusChart();
    this.chartsReady = true;
  }

  private destroyCharts(): void {
    this.chartInstances.forEach((c) => c.destroy());
    this.chartInstances = [];
  }

  /** Chart 1: Meldungsvolumen (Line) */
  private buildVolumeChart(): void {
    if (!this.volumeCanvasRef?.nativeElement) return;

    const monthNames = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
    const data = this.analytics.monthly_volume ?? [];

    const labels = data.map((m: any) => `${monthNames[m.month - 1]} ${m.year}`);
    const values = data.map((m: any) => m.count);

    const cfg: ChartConfiguration<"line"> = {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Meldungen",
            data: values,
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59,130,246,0.08)",
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "#3b82f6",
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { mode: "index", intersect: false },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              color: "#64748b",
              font: { size: 11 },
            },
            grid: { color: "rgba(100,116,139,0.08)" },
          },
          x: {
            ticks: { color: "#64748b", font: { size: 11 } },
            grid: { display: false },
          },
        },
      },
    };

    const chart = new Chart(this.volumeCanvasRef.nativeElement, cfg);
    this.chartInstances.push(chart);
  }

  /** Chart 2: Kategorie-Verteilung (Doughnut) */
  private buildCategoryChart(): void {
    if (!this.categoryCanvasRef?.nativeElement) return;

    const data = this.analytics.categories ?? [];
    if (data.length === 0) return; // Leer-State wird im Template gezeigt

    const palette = [
      "#3b82f6","#059669","#f59e0b","#ef4444",
      "#8b5cf6","#ec4899","#14b8a6","#f97316",
      "#64748b","#84cc16",
    ];

    const cfg: ChartConfiguration<"doughnut"> = {
      type: "doughnut",
      data: {
        labels: data.map((c: any) => c.name),
        datasets: [
          {
            data: data.map((c: any) => c.count),
            backgroundColor: palette.slice(0, data.length),
            borderWidth: 2,
            borderColor: "#fff",
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#475569",
              font: { size: 11 },
              padding: 12,
              boxWidth: 12,
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.raw} Meldungen`,
            },
          },
        },
        cutout: "60%",
      },
    };

    const chart = new Chart(this.categoryCanvasRef.nativeElement, cfg);
    this.chartInstances.push(chart);
  }

  /** Chart 3: Bearbeitungsstatus (Horizontal Bar) */
  private buildStatusChart(): void {
    if (!this.statusCanvasRef?.nativeElement) return;

    const data = this.analytics.statuses ?? [];

    const statusColors: Record<string, string> = {
      "Eingegangen":      "#3b82f6",
      "Best. versendet":  "#8b5cf6",
      "In Pruefung":      "#f59e0b",
      "In Bearbeitung":   "#f97316",
      "Rueckmeldung":     "#14b8a6",
      "Abgeschlossen":    "#059669",
      "Abgelehnt":        "#ef4444",
      "Weitergeleitet":   "#64748b",
    };

    const cfg: ChartConfiguration<"bar"> = {
      type: "bar",
      data: {
        labels: data.map((s: any) => s.status),
        datasets: [
          {
            label: "Meldungen",
            data: data.map((s: any) => s.count),
            backgroundColor: data.map(
              (s: any) => statusColors[s.status] ?? "#94a3b8"
            ),
            borderRadius: 4,
            borderSkipped: false,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.raw} Meldungen`,
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              color: "#64748b",
              font: { size: 11 },
            },
            grid: { color: "rgba(100,116,139,0.08)" },
          },
          y: {
            ticks: { color: "#475569", font: { size: 11 } },
            grid: { display: false },
          },
        },
      },
    };

    const chart = new Chart(this.statusCanvasRef.nativeElement, cfg);
    this.chartInstances.push(chart);
  }

  /** PDF-Export via window.print() (Browser-Print-Dialog) */
  exportPDF(): void {
    window.print();
  }
}
