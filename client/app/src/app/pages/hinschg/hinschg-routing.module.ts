/**
 * HinSchG Feature Routing
 */
import { Routes } from '@angular/router';

export const HINSCHG_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/dashboard.component').then(
        (m) => m.HinschgDashboardComponent
      ),
  },
  {
    path: 'cases',
    loadComponent: () =>
      import('./cases/cases-list.component').then(
        (m) => m.HinschgCasesListComponent
      ),
  },
  {
    path: 'cases/:id',
    loadComponent: () =>
      import('./cases/case-detail.component').then(
        (m) => m.HinschgCaseDetailComponent
      ),
  },
  {
    path: 'fristen',
    loadComponent: () =>
      import('./fristen/fristen-overview.component').then(
        (m) => m.HinschgFristenComponent
      ),
  },
  {
    path: 'reports',
    loadComponent: () =>
      import('./reports/reports.component').then(
        (m) => m.HinschgReportsComponent
      ),
  },
];
