import { Component, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { ApiService } from "../../../../core/services/api.service";

@Component({
  selector: "hw-status-check",
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatCardModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="status-container" role="main" aria-label="Meldungsstatus pruefen">
      <h1>Status Ihrer Meldung pruefen</h1>
      <p>Geben Sie Ihren Zugangscode ein, um den aktuellen Status abzurufen.</p>

      <form (ngSubmit)="checkStatus()" class="status-form">
        <mat-form-field appearance="outline" class="code-field">
          <mat-label>Zugangscode</mat-label>
          <input matInput [(ngModel)]="accessCode" name="accessCode"
                 required minlength="20"
                 aria-describedby="code-hint" />
          <mat-hint id="code-hint">Ihr persoenlicher Zugangscode aus der Bestaetigung</mat-hint>
        </mat-form-field>
        <button mat-raised-button color="primary" type="submit"
                [disabled]="loading() || accessCode.length < 20">
          @if (loading()) {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            Status abfragen
          }
        </button>
      </form>

      @if (statusData()) {
        <mat-card class="status-card" role="region" aria-label="Meldungsstatus">
          <mat-card-header>
            <mat-card-title>Meldung {{ statusData()!.reference_code }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <dl>
              <dt>Status</dt>
              <dd class="status-badge" [attr.data-status]="statusData()!.status">
                {{ translateStatus(statusData()!.status) }}
              </dd>
              <dt>Kategorie</dt>
              <dd>{{ statusData()!.kategorie }}</dd>
              <dt>Eingegangen am</dt>
              <dd>{{ statusData()!.eingegangen_am | date:"dd.MM.yyyy" }}</dd>
              <dt>Tage seit Eingang</dt>
              <dd>{{ statusData()!.tage_seit_eingang }}</dd>
              <dt>Eingangsbestaetigung</dt>
              <dd>{{ statusData()!.eingangsbestaetigung_gesendet ? "Ja" : "Ausstehend" }}</dd>
            </dl>
          </mat-card-content>
        </mat-card>
      }

      @if (error()) {
        <div class="error-message" role="alert">{{ error() }}</div>
      }
    </div>
  `,
  styles: [`
    .status-container { max-width: 600px; margin: 2rem auto; padding: 0 1rem; }
    .status-form { display: flex; gap: 1rem; align-items: flex-start; flex-wrap: wrap; }
    .code-field { flex: 1; min-width: 300px; }
    .status-card { margin-top: 2rem; }
    .status-card dt { font-weight: bold; margin-top: 0.5rem; }
    .status-card dd { margin-left: 0; }
    .error-message { color: #d32f2f; margin-top: 1rem; padding: 1rem; background: #ffebee; border-radius: 4px; }
    .status-badge[data-status="eingegangen"] { color: #1565c0; }
    .status-badge[data-status="in_bearbeitung"] { color: #e65100; }
    .status-badge[data-status="abgeschlossen"] { color: #2e7d32; }
  `],
})
export class StatusCheckComponent {
  accessCode = "";
  loading = signal(false);
  statusData = signal<any>(null);
  error = signal<string | null>(null);

  constructor(private apiService: ApiService) {}

  checkStatus(): void {
    this.loading.set(true);
    this.error.set(null);
    this.statusData.set(null);

    this.apiService.checkStatus(this.accessCode).subscribe({
      next: (data) => {
        this.statusData.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error ?? "Meldung nicht gefunden oder ungueltiger Code");
        this.loading.set(false);
      },
    });
  }

  translateStatus(status: string): string {
    const statusMap: Record<string, string> = {
      eingegangen: "Eingegangen",
      eingangsbestaetigung: "Eingangsbestaetigung versendet",
      in_pruefung: "In Pruefung",
      in_bearbeitung: "In Bearbeitung",
      rueckmeldung: "Rueckmeldung erteilt",
      abgeschlossen: "Abgeschlossen",
      abgelehnt: "Nicht im Anwendungsbereich",
    };
    return statusMap[status] ?? status;
  }
}
