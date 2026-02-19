/**
 * aitema|Hinweis - Submission Form Component
 * Formular zur Einreichung von Hinweismeldungen (anonym + nicht-anonym).
 * Barrierefreiheit nach WCAG 2.1 AA.
 */
import { Component, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MatStepperModule } from "@angular/material/stepper";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { ApiService, SubmissionCreate } from "../../../../core/services/api.service";
import { A11yService } from "../../../../core/services/a11y.service";

interface Kategorie {
  value: string;
  label: string;
  description: string;
}

@Component({
  selector: "hw-submission-form",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="submission-container" role="main" aria-label="Hinweis einreichen">
      <h1>Hinweis einreichen</h1>
      <p class="subtitle">
        Sie koennen Ihren Hinweis anonym oder mit Kontaktdaten einreichen.
        Ihre Identitaet wird gemaess HinSchG geschuetzt.
      </p>

      @if (submitted()) {
        <div class="success-card" role="alert" aria-live="assertive">
          <h2>Meldung erfolgreich eingereicht</h2>
          <p>Referenznummer: <strong>{{ referenceCode() }}</strong></p>
          <p>Zugangscode: <strong>{{ accessCode() }}</strong></p>
          <p class="warning">
            Bitte bewahren Sie Ihren Zugangscode sicher auf.
            Sie benoetigen ihn, um den Status Ihrer Meldung zu pruefen.
          </p>
          <p>Sie erhalten eine Eingangsbestaetigung bis: {{ eingangsbestaetigung() }}</p>
        </div>
      } @else {
        <mat-stepper [linear]="true" #stepper aria-label="Meldungsformular in Schritten">
          <!-- Schritt 1: Meldungsart -->
          <mat-step [stepControl]="meldungsartForm">
            <ng-template matStepLabel>Meldungsart</ng-template>
            <form [formGroup]="meldungsartForm">
              <mat-checkbox formControlName="is_anonymous" aria-label="Anonym melden">
                Ich moechte anonym melden
              </mat-checkbox>

              @if (!meldungsartForm.get("is_anonymous")?.value) {
                <mat-form-field appearance="outline">
                  <mat-label>Name (optional)</mat-label>
                  <input matInput formControlName="melder_name" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>E-Mail (optional)</mat-label>
                  <input matInput type="email" formControlName="melder_email" />
                </mat-form-field>
              }

              <div class="step-actions">
                <button mat-raised-button color="primary" matStepperNext
                        [disabled]="meldungsartForm.invalid">
                  Weiter
                </button>
              </div>
            </form>
          </mat-step>

          <!-- Schritt 2: Meldungsinhalt -->
          <mat-step [stepControl]="inhaltForm">
            <ng-template matStepLabel>Meldungsinhalt</ng-template>
            <form [formGroup]="inhaltForm">
              <mat-form-field appearance="outline">
                <mat-label>Titel der Meldung</mat-label>
                <input matInput formControlName="titel"
                       aria-describedby="titel-hint"
                       required />
                <mat-hint id="titel-hint">Kurze Zusammenfassung (min. 10 Zeichen)</mat-hint>
                <mat-error>Titel muss mindestens 10 Zeichen lang sein</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Kategorie</mat-label>
                <mat-select formControlName="kategorie" required>
                  @for (kat of kategorien; track kat.value) {
                    <mat-option [value]="kat.value">{{ kat.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Detaillierte Beschreibung</mat-label>
                <textarea matInput formControlName="beschreibung"
                          rows="8"
                          aria-describedby="beschreibung-hint"
                          required></textarea>
                <mat-hint id="beschreibung-hint">
                  Beschreiben Sie den Sachverhalt so detailliert wie moeglich (min. 50 Zeichen)
                </mat-hint>
                <mat-error>Beschreibung muss mindestens 50 Zeichen lang sein</mat-error>
              </mat-form-field>

              <div class="step-actions">
                <button mat-button matStepperPrevious>Zurueck</button>
                <button mat-raised-button color="primary" matStepperNext
                        [disabled]="inhaltForm.invalid">
                  Weiter
                </button>
              </div>
            </form>
          </mat-step>

          <!-- Schritt 3: Zusatzangaben -->
          <mat-step [stepControl]="zusatzForm">
            <ng-template matStepLabel>Zusatzangaben</ng-template>
            <form [formGroup]="zusatzForm">
              <mat-form-field appearance="outline">
                <mat-label>Betroffene Abteilung (optional)</mat-label>
                <input matInput formControlName="betroffene_abteilung" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Zeitraum von (optional)</mat-label>
                <input matInput type="date" formControlName="zeitraum_von" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Zeitraum bis (optional)</mat-label>
                <input matInput type="date" formControlName="zeitraum_bis" />
              </mat-form-field>

              <div class="step-actions">
                <button mat-button matStepperPrevious>Zurueck</button>
                <button mat-raised-button color="primary" matStepperNext>
                  Weiter zur Uebersicht
                </button>
              </div>
            </form>
          </mat-step>

          <!-- Schritt 4: Uebersicht & Absenden -->
          <mat-step>
            <ng-template matStepLabel>Absenden</ng-template>
            <h3>Zusammenfassung</h3>
            <dl class="summary" role="list" aria-label="Zusammenfassung Ihrer Meldung">
              <dt>Titel</dt>
              <dd>{{ inhaltForm.get("titel")?.value }}</dd>
              <dt>Kategorie</dt>
              <dd>{{ getKategorieLabel(inhaltForm.get("kategorie")?.value) }}</dd>
              <dt>Anonym</dt>
              <dd>{{ meldungsartForm.get("is_anonymous")?.value ? "Ja" : "Nein" }}</dd>
            </dl>

            <mat-checkbox [(ngModel)]="datenschutzAkzeptiert" [ngModelOptions]="{standalone: true}">
              Ich habe die Datenschutzhinweise gelesen und akzeptiere die Verarbeitung meiner Daten
              gemaess HinSchG.
            </mat-checkbox>

            <div class="step-actions">
              <button mat-button matStepperPrevious>Zurueck</button>
              <button mat-raised-button color="primary"
                      [disabled]="!datenschutzAkzeptiert || submitting()"
                      (click)="submit()">
                @if (submitting()) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  Meldung absenden
                }
              </button>
            </div>
          </mat-step>
        </mat-stepper>
      }
    </div>
  `,
  styles: [`
    .submission-container {
      max-width: 800px;
      margin: 2rem auto;
      padding: 0 1rem;
    }
    .subtitle { color: #666; margin-bottom: 2rem; }
    .success-card {
      background: #e8f5e9;
      border: 2px solid #4caf50;
      border-radius: 8px;
      padding: 2rem;
      margin-top: 1rem;
    }
    .warning { color: #e65100; font-weight: bold; }
    .step-actions {
      margin-top: 1.5rem;
      display: flex;
      gap: 1rem;
    }
    mat-form-field { display: block; margin-bottom: 1rem; }
    .summary dt { font-weight: bold; margin-top: 0.5rem; }
    .summary dd { margin-left: 0; margin-bottom: 0.5rem; }
  `],
})
export class SubmissionFormComponent implements OnInit {
  meldungsartForm!: FormGroup;
  inhaltForm!: FormGroup;
  zusatzForm!: FormGroup;

  datenschutzAkzeptiert = false;
  submitting = signal(false);
  submitted = signal(false);
  referenceCode = signal("");
  accessCode = signal("");
  eingangsbestaetigung = signal("");

  kategorien: Kategorie[] = [
    { value: "korruption", label: "Korruption / Bestechung", description: "" },
    { value: "betrug", label: "Betrug", description: "" },
    { value: "geldwaesche", label: "Geldwaesche", description: "" },
    { value: "datenschutz", label: "Datenschutzverstoesse", description: "" },
    { value: "umweltverstoss", label: "Umweltverstoesse", description: "" },
    { value: "arbeitssicherheit", label: "Arbeitssicherheit", description: "" },
    { value: "diskriminierung", label: "Diskriminierung", description: "" },
    { value: "verbraucherschutz", label: "Verbraucherschutz", description: "" },
    { value: "vergaberecht", label: "Vergaberecht", description: "" },
    { value: "wettbewerbsrecht", label: "Wettbewerbsrecht", description: "" },
    { value: "steuerhinterziehung", label: "Steuerhinterziehung", description: "" },
    { value: "produktsicherheit", label: "Produktsicherheit", description: "" },
    { value: "finanzdienstleistungen", label: "Finanzdienstleistungen", description: "" },
    { value: "sonstiges", label: "Sonstiges", description: "" },
  ];

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private a11yService: A11yService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.a11yService.setPageTitle("Hinweis melden");

    this.meldungsartForm = this.fb.group({
      is_anonymous: [true],
      melder_name: [""],
      melder_email: [""],
    });

    this.inhaltForm = this.fb.group({
      titel: ["", [Validators.required, Validators.minLength(10)]],
      kategorie: ["", Validators.required],
      beschreibung: ["", [Validators.required, Validators.minLength(50)]],
    });

    this.zusatzForm = this.fb.group({
      betroffene_abteilung: [""],
      zeitraum_von: [""],
      zeitraum_bis: [""],
    });
  }

  getKategorieLabel(value: string): string {
    return this.kategorien.find((k) => k.value === value)?.label ?? value;
  }

  submit(): void {
    if (this.submitting()) return;
    this.submitting.set(true);

    const payload: SubmissionCreate = {
      ...this.meldungsartForm.value,
      ...this.inhaltForm.value,
      ...this.zusatzForm.value,
    };

    this.apiService.createSubmission(payload).subscribe({
      next: (response) => {
        this.submitted.set(true);
        this.referenceCode.set(response.reference_code);
        this.accessCode.set(response.access_code);
        this.eingangsbestaetigung.set(
          new Date(response.eingangsbestaetigung_bis).toLocaleDateString("de-DE")
        );
        this.a11yService.announceToScreenReader(
          "Meldung erfolgreich eingereicht. Referenznummer: " + response.reference_code,
          "assertive"
        );
        this.submitting.set(false);
      },
      error: (error) => {
        this.submitting.set(false);
        const message = error.error?.error ?? "Fehler beim Einreichen der Meldung";
        this.snackBar.open(message, "Schliessen", { duration: 5000 });
        this.a11yService.announceToScreenReader("Fehler: " + message, "assertive");
      },
    });
  }
}
