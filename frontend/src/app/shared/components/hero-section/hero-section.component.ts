import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-hero-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="hero-content">
      <div class="text-content">
        <h1 class="title">Sicher melden.<br>Geschützt nach HinSchG.</h1>
        <p class="subtitle">Das offene Hinweisgeberschutzsystem für Unternehmen und Behörden.</p>
        <div class="feature-chips">
          <div class="chip">
            <img src="assets/icons/anonymous.svg" alt="Anonymous Icon"/>
            <span>100% Anonym</span>
          </div>
          <div class="chip">
            <img src="assets/icons/open-source.svg" alt="Open Source Icon"/>
            <span>Open Source</span>
          </div>
          <div class="chip">
            <img src="assets/icons/legal.svg" alt="Legal Icon"/>
            <span>HinSchG-konform</span>
          </div>
        </div>
      </div>
      <div class="animation-container">
        <img src="assets/hero-animation.svg" alt="Animation des Meldeprozesses" class="hero-svg">
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      background: var(--aitema-navy, #0f172a);
      color: #fff;
      padding: 4rem 2rem;
      overflow: hidden;
      border-bottom: 1px solid var(--aitema-blue, #1e3a5f);
    }

    .hero-content {
      display: grid;
      grid-template-columns: 1fr;
      align-items: center;
      gap: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    @media (min-width: 992px) {
      .hero-content {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      }
    }

    .text-content {
      animation: fadeInUp 1s ease-out;
    }

    .title {
      font-size: 2.5rem;
      font-weight: 800;
      color: #fff;
      margin-bottom: 1rem;
      line-height: 1.2;
    }

    .subtitle {
      font-size: 1.25rem;
      color: #cbd5e1; /* slate-300 */
      margin-bottom: 2rem;
    }

    .feature-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: transparent;
      padding: 0.375rem 0.75rem;
      border-radius: 3px;
      font-weight: 400;
      font-size: 0.8rem;
      border: 1px solid #334155;
      color: #94a3b8;
    }

    .chip img {
      width: 20px;
      height: 20px;
      filter: invert(1);
    }

    .animation-container {
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .hero-svg {
      width: 100%;
      max-width: 600px;
      height: auto;
    }
    
    /* Using inline styles for host-level animations to avoid global scope bleed */
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes float {
      0% { transform: translateY(0px); }
      50% { transform: translateY(-15px); }
      100% { transform: translateY(0px); }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroSectionComponent {}

