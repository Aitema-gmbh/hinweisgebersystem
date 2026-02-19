import { Routes } from "@angular/router";
import { authGuard } from "./core/guards/auth.guard";
import { roleGuard } from "./core/guards/role.guard";

export const routes: Routes = [
  { path: "", redirectTo: "melden", pathMatch: "full" },
  {
    path: "melden",
    loadComponent: () =>
      import("./features/submission/components/submission-form/submission-form.component").then(
        (m) => m.SubmissionFormComponent
      ),
    title: "Hinweis melden | aitema|Hinweis",
  },
  {
    path: "status",
    loadComponent: () =>
      import("./features/submission/components/status-check/status-check.component").then(
        (m) => m.StatusCheckComponent
      ),
    title: "Status pruefen | aitema|Hinweis",
  },
  {
    path: "login",
    loadComponent: () =>
      import("./features/auth/components/login/login.component").then(
        (m) => m.LoginComponent
      ),
    title: "Anmelden | aitema|Hinweis",
  },
  {
    path: "dashboard",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/dashboard/components/dashboard/dashboard.component").then(
        (m) => m.DashboardComponent
      ),
    title: "Dashboard | aitema|Hinweis",
  },
  {
    path: "meldungen",
    canActivate: [authGuard, roleGuard],
    data: { roles: ["admin", "ombudsperson", "fallbearbeiter", "auditor"] },
    loadComponent: () =>
      import("./features/case-management/components/submissions-list/submissions-list.component").then(
        (m) => m.SubmissionsListComponent
      ),
    title: "Meldungen | aitema|Hinweis",
  },
  {
    path: "meldungen/:id",
    canActivate: [authGuard, roleGuard],
    data: { roles: ["admin", "ombudsperson", "fallbearbeiter", "auditor"] },
    loadComponent: () =>
      import("./features/case-management/components/submission-detail/submission-detail.component").then(
        (m) => m.SubmissionDetailComponent
      ),
    title: "Meldung Details | aitema|Hinweis",
  },
  {
    path: "faelle",
    canActivate: [authGuard, roleGuard],
    data: { roles: ["admin", "ombudsperson", "fallbearbeiter", "auditor"] },
    loadComponent: () =>
      import("./features/case-management/components/cases-list/cases-list.component").then(
        (m) => m.CasesListComponent
      ),
    title: "Faelle | aitema|Hinweis",
  },
  {
    path: "faelle/:id",
    canActivate: [authGuard, roleGuard],
    data: { roles: ["admin", "ombudsperson", "fallbearbeiter"] },
    loadComponent: () =>
      import("./features/case-management/components/case-detail/case-detail.component").then(
        (m) => m.CaseDetailComponent
      ),
    title: "Fall Details | aitema|Hinweis",
  },
  {
    path: "admin",
    canActivate: [authGuard, roleGuard],
    data: { roles: ["admin"] },
    children: [
      { path: "", redirectTo: "uebersicht", pathMatch: "full" },
      {
        path: "uebersicht",
        loadComponent: () =>
          import("./features/admin/components/admin-dashboard/admin-dashboard.component").then(
            (m) => m.AdminDashboardComponent
          ),
        title: "Administration | aitema|Hinweis",
      },
      {
        path: "benutzer",
        loadComponent: () =>
          import("./features/admin/components/user-management/user-management.component").then(
            (m) => m.UserManagementComponent
          ),
        title: "Benutzerverwaltung | aitema|Hinweis",
      },
      {
        path: "audit",
        loadComponent: () =>
          import("./features/admin/components/audit-log/audit-log.component").then(
            (m) => m.AuditLogComponent
          ),
        title: "Audit-Log | aitema|Hinweis",
      },
    ],
  },
  {
    path: "**",
    loadComponent: () =>
      import("./shared/components/not-found/not-found.component").then(
        (m) => m.NotFoundComponent
      ),
    title: "Seite nicht gefunden | aitema|Hinweis",
  },
];
