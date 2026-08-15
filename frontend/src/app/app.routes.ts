import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { ShellComponent } from './core/layout/shell/shell.component';
import { LoginComponent } from './features/login/login.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'presupuestos',
        loadComponent: () =>
          import('./features/presupuestos/list/presupuestos-list.component').then(
            (m) => m.PresupuestosListComponent
          ),
      },
      {
        path: 'presupuestos/crear',
        loadComponent: () =>
          import('./features/presupuestos/create/presupuesto-create.component').then(
            (m) => m.PresupuestoCreateComponent
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
