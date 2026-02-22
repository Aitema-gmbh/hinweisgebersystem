import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
  signal,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
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
  ChartOptions,
} from "chart.js";

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
    <div class="animate-fadeInUp">
      <!-- Welcome Header -->
      <header class="page-header">
        <h1>Willkommen, {{ authService.currentUser()?.name || 'Ombudsperson' }}</h1>
        <p>aitema | Hinweis &mdash; HinSchG-konformes Meldesystem (Stand: {{ now | date:'dd.MM.yyyy HH:mm' }})</p>
      </header>

      <!-- Overdue Alert -->
      @if (stats() && getOverdueFristen() > 0) {
        <div class="aitema-badge aitema-badge--critical" role="alert" aria-live="assertive">
          <strong>{{ getOverdueFristen() }} Frist(en) ueberschritten</strong> &mdash;
          sofortiger Handlungsbedarf gemaess HinSchG.
          <a routerLink="/cases" class="alert-link">Meldungen anzeigen &rarr;</a>
        </div>
      }

      @if (stats()) {
        <!-- Stats Grid -->
        <section class="stats-grid" aria-label="Fallstatistiken">
          <div class="aitema-card">
            <div class="stat-value">{{ stats()!.hinweise?.eingegangen || 0 }}</div>
            <div class="stat-label">Neue Meldungen</div>
          </div>
          <div class="aitema-card">
            <div class="stat-value">{{ stats()!.hinweise?.in_bearbeitung || 0 }}</div>
            <div class="stat-label">In Bearbeitung</div>
          </div>
          <div class="aitema-card">
            <div class="stat-value" [class.danger-text]="getOverdueFristen() > 0">
              {{ getOverdueFristen() }}
            </div>
            <div class="stat-label">&Uuml;berf&auml;llige Fristen</div>
          </div>
          <div class="aitema-card">
            <div class="stat-value">{{ stats()!.cases?.offen || 0 }}</div>
            <div class="stat-label">Offene F&auml;lle</div>
          </div>
        </section>

        <!-- Charts Section -->
        <section class="aitema-card chart-section" aria-label="Compliance-Uebersicht">
           <div class="chart-header">
              <h2>Compliance-&Uuml;bersicht</h2>
              <span class="aitema-badge">Anonymisiert</span>
           </div>
           
           @if (analyticsLoading) {
            <div class="chart-loading">Lade Compliance-Daten...</div>
           } @else {
            <div class="charts-grid">
              <div class="chart-container">
                <h3>Meldungsvolumen (12 Monate)</h3>
                <canvas #volumeChart></canvas>
              </div>
              <div class="chart-container">
                <h3>Kategorie-Verteilung</h3>
                <canvas #categoryChart></canvas>
              </div>
              <div class="chart-container">
                <h3>Bearbeitungsstatus</h3>
                <canvas #statusChart></canvas>
              </div>
            </div>
           }
        </section>
      }

      <!-- Loading State -->
      @if (!stats()) {
        <div class="aitema-card loading-state">
          Lade Dashboard-Daten &hellip;
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page-header {
      margin-bottom: 2rem;
    }
    .page-header h1 {
      font-size: 1.75rem;
      font-weight: 700;
    }
    .page-header p {
      color: var(--aitema-muted);
    }
    .alert-link {
      text-decoration: underline;
      margin-left: 0.5rem;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
      margin: 2rem 0;
    }
    .stats-grid .aitema-card {
      padding: 1.5rem;
    }
    .stat-value {
      font-size: 2.25rem;
      font-weight: 700;
      line-height: 1;
    }
    .stat-label {
      color: var(--aitema-muted);
      font-size: 0.875rem;
    }
    .danger-text {
      color: var(--aitema-red);
    }
    .chart-section {
      padding: 1.5rem;
    }
    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .chart-header h2 {
      font-size: 1.25rem;
      margin: 0;
    }
    .charts-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    .chart-container {
      position: relative;
      height: 300px;
    }
    .chart-container h3 {
        font-size: 1rem;
        margin-bottom: 1rem;
        text-align: center;
    }
    .loading-state, .chart-loading {
      padding: 4rem;
      text-align: center;
      color: var(--aitema-muted);
    }
     @media (max-width: 992px) {
      .charts-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  stats = signal<any>(null);
  now = new Date();
  analytics: any = null;
  analyticsLoading = true;
  private chartInstances: any[] = [];

  @ViewChild("volumeChart") volumeCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild("categoryChart") categoryCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild("statusChart") statusCanvasRef!: ElementRef<HTMLCanvasElement>;

  constructor(
    private apiService: ApiService,
    public authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.apiService.getDashboardStats().subscribe({
      next: (data) => this.stats.set(data),
    });

    this.apiService.getDashboardAnalytics().subscribe({
      next: (data) => {
        this.analytics = data;
        this.analyticsLoading = false;
        this.cdr.detectChanges();
        setTimeout(() => this.initCharts(), 50);
      },
      error: () => {
        this.analyticsLoading = false;
      },
    });
  }

  ngAfterViewInit(): void {
    if (this.analytics) {
      this.initCharts();
    }
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  getOverdueFristen(): number {
    if (!this.stats()) return 0;
    return (
      (this.stats()!.fristen?.ueberfaellige_eingangsbestaetigung || 0) +
      (this.stats()!.fristen?.ueberfaellige_rueckmeldung || 0)
    );
  }
  
  private initCharts(): void {
    if (!this.analytics) return;
    this.destroyCharts();
    if(this.volumeCanvasRef) this.buildVolumeChart();
    if(this.categoryCanvasRef) this.buildCategoryChart();
    if(this.statusCanvasRef) this.buildStatusChart();
  }

  private destroyCharts(): void {
    this.chartInstances.forEach((c) => c.destroy());
    this.chartInstances = [];
  }
  
  private buildVolumeChart(): void {
    const monthNames = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
    const data = this.analytics.monthly_volume ?? [];
    const labels = data.map((m: any) => `${monthNames[m.month - 1]} ${m.year}`);
    const values = data.map((m: any) => m.count);

    const cfg: ChartConfiguration<"line"> = {
      type: "line",
      data: { labels, datasets: [{
            label: "Meldungen",
            data: values,
            borderColor: "var(--aitema-accent)",
            backgroundColor: "rgba(59,130,246,0.1)",
            fill: true,
            tension: 0.4
      }]},
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { mode: 'index', intersect: false },
        },
        scales: {
          y: { 
            beginAtZero: true, 
            ticks: { stepSize: 1, color: "var(--aitema-muted)" }, 
            grid: { color: "var(--aitema-border)" } 
          },
          x: { 
            ticks: { color: "var(--aitema-muted)" }, 
            grid: { display: false } 
          },
        }
      }
    };
    this.chartInstances.push(new Chart(this.volumeCanvasRef.nativeElement, cfg));
  }

  private buildCategoryChart(): void {
    const data = this.analytics.categories ?? [];
    if (data.length === 0) return;
    const palette = ["#3b82f6","#059669","#f59e0b","#ef4444","#8b5cf6","#ec4899"];

    const cfg: ChartConfiguration<"doughnut"> = {
      type: "doughnut",
      data: {
        labels: data.map((c: any) => c.name),
        datasets: [{
            data: data.map((c: any) => c.count),
            backgroundColor: palette,
            borderWidth: 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { 
            display: true, 
            position: 'bottom', 
            labels: { color: 'var(--aitema-muted)' }
          },
          tooltip: { mode: 'index', intersect: false },
        },
        cutout: "60%"
      }
    };
     this.chartInstances.push(new Chart(this.categoryCanvasRef.nativeElement, cfg));
  }

  private buildStatusChart(): void {
    const data = this.analytics.statuses ?? [];
    const statusColors: Record<string, string> = { "Eingegangen": "#3b82f6", "In Bearbeitung": "#f59e0b", "Abgeschlossen": "#059669", "Abgelehnt": "#ef4444"};

    const cfg: ChartConfiguration<"bar"> = {
      type: "bar",
      data: {
        labels: data.map((s: any) => s.status),
        datasets: [{
            label: "Meldungen",
            data: data.map((s: any) => s.count),
            backgroundColor: data.map((s: any) => statusColors[s.status] ?? "#64748b"),
            borderRadius: 4,
        }]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { mode: 'index', intersect: false },
        },
        scales: {
          y: { 
            beginAtZero: true, 
            ticks: { stepSize: 1, color: "var(--aitema-muted)" }, 
            grid: { color: "var(--aitema-border)" } 
          },
          x: { 
            ticks: { color: "var(--aitema-muted)" }, 
            grid: { display: false } 
          },
        }
      }
    };
    this.chartInstances.push(new Chart(this.statusCanvasRef.nativeElement, cfg));
  }
}
