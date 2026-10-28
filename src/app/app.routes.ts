import { Routes } from '@angular/router';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { authGuard, guestGuard, roleGuard } from './core/guards';

// Every feature is lazy-loaded
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    data: { breadcrumb: 'nav.login' },
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    data: { breadcrumb: 'nav.register' },
    loadComponent: () =>
      import('./features/auth/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    data: { breadcrumb: 'nav.profile' },
    loadComponent: () =>
      import('./features/profile/profile.component').then((m) => m.ProfileComponent),
  },
  {
    path: 'courses',
    data: { breadcrumb: 'nav.courses' },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/courses/course-list.component').then((m) => m.CourseListComponent),
      },
      {
        path: 'new',
        canActivate: [roleGuard('ADMIN', 'TEACHER')],
        data: { breadcrumb: 'courses.new' },
        loadComponent: () =>
          import('./features/courses/course-form.component').then((m) => m.CourseFormComponent),
      },
      {
        path: ':id/edit',
        canActivate: [roleGuard('ADMIN', 'TEACHER')],
        data: { breadcrumb: 'courses.edit' },
        loadComponent: () =>
          import('./features/courses/course-form.component').then((m) => m.CourseFormComponent),
      },
      {
        path: ':id',
        data: { breadcrumb: 'courses.detail' },
        loadComponent: () =>
          import('./features/courses/course-detail.component').then((m) => m.CourseDetailComponent),
      },
    ],
  },
  {
    path: 'registrations',
    canActivate: [roleGuard('STUDENT')],
    data: { breadcrumb: 'nav.registrations' },
    loadComponent: () =>
      import('./features/registrations/registrations.component').then((m) => m.RegistrationsComponent),
  },
  {
    path: 'statistics',
    canActivate: [roleGuard('TEACHER', 'STUDENT')],
    // Chart.js is only loaded with this page
    providers: [provideCharts(withDefaultRegisterables())],
    data: { breadcrumb: 'nav.statistics' },
    loadComponent: () =>
      import('./features/statistics/statistics.component').then((m) => m.StatisticsComponent),
  },
  {
    path: 'super/organizations',
    canActivate: [roleGuard('SUPER_ADMIN')],
    data: { breadcrumb: 'nav.organizations' },
    loadComponent: () =>
      import('./features/super/organizations.component').then((m) => m.OrganizationsComponent),
  },
  {
    path: 'admin/users',
    canActivate: [roleGuard('ADMIN')],
    data: { breadcrumb: 'nav.users' },
    loadComponent: () =>
      import('./features/admin/users.component').then((m) => m.AdminUsersComponent),
  },
  { path: '**', redirectTo: '' },
];
