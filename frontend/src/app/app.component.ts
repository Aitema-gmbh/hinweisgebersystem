import { Component, ChangeDetectionStrategy, inject, HostBinding } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { KeycloakAuthService } from './core/services/keycloak-auth.service';
import { LanguageSwitcherComponent } from './shared/components/language-switcher/language-switcher.component';
import { I18nService } from './services/i18n.service';

@Component({
  selector: 'hw-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    LanguageSwitcherComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  // Inject the authentication service to use its signals in the template
  public authService = inject(KeycloakAuthService);
  public i18n = inject(I18nService);

  // Add a class to the host element for dark mode detection in styles
  @HostBinding('class.dark-theme')
  get isDarkMode() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }
}
