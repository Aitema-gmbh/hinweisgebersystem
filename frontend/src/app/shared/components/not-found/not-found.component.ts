import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";

@Component({
  selector: "hw-not-found",
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="not-found" role="main" aria-label="Seite nicht gefunden">
      <h1>404 - Seite nicht gefunden</h1>
      <p>Die angeforderte Seite existiert nicht.</p>
      <a routerLink="/">Zur Startseite</a>
    </div>
  `,
  styles: [`
    .not-found { text-align: center; margin-top: 4rem; }
    .not-found h1 { font-size: 3rem; color: #666; }
  `],
})
export class NotFoundComponent {}
