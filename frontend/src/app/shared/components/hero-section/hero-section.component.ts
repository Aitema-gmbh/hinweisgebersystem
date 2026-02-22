import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-hero-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="hero-content">
      <div class="text-content">
        <p class="product-label">aitema | Hinweisgeberschutzsystem</p>
        <h1 class="title">Sicher melden.<br>Geschützt nach HinSchG.</h1>
        <p class="subtitle">Das offene Hinweisgeberschutzsystem für Unternehmen und Behörden.</p>
        <div class="feature-chips">
          <div class="chip">
            <span>100% Anonym</span>
          </div>
          <div class="chip">
            <span>Open Source</span>
          </div>
          <div class="chip">
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
        grid-template-columns: 1.2fr 0.8fr;
      }
    }

    .text-content {
      animation: fadeInUp 1s ease-out;
    }
    
    .product-label {
      font-size: 0.75rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 1rem;
    }

    .title {
      font-size: 2.8rem;
      font-weight: 800;
      line-height: 1.15;
      color: white;
      letter-spacing: -0.03em;
      text-align: left;
      margin-bottom: 1rem;
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
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      padding: 0.3rem 0.75rem;
      font-size: 0.8rem;
      color: rgba(255, 255, 255, 0.8);
      font-weight: 500;
    }

    .animation-container {
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .hero-svg {
      width: 100%;
      max-width: 480px;
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

