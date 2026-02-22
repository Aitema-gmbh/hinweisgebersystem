import { Component, signal, OnDestroy, ChangeDetectionStrategy, effect } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';

interface ExplainerStep {
  id: number;
  title: string;
  description: string;
}

@Component({
  selector: 'app-explainer',
  standalone: true,
  imports: [CommonModule, NgClass],
  template: `
    <div class="explainer-wrapper">
      <h2 class="section-title">Der Prozess in 4 einfachen Schritten</h2>
      <div class="explainer-content">
        <div class="visual-container">
          <!-- Step 1: Anonym melden -->
          <svg *ngIf="activeStep() === 1" @fadeInOut class="explainer-svg" viewBox="0 0 100 100">
             <g fill="none" stroke="var(--aitema-navy, #0f172a)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M50 30 C 40 30, 30 40, 30 50 C 30 60, 40 70, 50 70 C 60 70, 70 60, 70 50 C 70 40, 60 30, 50 30 Z" fill="var(--aitema-blue, #1e3a5f)"/>
                <path d="M50,5 a45,45 0 1,1 0,90 a45,45 0 1,1 0,-90" fill="var(--aitema-slate-light, #334155)"/>
                <rect x="30" y="45" width="40" height="10" rx="3" fill="var(--aitema-accent, #3b82f6)"/>
            </g>
          </svg>
          <!-- Step 2: Verschlüsselung -->
          <svg *ngIf="activeStep() === 2" @fadeInOut class="explainer-svg" viewBox="0 0 100 100">
            <g fill="none" stroke="var(--aitema-emerald, #059669)" stroke-width="4" stroke-linecap="round">
                <rect x="20" y="50" width="60" height="40" rx="5" />
                <path d="M35 50 V 35 a15 15 0 1 1 30 0 V 50" stroke-width="8"/>
                <path d="M10,20 L90,20 M15,35 L85,35 M10,50 L90,50" class="data-stream-explainer" />
            </g>
          </svg>
           <!-- Step 3: Fallbearbeitung -->
          <svg *ngIf="activeStep() === 3" @fadeInOut class="explainer-svg" viewBox="0 0 100 100">
             <g fill="none" stroke="var(--aitema-navy, #0f172a)" stroke-width="3">
                <path d="M10 85 V 15 h 60 l 10 10 v 60 z" fill="var(--aitema-accent, #3b82f6)" opacity="0.1"/>
                <path d="M70 15 v 10 h 10" />
                <path d="M25 40 h 40 M25 55 h 40 M25 70 h 25" stroke-width="4" stroke-linecap="round"/>
            </g>
          </svg>
          <!-- Step 4: Schutz-Garantie -->
          <svg *ngIf="activeStep() === 4" @fadeInOut class="explainer-svg" viewBox="0 0 100 100">
             <g fill="none" stroke="var(--aitema-navy, #0f172a)" stroke-width="3" stroke-linecap="round">
                <path d="M50 95 C 80 85, 90 65, 90 45 V 15 L 50 5 L 10 15 V 45 C 10 65, 20 85, 50 95 Z" fill="var(--aitema-emerald, #059669)" opacity="0.15"/>
                <circle cx="50" cy="45" r="10" />
                <path d="M50 55 a15 15 0 0 0 -15 15 h 30 a15 15 0 0 0 -15 -15 z" />
            </g>
          </svg>
        </div>
        <div class="steps-container">
          <ul>
            <li *ngFor="let step of steps" 
                (click)="setStep(step.id)"
                [ngClass]="{'active': step.id === activeStep()}">
              <h3>{{step.title}}</h3>
              <p>{{step.description}}</p>
              <div class="progress-bar">
                <div class="progress"></div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      padding: 4rem 2rem;
      background: #f8fafc; /* slate-50 */
    }
    .explainer-wrapper {
      max-width: 1000px;
      margin: auto;
    }
    .section-title {
      font-size: 2rem;
      font-weight: 700;
      text-align: center;
      margin-bottom: 3rem;
      color: var(--aitema-navy, #0f172a);
    }
    .explainer-content {
      display: grid;
      grid-template-columns: 1fr;
      gap: 2rem;
      align-items: center;
    }
    @media (min-width: 768px) {
      .explainer-content {
        grid-template-columns: 300px 1fr;
        gap: 4rem;
      }
    }
    .visual-container {
      width: 100%;
      max-width: 300px;
      margin: 0 auto;
      height: 300px;
      position: relative;
    }
    .explainer-svg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      animation: fadeIn 0.5s ease;
    }
    .steps-container ul {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .steps-container li {
      padding: 1.5rem;
      border-radius: 0.5rem;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      transition: background-color 0.3s ease;
      border: 1px solid #e2e8f0; /* slate-200 */
    }
    .steps-container li:hover {
      background-color: #fff;
    }
    .steps-container li.active {
      background-color: #fff;
      border-color: var(--aitema-accent, #3b82f6);
    }
    .steps-container h3 {
      margin: 0 0 0.5rem;
      font-size: 1.2rem;
      font-weight: 600;
      color: var(--aitema-navy, #0f172a);
    }
    .steps-container p {
      margin: 0;
      color: var(--aitema-slate-light, #334155);
    }
    .progress-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 4px;
      background-color: #e2e8f0;
    }
    .progress {
      height: 100%;
      width: 0%;
      background-color: var(--aitema-accent, #3b82f6);
    }
    .steps-container li.active .progress {
      width: 100%;
      transition: width 5s linear;
    }
    .data-stream-explainer {
      stroke-dasharray: 100;
      stroke-dashoffset: 100;
      animation: stroke-draw 2s ease-out forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
     @keyframes stroke-draw {
      to { stroke-dashoffset: 0; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExplainerComponent implements OnDestroy {
  steps: ExplainerStep[] = [
    { id: 1, title: 'Schritt 1: Anonym melden', description: 'Hinweis anonym oder mit Kontakt über das gesicherte Formular einreichen.' },
    { id: 2, title: 'Schritt 2: Verschlüsselung', description: 'Ihre Daten werden Ende-zu-Ende verschlüsselt und sicher übertragen.' },
    { id: 3, title: 'Schritt 3: Fallbearbeitung', description: 'Das zuständige Compliance-Team prüft Ihren Hinweis und ergreift Maßnahmen.' },
    { id: 4, title: 'Schritt 4: Schutz-Garantie', description: 'Sie genießen vollständigen Schutz nach dem Hinweisgeberschutzgesetz (HinSchG).' },
  ];

  activeStep = signal(1);
  private intervalId: any;

  constructor() {
    this.startAutoCycle();
    
    // Reset animation when step changes
    effect(() => {
      const step = this.activeStep();
      this.resetProgressAndRestartCycle();
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.intervalId);
  }

  startAutoCycle(): void {
    this.intervalId = setInterval(() => {
      this.activeStep.update(current => (current % this.steps.length) + 1);
    }, 5000);
  }
  
  resetProgressAndRestartCycle(): void {
    clearInterval(this.intervalId);
    this.startAutoCycle();
  }

  setStep(id: number): void {
    this.activeStep.set(id);
  }
}
