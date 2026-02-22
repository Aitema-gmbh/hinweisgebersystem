import { Component, ChangeDetectionStrategy } from '@angular/core';
import { HeroSectionComponent } from '../../../shared/components/hero-section/hero-section.component';
import { ExplainerComponent } from '../../../shared/components/explainer/explainer.component';
import { SubmissionFormComponent } from '../../submission/components/submission-form/submission-form.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    HeroSectionComponent,
    ExplainerComponent,
    SubmissionFormComponent
  ],
  template: `
    <app-hero-section />
    <app-explainer />
    <hw-submission-form />
  `,
  styles: [`
    :host {
      display: block;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent {}
