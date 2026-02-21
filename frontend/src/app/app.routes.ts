/**
 * aitema|Hinweis - App Routes
 * 
 * BUERGER-FLOWS (anonym, kein Guard):
 *   - /melden  -> SubmissionFormComponent
 *   - /status  -> StatusCheckComponent
 * 
 * STAFF-FLOWS (Keycloak SSO erforderlich):
 *   - /login      -> LoginComponent (mit Keycloak-Button)
 *   - /dashboard  -> staffAuthGuard (Keycloak)
 *   - /meldungen  -> staffAuthGuard + staffRoleGuard
 *   - /faelle     -> staffAuthGuard + staffRoleGuard
 *   - /admin      -> staffAuthGuard + staffRoleGuard (nur admin)
 */
import { Routes } from '@angular/router';
import { staffAuthGuard } from './core/guards/staff-auth.guard';
import { staffRoleGuard } from './core/guards/staff-role.guard';

export const routes: Routes = [
  // Root: Redirect zu Buerger-Flow
  { path: '', redirectTo: 'melden', pathMatch: 'full' },

  // ==========================================================
  // BUERGER-FLOWS - Anonym, kein Auth-Guard
  // ==========================================================
  {
    path: 'melden',
    loadComponent: () =>
      import('./features/submission/components/submission-form/submission-form.component').then(
        (m) => m.SubmissionFormComponent
      ),
    title: 'Hinweis melden | aitema|Hinweis',
  },
  {
    path: 'status',
    loadComponent: () =>
      import('./features/submission/components/status-check/status-check.component').then(
        (m) => m.StatusCheckComponent
      ),
    title: 'Status pruefen | aitema|Hinweis',
  },

  // ==========================================================
  // STAFF LOGIN - Keycloak SSO + Legacy-Fallback
  // ==========================================================
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/components/login/login.component').then(
        (m) => m.LoginComponent
      ),
    title: 'Anmelden | aitema|Hinweis',
  },

  // ==========================================================
  // STAFF-BEREICH - Alle Routen durch Keycloak geschuetzt
  // ==========================================================
  {
    path: 'dashboard',
    canActivate: [staffAuthGuard],
    loadComponent: () =>
      import('./features/dashboard/components/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent
      ),
    title: 'Dashboard | aitema|Hinweis',
  },
  {
    path: 'meldungen',
    canActivate: [staffAuthGuard, staffRoleGuard],
    data: { roles: ['hinweis-admin', 'hinweis-ombudsperson', 'hinweis-fallbearbeiter', 'hinweis-auditor'] },
    loadComponent: () =>
      import('./features/case-management/components/submissions-list/submissions-list.component').then(
        (m) => m.SubmissionsListComponent
      ),
    title: 'Meldungen | aitema|Hinweis',
  },
  {
    path: 'meldungen/:id',
    canActivate: [staffAuthGuard, staffRoleGuard],
    data: { roles: ['hinweis-admin', 'hinweis-ombudsperson', 'hinweis-fallbearbeiter', 'hinweis-auditor'] },
    loadComponent: () =>
      import('./features/case-management/components/submission-detail/submission-detail.component').then(
        (m) => m.SubmissionDetailComponent
      ),
    title: 'Meldung Details | aitema|Hinweis',
  },
  {
    path: 'faelle',
    canActivate: [staffAuthGuard, staffRoleGuard],
    data: { roles: ['hinweis-admin', 'hinweis-ombudsperson', 'hinweis-fallbearbeiter', 'hinweis-auditor'] },
    loadComponent: () =>
      import('./features/case-management/components/cases-list/cases-list.component').then(
        (m) => m.CasesListComponent
      ),
    title: 'Faelle | aitema|Hinweis',
  },
  {
    path: 'faelle/:id',
    canActivate: [staffAuthGuard, staffRoleGuard],
    data: { roles: ['hinweis-admin', 'hinweis-ombudsperson', 'hinweis-fallbearbeiter'] },
    loadComponent: () =>
      import('./features/case-management/components/case-detail/case-detail.component').then(
        (m) => m.CaseDetailComponent
      ),
    title: 'Fall Details | aitema|Hinweis',
  },
  {
    path: 'admin',
    canActivate: [staffAuthGuard, staffRoleGuard],
    data: { roles: ['hinweis-admin'] },
    children: [
      { path: '', redirectTo: 'uebersicht', pathMatch: 'full' },
      {
        path: 'uebersicht',
        loadComponent: () =>
          import('./features/admin/components/admin-dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent
          ),
        title: 'Administration | aitema|Hinweis',
      },
      {
        path: 'benutzer',
        loadComponent: () =>
          import('./features/admin/components/user-management/user-management.component').then(
            (m) => m.UserManagementComponent
          ),
        title: 'Benutzerverwaltung | aitema|Hinweis',
      },
      {
        path: 'audit',
        loadComponent: () =>
          import('./features/admin/components/audit-log/audit-log.component').then(
            (m) => m.AuditLogComponent
          ),
        title: 'Audit-Log | aitema|Hinweis',
      },
      {
        path: 'mandanten',
        loadComponent: () =>
          import('./features/admin/components/tenant-management/tenant-management.component').then(
            (m) => m.TenantManagementComponent
          ),
        title: 'Mandantenverwaltung | aitema|Hinweis',
      },
    ],
  },

  // 404
  {
    path: '**',
    loadComponent: () =>
      import('./shared/components/not-found/not-found.component').then(
        (m) => m.NotFoundComponent
      ),
    title: 'Seite nicht gefunden | aitema|Hinweis',
  },
];
